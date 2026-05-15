import type { ProblemRunner, AnalysisContext, RunnerTestSpec } from "./types";

// Helpers shared across problem runners
const has = (ctx: AnalysisContext, pattern: RegExp): boolean =>
  pattern.test(ctx.stripped);

const count = (ctx: AnalysisContext, pattern: RegExp): number =>
  (ctx.stripped.match(pattern) || []).length;

// Mentions of *bulk* patterns we care about across many trigger problems.
const usesForLoopOverTriggerNew = (ctx: AnalysisContext): boolean =>
  /for\s*\(\s*\w[\w<>\s]*\s+\w+\s*:\s*Trigger\.new\s*\)/i.test(ctx.stripped);

const hasSoqlInsideForLoop = (ctx: AnalysisContext): boolean => {
  // crude scan: find each `for(...)` block and check if it contains [SELECT ...]
  const re = /for\s*\([^)]*\)\s*\{([^{}]|\{[^{}]*\})*\}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(ctx.stripped)) !== null) {
    if (/\[\s*select\s/i.test(m[0])) return true;
  }
  return false;
};

const hasDmlInsideForLoop = (ctx: AnalysisContext): boolean => {
  const re = /for\s*\([^)]*\)\s*\{([^{}]|\{[^{}]*\})*\}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(ctx.stripped)) !== null) {
    if (/\b(insert|update|upsert|delete)\s+\w/i.test(m[0])) return true;
  }
  return false;
};

const requiresAll = (
  ctx: AnalysisContext,
  patterns: { test: RegExp; label: string }[],
): { passed: boolean; message: string } => {
  for (const { test, label } of patterns) {
    if (!test.test(ctx.stripped)) {
      return { passed: false, message: `Missing: ${label}` };
    }
  }
  return { passed: true, message: "All required patterns present" };
};

// ---------- Problem runners ----------
const runners: Record<string, ProblemRunner> = {};

function register(runner: ProblemRunner) {
  runners[runner.slug] = runner;
}

// 1. Prevent Duplicate Account Names (Trigger - easy)
register({
  slug: "prevent-duplicate-account-names",
  tests: [
    {
      name: "Trigger declared on Account before insert",
      description: "Code declares a trigger on Account that fires before insert.",
      hidden: false,
      check: (ctx) =>
        /trigger\s+\w+\s+on\s+Account\s*\(([^)]*before\s+insert[^)]*)\)/i.test(
          ctx.stripped,
        )
          ? { passed: true, message: "Trigger header looks correct" }
          : { passed: false, message: "Add a trigger on Account (before insert)" },
    },
    {
      name: "Iterates Trigger.new",
      description: "Iterates over Trigger.new in a single pass (bulk-safe).",
      hidden: false,
      check: (ctx) =>
        usesForLoopOverTriggerNew(ctx)
          ? { passed: true, message: "Iterates Trigger.new with a for loop" }
          : { passed: false, message: "Iterate Trigger.new with a for loop" },
    },
    {
      name: "Uses a Set/Map to detect duplicates",
      description: "Uses a Set or Map to track seen names.",
      hidden: false,
      check: (ctx) =>
        /\b(Set|Map)\s*<[^>]+>/i.test(ctx.stripped)
          ? { passed: true, message: "Set/Map present" }
          : { passed: false, message: "Use a Set<String> or Map to track names" },
    },
    {
      name: "Hidden: Calls addError on duplicates",
      description: "Calls addError so the duplicate row is rejected.",
      hidden: true,
      check: (ctx) =>
        /\.addError\s*\(/i.test(ctx.stripped)
          ? { passed: true, message: "addError invoked" }
          : { passed: false, message: "Use addError to reject duplicates" },
    },
    {
      name: "Hidden: Single SOQL query, not in a loop",
      description: "Performs at most one SOQL query and never inside a for loop.",
      hidden: true,
      check: (ctx) => {
        if (hasSoqlInsideForLoop(ctx))
          return { passed: false, message: "SOQL inside a for loop is not bulk safe" };
        const q = count(ctx, /\[\s*select\s/gi);
        return q <= 1
          ? { passed: true, message: `${q} SOQL queries used` }
          : { passed: false, message: `Too many SOQL queries (${q})` };
      },
    },
  ],
});

