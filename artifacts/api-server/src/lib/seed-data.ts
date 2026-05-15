import type { ProblemCategory, Difficulty, ProblemKind, TestSpec } from "@workspace/db";

export interface SeedProblem {
  slug: string;
  title: string;
  category: ProblemCategory;
  difficulty: Difficulty;
  kind: ProblemKind;
  tags: string[];
  statement: string;
  hints: string[];
  starterCode: string;
  tests: TestSpec[];
  featuredOrder?: number;
}

const t = (name: string, description: string, hidden: boolean): TestSpec => ({
  name,
  description,
  hidden,
});

export const SEED_PROBLEMS: SeedProblem[] = [
  {
    slug: "prevent-duplicate-account-names",
    title: "Prevent Duplicate Account Names",
    category: "trigger",
    difficulty: "easy",
    kind: "trigger",
    tags: ["bulkification", "validation", "before-insert"],
    featuredOrder: 1,
    statement: `Write a trigger on the **Account** object that prevents inserting accounts with duplicate names. If a name already exists in the database — or appears more than once inside the same insert batch — call \`addError\` on the offending record so it is rejected.

Requirements:
- Trigger fires **before insert** on Account.
- Must be **bulk-safe**: a single insert of 200 accounts must work without exceeding governor limits.
- Use a **single SOQL query** to check existing names — never query inside a for loop.
- Use a Set or Map to track names seen in the batch itself.

You will be graded on the trigger header, the bulk pattern, and how you raise the error.`,
    hints: [
      "Collect all names from Trigger.new into a Set<String> first.",
      "Run one SOQL query: [SELECT Name FROM Account WHERE Name IN :names].",
      "If a name appears in the existing set OR you see it twice in the batch, call addError on the record.",
    ],
    starterCode: `trigger PreventDuplicateAccount on Account (before insert) {
    // Step 1: Collect names from Trigger.new
    Set<String> names = new Set<String>();
    
    // Step 2: Query existing accounts with those names (single SOQL!)
    
    // Step 3: For each new account, raise an error if duplicate
}`,
    tests: [
      t("Trigger declared on Account before insert", "Code declares a trigger on Account that fires before insert.", false),
      t("Iterates Trigger.new", "Iterates over Trigger.new in a single pass (bulk-safe).", false),
      t("Uses a Set/Map to detect duplicates", "Uses a Set or Map to track seen names.", false),
      t("Hidden: Calls addError on duplicates", "Calls addError so the duplicate row is rejected.", true),
      t("Hidden: Single SOQL query, not in a loop", "Performs at most one SOQL query and never inside a for loop.", true),
    ],
  },
  {
    slug: "sync-contact-account-name",
    title: "Sync Contact AccountName when Account is Renamed",
    category: "trigger",
    difficulty: "easy",
    kind: "trigger",
    tags: ["bulkification", "after-update", "data-consistency"],
    featuredOrder: 2,
    statement: `When an Account name changes, every related Contact's custom field \`Account_Name__c\` must be updated to match.

Write an **after update** trigger on Account that:
- Detects accounts whose Name changed (compare \`Trigger.oldMap\` with \`Trigger.new\`).
- Queries the related Contacts in **one SOQL query**.
- Updates them in **one DML call** outside any loop.`,
    hints: [
      "Compare Trigger.oldMap.get(acc.Id).Name with acc.Name to detect changes.",
      "Build a Map<Id, String> of changed account ids -> new name.",
      "Single SOQL: [SELECT Id, AccountId FROM Contact WHERE AccountId IN :ids].",
    ],
    starterCode: `trigger SyncContactAccountName on Account (after update) {
    Map<Id, String> changedNames = new Map<Id, String>();
    
    // 1. Detect renamed accounts
    
    // 2. Single SOQL to load related contacts
    
    // 3. Single DML to update them
}`,
    tests: [
      t("Trigger declared on Account after update", "Trigger fires after update on Account.", false),
      t("Compares Trigger.old and Trigger.new", "Compares old and new values to detect renamed accounts.", false),
      t("Hidden: Single SOQL on Contact, not in a loop", "Bulk-safe contact lookup.", true),
      t("Hidden: Single DML, not inside a for loop", "All updates collected and committed once outside the loop.", true),
    ],
  },
  {
    slug: "prevent-deleting-won-opportunity",
    title: "Prevent Deleting a Closed Won Opportunity",
    category: "trigger",
    difficulty: "medium",
    kind: "trigger",
    tags: ["validation", "before-delete", "security"],
    statement: `Write a trigger that prevents users from deleting Opportunities that are in the **Closed Won** stage. Use \`addError\` to block the delete with a clear message.

Requirements:
- Trigger fires **before delete** on Opportunity.
- Iterate \`Trigger.old\` (the records being deleted).
- Block records where \`StageName == 'Closed Won'\`.`,
    hints: [
      "Use Trigger.old in before delete (Trigger.new is null on delete).",
      "Call addError directly on the sObject reference.",
    ],
    starterCode: `trigger PreventClosedWonDelete on Opportunity (before delete) {
    for (Opportunity opp : Trigger.old) {
        // Block if Closed Won
    }
}`,
    tests: [
      t("Trigger on Opportunity before delete", "Trigger fires before delete on Opportunity.", false),
      t("Iterates Trigger.old", "Iterates Trigger.old (records being deleted).", false),
      t("Hidden: Blocks Closed Won opportunities", "Calls addError when StageName == 'Closed Won'.", true),
    ],
  },
  {
    slug: "rollup-account-revenue",
    title: "Roll Up Total Revenue from Opportunities to Account",
    category: "trigger",
    difficulty: "medium",
    kind: "trigger",
    tags: ["bulkification", "rollup", "after-insert", "after-update"],
    statement: `Maintain a custom field \`Total_Revenue__c\` on Account equal to the sum of all related Opportunity \`Amount\` values.

Write an **after insert / after update** trigger on Opportunity that:
- Aggregates opportunity amounts by AccountId using a Map.
- Performs **at most one** SOQL query and **at most one** DML statement.
- Updates the affected Account records.`,
    hints: [
      "Use a Map<Id, Decimal> keyed by AccountId.",
      "Query [SELECT Id FROM Account WHERE Id IN :accountIds] then assign Total_Revenue__c.",
      "Update accountsToUpdate.values() in one call.",
    ],
    starterCode: `trigger RollupAccountRevenue on Opportunity (after insert, after update) {
    Map<Id, Decimal> totals = new Map<Id, Decimal>();
    
    // 1. Aggregate Trigger.new amounts by AccountId
    
    // 2. Query and update affected accounts in bulk
}`,
    tests: [
      t("Trigger on Opportunity", "Trigger declared on Opportunity for after insert/update.", false),
      t("Aggregates by AccountId", "Groups opportunities by AccountId using a Map.", false),
      t("Hidden: Bulk safe (single DML, no SOQL in loop)", "No SOQL/DML inside loops.", true),
      t("Hidden: Updates Account", "Updates Account records with the rolled-up value.", true),
    ],
  },
  {
    slug: "require-lead-source",
    title: "Require Lead Source on Lead",
    category: "trigger",
    difficulty: "easy",
    kind: "trigger",
    tags: ["validation", "before-insert", "before-update"],
    statement: `Every Lead must have a non-blank \`LeadSource\` value. Write a trigger that fires **before insert and before update** on Lead and adds an error to the LeadSource field on records where it is blank.`,
    hints: [
      "Use String.isBlank(lead.LeadSource).",
      "Call lead.LeadSource.addError('...') so the error appears next to the field in the UI.",
    ],
    starterCode: `trigger RequireLeadSource on Lead (before insert, before update) {
    for (Lead l : Trigger.new) {
        // Add error if LeadSource is blank
    }
}`,
    tests: [
      t("Trigger on Lead before insert/update", "Trigger fires before insert and before update on Lead.", false),
      t("Iterates Trigger.new", "Iterates Trigger.new.", false),
      t("Hidden: Adds error when LeadSource is blank", "Adds error to the field when LeadSource is null/blank.", true),
    ],
  },
  {
    slug: "batch-clean-inactive-accounts",
    title: "Batch Apex: Clean Up Inactive Accounts",
    category: "async_apex",
    difficulty: "medium",
    kind: "batch",
    tags: ["batch", "database-batchable", "governor-limits"],
    featuredOrder: 3,
    statement: `Write a Batch Apex class that scans every Account and deletes (or marks inactive) any account that has been flagged as inactive (e.g. \`Active__c = 'No'\`).

Requirements:
- Implement \`Database.Batchable<sObject>\`.
- \`start\` returns a \`Database.QueryLocator\`.
- \`execute\` deletes or updates the inactive accounts in chunks.
- \`finish\` is defined (can simply log).`,
    hints: [
      "global class CleanInactiveAccountsBatch implements Database.Batchable<sObject> { ... }",
      "Database.getQueryLocator('SELECT Id FROM Account WHERE Active__c = \\'No\\'')",
      "execute(Database.BatchableContext bc, List<Account> scope) { delete scope; }",
    ],
    starterCode: `global class CleanInactiveAccountsBatch implements Database.Batchable<sObject> {
    
    global Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator(/* your query */);
    }
    
    global void execute(Database.BatchableContext bc, List<Account> scope) {
        // delete or update inactive accounts
    }
    
    global void finish(Database.BatchableContext bc) {
        // optional cleanup or notification
    }
}`,
    tests: [
      t("Implements Database.Batchable", "Class implements Database.Batchable<sObject>.", false),
      t("Defines start, execute, finish", "All three batch lifecycle methods are present.", false),
      t("Hidden: start returns a QueryLocator", "start method returns Database.QueryLocator.", true),
      t("Hidden: execute filters or deletes inactive Accounts", "execute method removes / updates inactive accounts.", true),
    ],
  },
  {
    slug: "queueable-followup-emails",
    title: "Queueable Apex: Send Follow-Up Emails",
    category: "async_apex",
    difficulty: "medium",
    kind: "queueable",
    tags: ["queueable", "messaging", "async"],
    statement: `Build a Queueable class \`SendFollowUpEmails\` that takes a list of Contact Ids in its constructor and sends each one a single email using the Messaging API.

Requirements:
- Implements \`Queueable\`.
- Defines \`execute(QueueableContext qc)\`.
- Uses \`Messaging.SingleEmailMessage\` and \`Messaging.sendEmail\`.`,
    hints: [
      "public class SendFollowUpEmails implements Queueable { ... }",
      "Build a List<Messaging.SingleEmailMessage>, then Messaging.sendEmail(emails).",
    ],
    starterCode: `public class SendFollowUpEmails implements Queueable {
    private List<Id> contactIds;
    
    public SendFollowUpEmails(List<Id> ids) {
        this.contactIds = ids;
    }
    
    public void execute(QueueableContext qc) {
        // Build and send emails
    }
}`,
    tests: [
      t("Implements Queueable", "Class implements the Queueable interface.", false),
      t("Defines execute(QueueableContext)", "Has an execute method accepting QueueableContext.", false),
      t("Hidden: Sends emails via Messaging", "Uses Messaging.SingleEmailMessage and Messaging.sendEmail.", true),
    ],
  },
  {
    slug: "schedulable-daily-report",
    title: "Schedulable Apex: Daily Aggregate Report",
    category: "async_apex",
    difficulty: "hard",
    kind: "schedulable",
    tags: ["schedulable", "aggregate", "soql"],
    statement: `Write a Schedulable Apex class \`DailyOpportunityReport\` that runs once a day. In its \`execute\` it should run an **aggregate SOQL** (using SUM, COUNT, or GROUP BY) to compute today's opportunity totals, then store them somewhere (you can use System.debug for the simulated environment).

Requirements:
- Implements \`Schedulable\`.
- \`execute(SchedulableContext sc)\` is defined.
- Uses an aggregate query (SUM, COUNT, or GROUP BY).`,
    hints: [
      "public class DailyOpportunityReport implements Schedulable { ... }",
      "AggregateResult[] results = [SELECT StageName, SUM(Amount) FROM Opportunity WHERE CreatedDate = TODAY GROUP BY StageName];",
    ],
    starterCode: `public class DailyOpportunityReport implements Schedulable {
    
    public void execute(SchedulableContext sc) {
        // Aggregate query + log results
    }
}`,
    tests: [
      t("Implements Schedulable", "Class implements Schedulable.", false),
      t("Defines execute(SchedulableContext)", "execute method takes SchedulableContext.", false),
      t("Hidden: Aggregates with SUM/COUNT or GROUP BY", "Uses an aggregate query for the report.", true),
    ],
  },
  {
    slug: "future-external-callout",
    title: "@future Method: Call External Service",
    category: "async_apex",
    difficulty: "easy",
    kind: "future",
    tags: ["future", "callout", "http"],
    statement: `Write a static \`@future(callout=true)\` method \`notifyExternalSystem\` that takes a primitive list of contact emails (List<String>) and calls an external HTTP endpoint for each one.

Requirements:
- Method annotated with \`@future(callout=true)\`.
- Method is \`static void\`.
- Parameters must be **primitive** (no sObjects).
- Method performs \`new HttpRequest()\` + \`new Http().send(...)\`.`,
    hints: [
      "@future methods cannot accept sObjects — only primitives or List of primitives.",
      "Set the endpoint, method, and body on the HttpRequest before sending.",
    ],
    starterCode: `public class ExternalNotifier {
    
    @future(callout=true)
    public static void notifyExternalSystem(List<String> emails) {
        // For each email, send an HTTP POST
    }
}`,
    tests: [
      t("Method annotated @future(callout=true)", "@future annotation with callout=true is present.", false),
      t("Method is static", "@future methods must be static.", false),
      t("Hidden: Accepts only primitive parameters", "@future methods cannot take sObject parameters.", true),
      t("Hidden: Performs an HttpRequest", "Uses HttpRequest / Http to call the external service.", true),
    ],
  },
  {
    slug: "singleton-class",
    title: "Singleton Pattern in Apex",
    category: "classes",
    difficulty: "easy",
    kind: "class",
    tags: ["pattern", "static", "design-pattern"],
    statement: `Implement the singleton pattern for a class \`AppConfig\`:

- Constructor must be **private**.
- Class holds a **private static** instance reference.
- Provides a **static \`getInstance()\`** method that lazily creates and returns the same instance every time.`,
    hints: [
      "private static AppConfig instance;",
      "private AppConfig() { ... }",
      "public static AppConfig getInstance() { if (instance == null) instance = new AppConfig(); return instance; }",
    ],
    starterCode: `public class AppConfig {
    
    private static AppConfig instance;
    
    private AppConfig() {
        // private to enforce singleton
    }
    
    // Static getInstance
}`,
    tests: [
      t("Class declared", "Public class is declared.", false),
      t("Private constructor", "Constructor is marked private.", false),
      t("Hidden: Static getInstance method", "Static getInstance() returns the singleton.", true),
      t("Hidden: Private static instance field", "Class holds a private static instance reference.", true),
    ],
  },
  {
    slug: "custom-exception-class",
    title: "Custom Exception Class",
    category: "classes",
    difficulty: "easy",
    kind: "class",
    tags: ["exception", "naming", "error-handling"],
    statement: `Define a custom exception named \`InvalidOrderException\`. In Apex, custom exceptions must:
- **Extend** the built-in \`Exception\` class.
- Have a class **name ending in \`Exception\`**.`,
    hints: [
      "public class InvalidOrderException extends Exception {}",
      "Apex automatically synthesizes constructors for exception classes.",
    ],
    starterCode: `// Define your exception class here
`,
    tests: [
      t("Extends Exception", "Class extends Exception.", false),
      t("Class name ends with Exception", "Apex requires custom exceptions to end in 'Exception'.", false),
    ],
  },
  {
    slug: "wrapper-class-table",
    title: "Wrapper Class for Visualforce Table",
    category: "classes",
    difficulty: "medium",
    kind: "class",
    tags: ["wrapper", "controller", "ui"],
    statement: `Build a wrapper class \`AccountWrapper\` and a controller method \`getWrappedAccounts\` that returns a \`List<AccountWrapper>\`. The wrapper must expose at least 2 public properties — for example, the Account record itself and a \`Boolean isSelected\` flag.`,
    hints: [
      "public class AccountWrapper { public Account record; public Boolean isSelected; }",
      "Loop through queried Accounts and instantiate one wrapper per record.",
    ],
    starterCode: `public class AccountListController {
    
    public class AccountWrapper {
        // public properties here
    }
    
    public List<AccountWrapper> getWrappedAccounts() {
        // build and return the list
        return null;
    }
}`,
    tests: [
      t("Inner wrapper class declared", "Defines a wrapper class.", false),
      t("Wrapper has at least two public properties", "Wrapper exposes more than one field for the UI.", false),
      t("Hidden: Method returns a List<Wrapper>", "A method returns a List of the wrapper for the UI.", true),
    ],
  },
  {
    slug: "interface-payment-processor",
    title: "Interface: Pluggable Payment Processor",
    category: "classes",
    difficulty: "hard",
    kind: "class",
    tags: ["interface", "polymorphism", "design-pattern"],
    statement: `Define an interface \`IPaymentProcessor\` with a method \`processPayment(Decimal amount)\`. Then provide at least one concrete class (e.g. \`StripePaymentProcessor\`) that **implements** the interface.`,
    hints: [
      "public interface IPaymentProcessor { Boolean processPayment(Decimal amount); }",
      "public class StripePaymentProcessor implements IPaymentProcessor { public Boolean processPayment(Decimal amount) { ... } }",
    ],
    starterCode: `public interface IPaymentProcessor {
    // Method signature
}

public class StripePaymentProcessor implements IPaymentProcessor {
    // Implement the interface method
}`,
    tests: [
      t("Interface declared", "Defines an interface.", false),
      t("Defines processPayment method signature", "Interface defines processPayment(...).", false),
      t("Hidden: At least one class implements the interface", "A concrete class implements the interface.", true),
    ],
  },
  {
    slug: "soql-top-accounts-by-revenue",
    title: "SOQL: Top 5 Accounts by Annual Revenue",
    category: "soql",
    difficulty: "easy",
    kind: "soql",
    tags: ["select", "order-by", "limit"],
    featuredOrder: 4,
    statement: `Write Apex that queries the **5 highest-revenue accounts** ordered by \`AnnualRevenue\` descending. Return them from a method.`,
    hints: [
      "ORDER BY AnnualRevenue DESC, then LIMIT 5.",
      "Wrap the SOQL in [ ... ] and assign to a List<Account>.",
    ],
    starterCode: `public class TopAccountsService {
    public static List<Account> topByRevenue() {
        return [
            // SELECT ... FROM Account ORDER BY ... LIMIT ...
        ];
    }
}`,
    tests: [
      t("SELECT Account fields", "Selects fields from Account.", false),
      t("ORDER BY AnnualRevenue DESC", "Orders results by annual revenue, descending.", false),
      t("LIMIT 5", "Returns at most 5 rows.", false),
    ],
  },
  {
    slug: "soql-relationship-contacts-under-accounts",
    title: "SOQL: Tech Accounts and Their Contacts",
    category: "soql",
    difficulty: "medium",
    kind: "soql",
    tags: ["relationship-query", "subquery", "filter"],
    statement: `Return all Accounts with \`Industry = 'Technology'\` along with each Account's related Contacts using a **child relationship subquery**.`,
    hints: [
      "Outer query: SELECT Id, Name, (SELECT Id, FirstName, LastName FROM Contacts) FROM Account WHERE Industry = 'Technology'.",
    ],
    starterCode: `public class TechAccountsService {
    public static List<Account> getTechAccountsWithContacts() {
        return [
            // SELECT Id, Name, (SELECT ... FROM Contacts) FROM Account WHERE ...
        ];
    }
}`,
    tests: [
      t("Outer query on Account", "Outer SOQL is on Account.", false),
      t("Subquery on Contacts", "Includes a child relationship subquery for Contacts.", false),
      t("Hidden: WHERE filter on Account.Industry", "Filters accounts by industry.", true),
    ],
  },
  {
    slug: "soql-aggregate-opportunity-stage",
    title: "SOQL: Aggregate Opportunity Pipeline by Stage",
    category: "soql",
    difficulty: "medium",
    kind: "soql",
    tags: ["aggregate", "group-by", "sum", "count"],
    statement: `Write a query that returns the **count of opportunities** and the **sum of their Amount** grouped by \`StageName\`.`,
    hints: [
      "SELECT StageName, COUNT(Id), SUM(Amount) FROM Opportunity GROUP BY StageName.",
      "Return the AggregateResult[] from a method.",
    ],
    starterCode: `public class PipelineService {
    public static AggregateResult[] pipelineByStage() {
        return [
            // SELECT StageName, COUNT(Id), SUM(Amount) FROM Opportunity GROUP BY StageName
        ];
    }
}`,
    tests: [
      t("FROM Opportunity", "Query is on Opportunity.", false),
      t("Uses GROUP BY StageName", "Aggregates by StageName.", false),
      t("Hidden: Uses SUM(Amount) and COUNT(Id)", "Returns SUM of Amount and COUNT of Id per stage.", true),
    ],
  },
  {
    slug: "soql-prevent-injection",
    title: "SOQL: Safe Dynamic Query (Prevent Injection)",
    category: "soql",
    difficulty: "hard",
    kind: "soql",
    tags: ["security", "dynamic-soql", "injection", "fls"],
    statement: `Write a method that performs a **dynamic SOQL** query against Account based on a user-supplied search string. The query must:
- Use \`Database.query(...)\`.
- Sanitize the input with \`String.escapeSingleQuotes\`.
- Honor field-level security with \`WITH SECURITY_ENFORCED\`.`,
    hints: [
      "String safe = String.escapeSingleQuotes(userInput);",
      "Database.query('SELECT Id, Name FROM Account WHERE Name LIKE \\'%' + safe + '%\\' WITH SECURITY_ENFORCED');",
    ],
    starterCode: `public class AccountSearch {
    public static List<Account> search(String userInput) {
        // 1. Sanitize the user input
        // 2. Build a query with WITH SECURITY_ENFORCED
        // 3. Execute via Database.query
        return null;
    }
}`,
    tests: [
      t("Uses Database.query", "Uses dynamic SOQL via Database.query.", false),
      t("Uses String.escapeSingleQuotes", "User input is escaped using String.escapeSingleQuotes.", false),
      t("Hidden: WITH SECURITY_ENFORCED present", "Honors FLS by adding WITH SECURITY_ENFORCED.", true),
    ],
  },
  {
    slug: "soql-accounts-without-contacts",
    title: "SOQL: Find Accounts Without Contacts",
    category: "soql",
    difficulty: "medium",
    kind: "soql",
    tags: ["semi-join", "anti-join", "not-in"],
    statement: `Return all Accounts that do **not** have any related Contact rows. Use a SOQL anti-join with \`NOT IN\`.`,
    hints: [
      "SELECT Id, Name FROM Account WHERE Id NOT IN (SELECT AccountId FROM Contact WHERE AccountId != null).",
    ],
    starterCode: `public class OrphanAccountService {
    public static List<Account> getAccountsWithoutContacts() {
        return [
            // SELECT ... FROM Account WHERE Id NOT IN (...)
        ];
    }
}`,
    tests: [
      t("Account query", "Query is on Account.", false),
      t("Hidden: NOT IN (subquery on Contact.AccountId)", "Uses NOT IN with Contact subquery to find accounts without contacts.", true),
    ],
  },
  {
    slug: "trigger-handler-pattern",
    title: "Trigger Handler Framework",
    category: "classes",
    difficulty: "hard",
    kind: "class",
    tags: ["pattern", "handler", "recursion"],
    statement: `Triggers should be one-line: they delegate to a Handler class. Build a class \`AccountTriggerHandler\` that:
- Defines methods for each context (e.g. \`beforeInsert\`, \`afterInsert\`).
- Uses a **static Boolean** flag (e.g. \`alreadyRun\`) as a **recursion guard** so the same logic doesn't re-fire when the trigger updates records that re-fire the same trigger.`,
    hints: [
      "public class AccountTriggerHandler { public static Boolean alreadyRun = false; ... }",
      "Inside each handler method: if (alreadyRun) return; alreadyRun = true; ...",
    ],
    starterCode: `public class AccountTriggerHandler {
    
    public static Boolean alreadyRun = false;
    
    public void beforeInsert(List<Account> newRecords) {
        // your logic
    }
    
    public void afterInsert(List<Account> newRecords, Map<Id, Account> newMap) {
        // your logic
    }
}`,
    tests: [
      t("Defines handler class", "Class is named like a TriggerHandler.", false),
      t("Has beforeInsert and afterInsert methods", "Defines context-specific methods.", false),
      t("Hidden: Uses recursion guard (static Boolean)", "Uses a static boolean to prevent recursion.", true),
    ],
  },
  {
    slug: "apex-test-class-coverage",
    title: "Apex Test Class with Assertions",
    category: "classes",
    difficulty: "medium",
    kind: "class",
    tags: ["testing", "isTest", "assertions"],
    statement: `Write a basic Apex test class \`AccountServiceTest\` that:
- Is annotated with **@isTest**.
- Defines **at least one** test method.
- Wraps logic with **\`Test.startTest()\` / \`Test.stopTest()\`**.
- Verifies the result with **\`System.assertEquals\` or \`System.assert\`**.`,
    hints: [
      "@isTest private class AccountServiceTest { @isTest static void itWorks() { Test.startTest(); ... Test.stopTest(); System.assertEquals(...); } }",
    ],
    starterCode: `@isTest
private class AccountServiceTest {
    
    @isTest
    static void shouldDoSomething() {
        Test.startTest();
        // call the code under test
        Test.stopTest();
        
        // System.assertEquals(...)
    }
}`,
    tests: [
      t("@isTest annotation present", "Class is annotated with @isTest.", false),
      t("testMethod or @isTest static methods", "Has at least one test method.", false),
      t("Uses Test.startTest / Test.stopTest", "Wraps logic with Test.startTest and Test.stopTest.", false),
      t("Hidden: Uses System.assertEquals or System.assert", "Has assertions.", true),
    ],
  },
];

