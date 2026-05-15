export interface RunnerTestSpec {
  name: string;
  description: string;
  hidden: boolean;
  // The check function - returns pass/fail with a message
  check: (ctx: AnalysisContext) => RunnerTestOutcome;
}

export interface RunnerTestOutcome {
  passed: boolean;
  message: string;
}

export interface ProblemRunner {
  slug: string;
  // Static analysis-based test specs
  tests: RunnerTestSpec[];
}

export interface AnalysisContext {
  /** Raw Apex source the user submitted */
  source: string;
  /** Source with comments and string literals stripped (for keyword/structure checks) */
  stripped: string;
  /** Lowercase version of stripped, useful for case-insensitive checks */
  strippedLower: string;
  /** True if the code looks syntactically reasonable (balanced braces / parens) */
  syntaxOk: boolean;
  /** Heuristic compile errors (unbalanced braces, missing class header, etc.) */
  compileErrors: string[];
  /** Append a debug log line that will be exposed back to the UI */
  debug: (line: string) => void;
  /** Increment a simulated governor counter */
  bump: (key: GovernorKey, amount?: number) => void;
}

export type GovernorKey =
  | "soqlQueries"
  | "soqlQueryRows"
  | "dmlStatements"
  | "dmlRows"
  | "cpuTimeMs"
  | "heapSizeBytes";

export interface SimulatedRunResult {
  testResults: {
    name: string;
    passed: boolean;
    message: string;
    hidden: boolean;
    executionTimeMs: number;
  }[];
  debugLog: string[];
  compileError: string | null;
  runtimeError: string | null;
  governorLimits: {
    soqlQueries: number;
    soqlQueryRows: number;
    dmlStatements: number;
    dmlRows: number;
    cpuTimeMs: number;
    heapSizeBytes: number;
  };
}