// 2. Bulk Update Contact AccountName (Trigger - easy)
register({
  slug: "sync-contact-account-name",
  tests: [
    {
      name: "Trigger declared on Account after update",
      description: "Trigger fires after update on Account.",
      hidden: false,
      check: (ctx) =>
        /trigger\s+\w+\s+on\s+Account\s*\(([^)]*after\s+update[^)]*)\)/i.test(
          ctx.stripped,
        )
          ? { passed: true, message: "Trigger header looks correct" }
          : {
              passed: false,
              message: "Trigger must be on Account (after update)",
            },
    },
    {
      name: "Compares Trigger.old and Trigger.new",
      description: "Compares old and new values to detect renamed accounts.",
      hidden: false,
      check: (ctx) =>
        /Trigger\.old/i.test(ctx.stripped) && /Trigger\.new/i.test(ctx.stripped)
          ? { passed: true, message: "Compares old and new" }
          : { passed: false, message: "Compare Trigger.oldMap with Trigger.new" },
    },
    {
      name: "Hidden: Single SOQL on Contact, not in a loop",
      description: "Bulk-safe contact lookup.",
      hidden: true,
      check: (ctx) => {
        if (hasSoqlInsideForLoop(ctx))
          return { passed: false, message: "SOQL inside loop" };
        return /\[\s*select[^]*from\s+contact/i.test(ctx.stripped)
          ? { passed: true, message: "Contact SOQL present" }
          : { passed: false, message: "Query Contact records" };
      },
    },
    {
      name: "Hidden: Single DML, not inside a for loop",
      description: "All updates collected and committed once outside the loop.",
      hidden: true,
      check: (ctx) => {
        if (hasDmlInsideForLoop(ctx))
          return { passed: false, message: "DML inside a for loop" };
        return /\bupdate\s+\w/i.test(ctx.stripped)
          ? { passed: true, message: "Single update statement" }
          : { passed: false, message: "Update the contacts" };
      },
    },
  ],
});

// 3. Prevent Opportunity deletion when Won (Trigger - medium)
register({
  slug: "prevent-deleting-won-opportunity",
  tests: [
    {
      name: "Trigger on Opportunity before delete",
      description: "Trigger fires before delete on Opportunity.",
      hidden: false,
      check: (ctx) =>
        /trigger\s+\w+\s+on\s+Opportunity\s*\(([^)]*before\s+delete[^)]*)\)/i.test(
          ctx.stripped,
        )
          ? { passed: true, message: "Header correct" }
          : { passed: false, message: "Need before delete on Opportunity" },
    },
    {
      name: "Iterates Trigger.old",
      description: "Iterates Trigger.old (records being deleted).",
      hidden: false,
      check: (ctx) =>
        /for\s*\([^)]*Trigger\.old\)/i.test(ctx.stripped)
          ? { passed: true, message: "Loops Trigger.old" }
          : { passed: false, message: "Iterate Trigger.old" },
    },
    {
      name: "Hidden: Blocks Closed Won opportunities",
      description: "Calls addError when StageName == 'Closed Won'.",
      hidden: true,
      check: (ctx) =>
        /closed\s*won/i.test(ctx.stripped) && /\.addError\s*\(/i.test(ctx.stripped)
          ? { passed: true, message: "Blocks Closed Won" }
          : {
              passed: false,
              message: "Use addError when StageName is Closed Won",
            },
    },
  ],
});