export const SEED_USERS: { id: string; username: string; submissions?: { problemSlug: string; status: "accepted" | "wrong_answer"; passedCount: number; totalCount: number }[] }[] = [
  {
    id: "seed-user-aria",
    username: "aria_codes",
    submissions: [
      { problemSlug: "prevent-duplicate-account-names", status: "accepted", passedCount: 5, totalCount: 5 },
      { problemSlug: "sync-contact-account-name", status: "accepted", passedCount: 4, totalCount: 4 },
      { problemSlug: "soql-top-accounts-by-revenue", status: "accepted", passedCount: 3, totalCount: 3 },
      { problemSlug: "singleton-class", status: "accepted", passedCount: 4, totalCount: 4 },
    ],
  },
  {
    id: "seed-user-malik",
    username: "malik_apex",
    submissions: [
      { problemSlug: "batch-clean-inactive-accounts", status: "accepted", passedCount: 4, totalCount: 4 },
      { problemSlug: "queueable-followup-emails", status: "accepted", passedCount: 3, totalCount: 3 },
      { problemSlug: "soql-aggregate-opportunity-stage", status: "accepted", passedCount: 3, totalCount: 3 },
    ],
  },
  {
    id: "seed-user-rin",
    username: "rin_dev",
    submissions: [
      { problemSlug: "prevent-duplicate-account-names", status: "accepted", passedCount: 5, totalCount: 5 },
      { problemSlug: "future-external-callout", status: "accepted", passedCount: 4, totalCount: 4 },
    ],
  },
  {
    id: "seed-user-juno",
    username: "juno_orgs",
    submissions: [
      { problemSlug: "soql-top-accounts-by-revenue", status: "accepted", passedCount: 3, totalCount: 3 },
      { problemSlug: "soql-relationship-contacts-under-accounts", status: "wrong_answer", passedCount: 2, totalCount: 3 },
    ],
  },
  {
    id: "seed-user-lex",
    username: "lex_trailblazer",
    submissions: [
      { problemSlug: "custom-exception-class", status: "accepted", passedCount: 2, totalCount: 2 },
    ],
  },
];
