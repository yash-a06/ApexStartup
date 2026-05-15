import type {
  AnalysisContext,
  GovernorKey,
  ProblemRunner,
  RunnerTestSpec,
  SimulatedRunResult,
} from "./types";

// Strip /* ... */ and // ... comments and "..." 'literals' to '' for analysis
function stripCommentsAndStrings(src: string): string {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === "/" && next === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      out += ch;
      i++;
      while (i < n && src[i] !== quote) {
        if (src[i] === "\\" && i + 1 < n) {
          i += 2;
        } else {
          i++;
        }
      }
      out += quote;
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function checkBalanced(src: string): string[] {
  const errors: string[] = [];
  const pairs: Record<string, string> = { "{": "}", "(": ")", "[": "]" };
  const stack: string[] = [];
  for (const ch of src) {
    if (ch in pairs) stack.push(pairs[ch]!);
    else if (ch === "}" || ch === ")" || ch === "]") {
      const top = stack.pop();
      if (top !== ch) {
        errors.push(`Unexpected '${ch}'`);
        return errors;
      }
    }
  }
  if (stack.length > 0) {
    errors.push(`Missing closing ${stack.join("")}`);
  }
  return errors;
}

function makeContext(source: string): AnalysisContext {
  const stripped = stripCommentsAndStrings(source);
  const strippedLower = stripped.toLowerCase();
  const compileErrors = checkBalanced(stripped);
  const syntaxOk = compileErrors.length === 0;

  const debugLines: string[] = [];
  const limits = {
    soqlQueries: 0,
    soqlQueryRows: 0,
    dmlStatements: 0,
    dmlRows: 0,
    cpuTimeMs: 0,
    heapSizeBytes: 0,
  };

  // Pre-populate plausible limits from static patterns (so the UI shows real numbers)
  const soqlMatches = stripped.match(/\[\s*select\s/gi);
  if (soqlMatches) limits.soqlQueries = soqlMatches.length;

  const dmlMatches = stripped.match(
    /\b(insert|update|upsert|delete|undelete)\s+/gi,
  );
  if (dmlMatches) limits.dmlStatements = dmlMatches.length;

  // Estimate query rows from .size() / LIMIT clause
  const limitMatches = stripped.match(/\blimit\s+(\d+)/gi);
  if (limitMatches) {
    limits.soqlQueryRows = limitMatches
      .map((m) => parseInt(m.replace(/\D/g, ""), 10))
      .reduce((a, b) => a + b, 0);
  } else if (limits.soqlQueries > 0) {
    limits.soqlQueryRows = limits.soqlQueries * 10;
  }

  // CPU time and heap rough estimates
  limits.cpuTimeMs = Math.min(
    9999,
    50 + source.length * 0.05 + limits.soqlQueries * 12,
  );
  limits.heapSizeBytes = Math.min(
    6_000_000,
    1024 + source.length * 8 + limits.soqlQueryRows * 64,
  );

  // DML rows = number of insert/update statements that touch a list * estimated size
  if (limits.dmlStatements > 0) {
    const listInsert = stripped.match(/\b(insert|update|upsert)\s+\w+s\b/gi);
    limits.dmlRows = listInsert
      ? listInsert.length * 50 + (limits.dmlStatements - listInsert.length)
      : limits.dmlStatements;
  }

  // Capture System.debug(...) text (best-effort) — pull the literal arg if present
  const debugRegex = /System\s*\.\s*debug\s*\(([^)]*)\)/gi;
  let dm: RegExpExecArray | null;
  while ((dm = debugRegex.exec(source)) !== null) {
    const arg = dm[1]?.trim() ?? "";
    const literal = arg.match(/^['"](.*)['"]$/);
    debugLines.push(`DEBUG | ${literal ? literal[1] : arg}`);
  }
  if (debugLines.length === 0) {
    debugLines.push(`Execute Anonymous compiled in ${Math.round(limits.cpuTimeMs)}ms`);
    debugLines.push(`SOQL queries used: ${limits.soqlQueries}/100`);
    debugLines.push(`DML statements used: ${limits.dmlStatements}/150`);
  }

  const ctx = {
    source,
    stripped,
    strippedLower,
    syntaxOk,
    compileErrors,
    debug: (line: string) => {
      debugLines.push(line);
    },
    bump: (key: GovernorKey, amount = 1) => {
      limits[key] += amount;
    },
    _debugLines: debugLines,
    _limits: limits,
  };
  return ctx as AnalysisContext & { _debugLines: string[]; _limits: typeof limits };
}

const SF_LIMITS = {
  soqlQueries: 100,
  soqlQueryRows: 50000,
  dmlStatements: 150,
  dmlRows: 10000,
  cpuTimeMs: 10000,
  heapSizeBytes: 6_000_000,
};

export function runProblem(
  runner: ProblemRunner,
  source: string,
  options: { onlyVisible?: boolean } = {},
): SimulatedRunResult {
  const ctx = makeContext(source) as AnalysisContext & {
    _debugLines: string[];
    _limits: SimulatedRunResult["governorLimits"];
  };

  const compileError = !ctx.syntaxOk ? ctx.compileErrors.join("; ") : null;

  const tests: RunnerTestSpec[] = options.onlyVisible
    ? runner.tests.filter((t) => !t.hidden)
    : runner.tests;

  let runtimeError: string | null = null;

  // Detect governor limit overshoots before running tests
  let governorLimitExceeded = false;
  for (const [key, limit] of Object.entries(SF_LIMITS) as [
    keyof typeof SF_LIMITS,
    number,
  ][]) {
    if (ctx._limits[key] > limit) {
      governorLimitExceeded = true;
      runtimeError = `System.LimitException: Too many ${key.replace(
        /([A-Z])/g,
        " $1",
      )} (used ${ctx._limits[key]} of ${limit} allowed)`;
      ctx._debugLines.push(`FATAL_ERROR | ${runtimeError}`);
      break;
    }
  }

  const testResults = tests.map((t) => {
    const start = Date.now();
    let outcome;
    if (compileError) {
      outcome = { passed: false, message: "Did not compile" };
    } else if (governorLimitExceeded) {
      outcome = { passed: false, message: "Governor limit exceeded" };
    } else {
      try {
        outcome = t.check(ctx);
      } catch (err) {
        runtimeError ??= err instanceof Error ? err.message : String(err);
        outcome = { passed: false, message: "Runtime error in test" };
      }
    }
    // simulated execution time per test
    const elapsed = Math.max(1, Date.now() - start + Math.floor(Math.random() * 8));
    return {
      name: t.name,
      passed: outcome.passed,
      message: outcome.message,
      hidden: t.hidden,
      executionTimeMs: elapsed,
    };
  });

  return {
    testResults,
    debugLog: ctx._debugLines,
    compileError,
    runtimeError,
    governorLimits: {
      soqlQueries: Math.round(ctx._limits.soqlQueries),
      soqlQueryRows: Math.round(ctx._limits.soqlQueryRows),
      dmlStatements: Math.round(ctx._limits.dmlStatements),
      dmlRows: Math.round(ctx._limits.dmlRows),
      cpuTimeMs: Math.round(ctx._limits.cpuTimeMs),
      heapSizeBytes: Math.round(ctx._limits.heapSizeBytes),
    },
  };
}

export function deriveStatus(result: SimulatedRunResult): {
  status:
    | "accepted"
    | "wrong_answer"
    | "runtime_error"
    | "compile_error"
    | "governor_limit_exceeded"
    | "time_limit_exceeded";
  passedCount: number;
  totalCount: number;
} {
  const passedCount = result.testResults.filter((r) => r.passed).length;
  const totalCount = result.testResults.length;
  if (result.compileError) {
    return { status: "compile_error", passedCount, totalCount };
  }
  if (
    result.runtimeError &&
    result.runtimeError.toLowerCase().includes("limit")
  ) {
    return { status: "governor_limit_exceeded", passedCount, totalCount };
  }
  if (result.runtimeError) {
    return { status: "runtime_error", passedCount, totalCount };
  }
  if (result.governorLimits.cpuTimeMs > SF_LIMITS.cpuTimeMs) {
    return { status: "time_limit_exceeded", passedCount, totalCount };
  }
  if (passedCount === totalCount && totalCount > 0) {
    return { status: "accepted", passedCount, totalCount };
  }
  return { status: "wrong_answer", passedCount, totalCount };
}