// 4. Calculate Account total revenue from Opportunities (Trigger - medium)
register({
  slug: "rollup-account-revenue",
  tests: [
    {
      name: "Trigger on Opportunity",
      description: "Trigger declared on Opportunity for after insert/update.",
      hidden: false,
      check: (ctx) =>
        /trigger\s+\w+\s+on\s+Opportunity\s*\(([^)]*after\s+(insert|update)[^)]*)\)/i.test(
          ctx.stripped,
        )
          ? { passed: true, message: "Trigger header looks correct" }
          : { passed: false, message: "Trigger must be on Opportunity (after insert / after update)" },
    },
    {
      name: "Aggregates by AccountId",
      description: "Groups opportunities by AccountId using a Map.",
      hidden: false,
      check: (ctx) =>
        /Map\s*<\s*Id\s*,/i.test(ctx.stripped) && /AccountId/i.test(ctx.stripped)
          ? { passed: true, message: "Aggregation pattern present" }
          : { passed: false, message: "Group by AccountId in a Map<Id, ...>" },
    },
    {
      name: "Hidden: Bulk safe (single DML, no SOQL in loop)",
      description: "No SOQL/DML inside loops.",
      hidden: true,
      check: (ctx) => {
        if (hasSoqlInsideForLoop(ctx))
          return { passed: false, message: "SOQL inside loop" };
        if (hasDmlInsideForLoop(ctx))
          return { passed: false, message: "DML inside loop" };
        return { passed: true, message: "Bulkified" };
      },
    },
    {
      name: "Hidden: Updates Account",
      description: "Updates Account records with the rolled-up value.",
      hidden: true,
      check: (ctx) =>
        /\bupdate\s+\w/i.test(ctx.stripped) && /Account/i.test(ctx.stripped)
          ? { passed: true, message: "Account update found" }
          : { passed: false, message: "Update the Account records" },
    },
  ],
});

// 5. Send custom error on Lead source missing (Trigger - easy)
register({
  slug: "require-lead-source",
  tests: [
    {
      name: "Trigger on Lead before insert/update",
      description: "Trigger fires before insert and before update on Lead.",
      hidden: false,
      check: (ctx) =>
        /trigger\s+\w+\s+on\s+Lead\s*\(([^)]*before\s+(insert|update)[^)]*)\)/i.test(
          ctx.stripped,
        )
          ? { passed: true, message: "Header correct" }
          : { passed: false, message: "Trigger must be on Lead (before insert / before update)" },
    },
    {
      name: "Iterates Trigger.new",
      description: "Iterates Trigger.new.",
      hidden: false,
      check: (ctx) =>
        usesForLoopOverTriggerNew(ctx)
          ? { passed: true, message: "Iterates Trigger.new" }
          : { passed: false, message: "Iterate Trigger.new" },
    },
    {
      name: "Hidden: Adds error when LeadSource is blank",
      description: "Adds error to the field when LeadSource is null/blank.",
      hidden: true,
      check: (ctx) =>
        /LeadSource/i.test(ctx.stripped) && /\.addError\s*\(/i.test(ctx.stripped)
          ? { passed: true, message: "Validation in place" }
          : {
              passed: false,
              message: "Use addError on LeadSource when it's blank",
            },
    },
  ],
});

// 6. Batch Apex - clean inactive accounts (Async - medium)
register({
  slug: "batch-clean-inactive-accounts",
  tests: [
    {
      name: "Implements Database.Batchable",
      description: "Class implements Database.Batchable<sObject>.",
      hidden: false,
      check: (ctx) =>
        /implements\s+Database\.Batchable/i.test(ctx.stripped)
          ? { passed: true, message: "Implements Database.Batchable" }
          : { passed: false, message: "Implement Database.Batchable<sObject>" },
    },
    {
      name: "Defines start, execute, finish",
      description: "All three batch lifecycle methods are present.",
      hidden: false,
      check: (ctx) =>
        requiresAll(ctx, [
          { test: /\bstart\s*\(/i, label: "start(...)" },
          { test: /\bexecute\s*\(/i, label: "execute(...)" },
          { test: /\bfinish\s*\(/i, label: "finish(...)" },
        ]),
    },
    {
      name: "Hidden: start returns a QueryLocator",
      description: "start method returns Database.QueryLocator.",
      hidden: true,
      check: (ctx) =>
        /Database\.QueryLocator/i.test(ctx.stripped)
          ? { passed: true, message: "Returns QueryLocator" }
          : {
              passed: false,
              message: "start should return Database.QueryLocator",
            },
    },
    {
      name: "Hidden: execute filters or deletes inactive Accounts",
      description: "execute method removes / updates inactive accounts.",
      hidden: true,
      check: (ctx) =>
        /(delete|update)\s+\w/i.test(ctx.stripped) &&
        /(Active|Inactive|IsActive|Status)/i.test(ctx.stripped)
          ? { passed: true, message: "Mutation present" }
          : { passed: false, message: "Delete or update inactive accounts" },
    },
  ],
});

// 7. Queueable Apex - send follow up emails (Async - medium)
register({
  slug: "queueable-followup-emails",
  tests: [
    {
      name: "Implements Queueable",
      description: "Class implements the Queueable interface.",
      hidden: false,
      check: (ctx) =>
        /implements\s+Queueable/i.test(ctx.stripped)
          ? { passed: true, message: "Implements Queueable" }
          : { passed: false, message: "Implement Queueable" },
    },
    {
      name: "Defines execute(QueueableContext)",
      description: "Has an execute method accepting QueueableContext.",
      hidden: false,
      check: (ctx) =>
        /execute\s*\(\s*QueueableContext/i.test(ctx.stripped)
          ? { passed: true, message: "execute method signature ok" }
          : {
              passed: false,
              message: "execute(QueueableContext) is required",
            },
    },
    {
      name: "Hidden: Sends emails via Messaging",
      description: "Uses Messaging.SingleEmailMessage and Messaging.sendEmail.",
      hidden: true,
      check: (ctx) =>
        /Messaging\.(SingleEmailMessage|sendEmail)/i.test(ctx.stripped)
          ? { passed: true, message: "Messaging API used" }
          : { passed: false, message: "Use Messaging.sendEmail to send" },
    },
  ],
});

// 8. Schedulable Apex - daily report job (Async - hard)
register({
  slug: "schedulable-daily-report",
  tests: [
    {
      name: "Implements Schedulable",
      description: "Class implements Schedulable.",
      hidden: false,
      check: (ctx) =>
        /implements\s+Schedulable/i.test(ctx.stripped)
          ? { passed: true, message: "Implements Schedulable" }
          : { passed: false, message: "Implement Schedulable" },
    },
    {
      name: "Defines execute(SchedulableContext)",
      description: "execute method takes SchedulableContext.",
      hidden: false,
      check: (ctx) =>
        /execute\s*\(\s*SchedulableContext/i.test(ctx.stripped)
          ? { passed: true, message: "Signature correct" }
          : {
              passed: false,
              message: "execute(SchedulableContext sc) is required",
            },
    },
    {
      name: "Hidden: Aggregates with SUM/COUNT or GROUP BY",
      description: "Uses an aggregate query for the report.",
      hidden: true,
      check: (ctx) =>
        /(sum\s*\(|count\s*\(|group\s+by)/i.test(ctx.stripped)
          ? { passed: true, message: "Aggregate query present" }
          : {
              passed: false,
              message: "Use an aggregate SOQL (SUM / COUNT / GROUP BY)",
            },
    },
  ],
});

// 9. @future method to call external service (Async - easy)
register({
  slug: "future-external-callout",
  tests: [
    {
      name: "Method annotated @future(callout=true)",
      description: "@future annotation with callout=true is present.",
      hidden: false,
      check: (ctx) =>
        /@future\s*\(\s*callout\s*=\s*true\s*\)/i.test(ctx.stripped)
          ? { passed: true, message: "@future(callout=true) present" }
          : {
              passed: false,
              message: "Annotate the method with @future(callout=true)",
            },
    },
    {
      name: "Method is static",
      description: "@future methods must be static.",
      hidden: false,
      check: (ctx) =>
        /static\s+void\s+\w+\s*\(/i.test(ctx.stripped)
          ? { passed: true, message: "Static method present" }
          : {
              passed: false,
              message: "@future methods must be static and return void",
            },
    },
    {
      name: "Hidden: Accepts only primitive parameters",
      description: "@future methods cannot take sObject parameters.",
      hidden: true,
      check: (ctx) => {
        const sigs = ctx.stripped.match(
          /static\s+void\s+\w+\s*\(([^)]*)\)/gi,
        );
        if (!sigs) return { passed: false, message: "No method signature found" };
        for (const sig of sigs) {
          if (/\b(Account|Contact|Lead|Opportunity|sObject)\b/i.test(sig)) {
            return {
              passed: false,
              message: "@future methods cannot take sObject parameters",
            };
          }
        }
        return { passed: true, message: "Parameters look primitive" };
      },
    },
    {
      name: "Hidden: Performs an HttpRequest",
      description: "Uses HttpRequest / Http to call the external service.",
      hidden: true,
      check: (ctx) =>
        /\bnew\s+HttpRequest\s*\(/i.test(ctx.stripped) &&
        /\bnew\s+Http\s*\(/i.test(ctx.stripped)
          ? { passed: true, message: "HTTP callout present" }
          : { passed: false, message: "Use HttpRequest + Http to call out" },
    },
  ],
});

// 10. Singleton class (Classes - easy)
register({
  slug: "singleton-class",
  tests: [
    {
      name: "Class declared",
      description: "Public class is declared.",
      hidden: false,
      check: (ctx) =>
        /\b(public|global)\s+class\s+\w+/i.test(ctx.stripped)
          ? { passed: true, message: "Class declared" }
          : { passed: false, message: "Declare a public class" },
    },
    {
      name: "Private constructor",
      description: "Constructor is marked private.",
      hidden: false,
      check: (ctx) =>
        /private\s+\w+\s*\(\s*\)\s*\{/i.test(ctx.stripped)
          ? { passed: true, message: "Private constructor present" }
          : {
              passed: false,
              message: "Make the constructor private to enforce singleton",
            },
    },
    {
      name: "Hidden: Static getInstance method",
      description: "Static getInstance() returns the singleton.",
      hidden: true,
      check: (ctx) =>
        /static\s+\w+\s+getInstance\s*\(/i.test(ctx.stripped)
          ? { passed: true, message: "getInstance present" }
          : { passed: false, message: "Add static getInstance()" },
    },
    {
      name: "Hidden: Private static instance field",
      description: "Class holds a private static instance reference.",
      hidden: true,
      check: (ctx) =>
        /private\s+static\s+\w+\s+\w+\s*(=|;)/i.test(ctx.stripped)
          ? { passed: true, message: "Static instance field present" }
          : {
              passed: false,
              message: "Hold the singleton in a private static field",
            },
    },
  ],
});

// 11. Custom Exception class (Classes - easy)
register({
  slug: "custom-exception-class",
  tests: [
    {
      name: "Extends Exception",
      description: "Class extends Exception.",
      hidden: false,
      check: (ctx) =>
        /class\s+\w+\s+extends\s+Exception/i.test(ctx.stripped)
          ? { passed: true, message: "Extends Exception" }
          : { passed: false, message: "Class must extend Exception" },
    },
    {
      name: "Class name ends with Exception",
      description: "Apex requires custom exceptions to end in 'Exception'.",
      hidden: false,
      check: (ctx) =>
        /class\s+\w+Exception\s+extends\s+Exception/i.test(ctx.stripped)
          ? { passed: true, message: "Naming convention correct" }
          : { passed: false, message: "Class name must end with 'Exception'" },
    },
  ],
});

// 12. Wrapper class for table display (Classes - medium)
register({
  slug: "wrapper-class-table",
  tests: [
    {
      name: "Inner wrapper class declared",
      description: "Defines a wrapper class.",
      hidden: false,
      check: (ctx) =>
        /class\s+\w+Wrapper\b/i.test(ctx.stripped)
          ? { passed: true, message: "Wrapper class declared" }
          : { passed: false, message: "Declare a class ending in Wrapper" },
    },
    {
      name: "Wrapper has at least two public properties",
      description: "Wrapper exposes more than one field for the UI.",
      hidden: false,
      check: (ctx) => {
        const block = ctx.stripped.match(/class\s+\w+Wrapper\b[^{]*\{([\s\S]*?)\n\s*\}/i);
        if (!block) return { passed: false, message: "Wrapper class body not found" };
        const fields = (block[1] || "").match(/public\s+\w+\s+\w+\s*[;{]/gi) || [];
        return fields.length >= 2
          ? { passed: true, message: `${fields.length} public fields` }
          : { passed: false, message: "Add at least two public fields" };
      },
    },
    {
      name: "Hidden: Method returns a List<Wrapper>",
      description: "A method returns a List of the wrapper for the UI.",
      hidden: true,
      check: (ctx) =>
        /List\s*<\s*\w+Wrapper\s*>/i.test(ctx.stripped)
          ? { passed: true, message: "List<Wrapper> present" }
          : {
              passed: false,
              message: "Return List<Wrapper> from a method",
            },
    },
  ],
});

// 13. Apex Interface for payment processors (Classes - hard)
register({
  slug: "interface-payment-processor",
  tests: [
    {
      name: "Interface declared",
      description: "Defines an interface.",
      hidden: false,
      check: (ctx) =>
        /interface\s+\w+/i.test(ctx.stripped)
          ? { passed: true, message: "Interface declared" }
          : { passed: false, message: "Declare an interface" },
    },
    {
      name: "Defines processPayment method signature",
      description: "Interface defines processPayment(...).",
      hidden: false,
      check: (ctx) =>
        /\bprocessPayment\s*\(/i.test(ctx.stripped)
          ? { passed: true, message: "processPayment defined" }
          : { passed: false, message: "Define processPayment(...)" },
    },
    {
      name: "Hidden: At least one class implements the interface",
      description: "A concrete class implements the interface.",
      hidden: true,
      check: (ctx) =>
        /class\s+\w+\s+implements\s+\w+/i.test(ctx.stripped)
          ? { passed: true, message: "Implementing class found" }
          : {
              passed: false,
              message: "Provide an implementing class",
            },
    },
  ],
});

// 14. SOQL - Top 5 Accounts by revenue (SOQL - easy)
register({
  slug: "soql-top-accounts-by-revenue",
  tests: [
    {
      name: "SELECT Account fields",
      description: "Selects fields from Account.",
      hidden: false,
      check: (ctx) =>
        /\[\s*select[^]*from\s+account/i.test(ctx.stripped)
          ? { passed: true, message: "Account SOQL present" }
          : { passed: false, message: "Query the Account object" },
    },
    {
      name: "ORDER BY AnnualRevenue DESC",
      description: "Orders results by annual revenue, descending.",
      hidden: false,
      check: (ctx) =>
        /order\s+by\s+annualrevenue\s+desc/i.test(ctx.stripped)
          ? { passed: true, message: "Ordering correct" }
          : {
              passed: false,
              message: "Use ORDER BY AnnualRevenue DESC",
            },
    },
    {
      name: "LIMIT 5",
      description: "Returns at most 5 rows.",
      hidden: false,
      check: (ctx) =>
        /limit\s+5\b/i.test(ctx.stripped)
          ? { passed: true, message: "Limit 5 applied" }
          : { passed: false, message: "Add LIMIT 5" },
    },
  ],
});

// 15. SOQL - relationship query Contacts under Accounts (SOQL - medium)
register({
  slug: "soql-relationship-contacts-under-accounts",
  tests: [
    {
      name: "Outer query on Account",
      description: "Outer SOQL is on Account.",
      hidden: false,
      check: (ctx) =>
        /\[\s*select[^]*from\s+account/i.test(ctx.stripped)
          ? { passed: true, message: "Outer query is Account" }
          : { passed: false, message: "Outer query must be on Account" },
    },
    {
      name: "Subquery on Contacts",
      description: "Includes a child relationship subquery for Contacts.",
      hidden: false,
      check: (ctx) =>
        /\(\s*select[^]*from\s+contacts\s*\)/i.test(ctx.stripped)
          ? { passed: true, message: "Contacts subquery present" }
          : {
              passed: false,
              message: "Use (SELECT ... FROM Contacts) as a subquery",
            },
    },
    {
      name: "Hidden: WHERE filter on Account.Industry",
      description: "Filters accounts by industry.",
      hidden: true,
      check: (ctx) =>
        /where[^]*industry\s*=/i.test(ctx.stripped)
          ? { passed: true, message: "Industry filter present" }
          : {
              passed: false,
              message: "Filter Accounts WHERE Industry = ...",
            },
    },
  ],
});

// 16. SOQL - Aggregate group by stage (SOQL - medium)
register({
  slug: "soql-aggregate-opportunity-stage",
  tests: [
    {
      name: "FROM Opportunity",
      description: "Query is on Opportunity.",
      hidden: false,
      check: (ctx) =>
        /\[\s*select[^]*from\s+opportunity/i.test(ctx.stripped)
          ? { passed: true, message: "Opportunity query" }
          : { passed: false, message: "Query the Opportunity object" },
    },
    {
      name: "Uses GROUP BY StageName",
      description: "Aggregates by StageName.",
      hidden: false,
      check: (ctx) =>
        /group\s+by\s+stagename/i.test(ctx.stripped)
          ? { passed: true, message: "Group by StageName" }
          : {
              passed: false,
              message: "Use GROUP BY StageName",
            },
    },
    {
      name: "Hidden: Uses SUM(Amount) and COUNT(Id)",
      description: "Returns SUM of Amount and COUNT of Id per stage.",
      hidden: true,
      check: (ctx) =>
        /sum\s*\(\s*amount\s*\)/i.test(ctx.stripped) &&
        /count\s*\(\s*id\s*\)/i.test(ctx.stripped)
          ? { passed: true, message: "Aggregations present" }
          : {
              passed: false,
              message: "SELECT SUM(Amount), COUNT(Id) ...",
            },
    },
  ],
});

// 17. SOQL - Avoid SOQL injection (SOQL - hard)
register({
  slug: "soql-prevent-injection",
  tests: [
    {
      name: "Uses Database.query",
      description: "Uses dynamic SOQL via Database.query.",
      hidden: false,
      check: (ctx) =>
        /Database\.query\s*\(/i.test(ctx.stripped)
          ? { passed: true, message: "Database.query present" }
          : { passed: false, message: "Use Database.query for dynamic SOQL" },
    },
    {
      name: "Uses String.escapeSingleQuotes",
      description: "User input is escaped using String.escapeSingleQuotes.",
      hidden: false,
      check: (ctx) =>
        /String\.escapeSingleQuotes\s*\(/i.test(ctx.stripped)
          ? { passed: true, message: "Escapes single quotes" }
          : {
              passed: false,
              message: "Sanitize input with String.escapeSingleQuotes()",
            },
    },
    {
      name: "Hidden: WITH SECURITY_ENFORCED present",
      description: "Honors FLS by adding WITH SECURITY_ENFORCED.",
      hidden: true,
      check: (ctx) =>
        /with\s+security_enforced/i.test(ctx.stripped)
          ? { passed: true, message: "FLS-respecting query" }
          : {
              passed: false,
              message: "Add WITH SECURITY_ENFORCED to enforce FLS",
            },
    },
  ],
});

// 18. SOQL - Find Accounts without Contacts (SOQL - medium)
register({
  slug: "soql-accounts-without-contacts",
  tests: [
    {
      name: "Account query",
      description: "Query is on Account.",
      hidden: false,
      check: (ctx) =>
        /\[\s*select[^]*from\s+account/i.test(ctx.stripped)
          ? { passed: true, message: "Account query" }
          : { passed: false, message: "Query Account" },
    },
    {
      name: "Hidden: NOT IN (subquery on Contact.AccountId)",
      description: "Uses NOT IN with Contact subquery to find accounts without contacts.",
      hidden: true,
      check: (ctx) =>
        /not\s+in\s*\(\s*select\s+accountid\s+from\s+contact/i.test(ctx.stripped)
          ? { passed: true, message: "Anti-join present" }
          : {
              passed: false,
              message: "Use Id NOT IN (SELECT AccountId FROM Contact ...)",
            },
    },
  ],
});

// 19. Trigger handler pattern (Classes - hard)
register({
  slug: "trigger-handler-pattern",
  tests: [
    {
      name: "Defines handler class",
      description: "Class is named like a TriggerHandler.",
      hidden: false,
      check: (ctx) =>
        /class\s+\w*Handler\b/i.test(ctx.stripped)
          ? { passed: true, message: "Handler class declared" }
          : { passed: false, message: "Create a class ending with Handler" },
    },
    {
      name: "Has beforeInsert and afterInsert methods",
      description: "Defines context-specific methods.",
      hidden: false,
      check: (ctx) =>
        /\bbeforeInsert\s*\(/i.test(ctx.stripped) &&
        /\bafterInsert\s*\(/i.test(ctx.stripped)
          ? { passed: true, message: "Lifecycle methods present" }
          : {
              passed: false,
              message: "Add beforeInsert and afterInsert methods",
            },
    },
    {
      name: "Hidden: Uses recursion guard (static Boolean)",
      description: "Uses a static boolean to prevent recursion.",
      hidden: true,
      check: (ctx) =>
        /static\s+Boolean\s+\w+/i.test(ctx.stripped)
          ? { passed: true, message: "Recursion guard present" }
          : {
              passed: false,
              message: "Add a static Boolean recursion guard",
            },
    },
  ],
});

// 20. Apex Test class (Classes - medium)
register({
  slug: "apex-test-class-coverage",
  tests: [
    {
      name: "@isTest annotation present",
      description: "Class is annotated with @isTest.",
      hidden: false,
      check: (ctx) =>
        /@isTest\b/i.test(ctx.stripped)
          ? { passed: true, message: "@isTest present" }
          : { passed: false, message: "Add @isTest annotation" },
    },
    {
      name: "testMethod or @isTest static methods",
      description: "Has at least one test method.",
      hidden: false,
      check: (ctx) =>
        /(static\s+testMethod|@isTest\s+static)/i.test(ctx.stripped)
          ? { passed: true, message: "Test method present" }
          : { passed: false, message: "Add at least one test method" },
    },
    {
      name: "Uses Test.startTest / Test.stopTest",
      description: "Wraps logic with Test.startTest and Test.stopTest.",
      hidden: false,
      check: (ctx) =>
        /Test\.startTest\s*\(/i.test(ctx.stripped) &&
        /Test\.stopTest\s*\(/i.test(ctx.stripped)
          ? { passed: true, message: "startTest/stopTest used" }
          : {
              passed: false,
              message: "Wrap your test in Test.startTest() / Test.stopTest()",
            },
    },
    {
      name: "Hidden: Uses System.assertEquals or System.assert",
      description: "Has assertions.",
      hidden: true,
      check: (ctx) =>
        /System\.(assert|assertEquals|assertNotEquals)\s*\(/i.test(ctx.stripped)
          ? { passed: true, message: "Assertions present" }
          : {
              passed: false,
              message: "Add System.assertEquals(...) calls",
            },
    },
  ],
});

export function getRunner(slug: string): ProblemRunner | undefined {
  return runners[slug];
}

export function listRunnerSlugs(): string[] {
  return Object.keys(runners);
}
