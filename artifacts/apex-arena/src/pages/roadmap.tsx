import { useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import {
  Shield, Code2, Layers, Cpu, GitBranch, BarChart3,
  ChevronDown, ChevronRight, ExternalLink, BookOpen, ArrowRight, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type NodeStatus = "required" | "recommended" | "optional";

interface RoadmapNode {
  id: string;
  title: string;
  description: string;
  status: NodeStatus;
  resources?: string[];
  problemLink?: string;
}

interface RoadmapPhase {
  id: string;
  title: string;
  subtitle?: string;
  nodes: RoadmapNode[];
  columns?: number;
}

interface RoadmapData {
  id: string;
  title: string;
  badge: string;
  description: string;
  color: string;
  bgGradient: string;
  borderColor: string;
  icon: React.ElementType;
  phases: RoadmapPhase[];
}

const ROADMAPS: RoadmapData[] = [
  {
    id: "developer",
    title: "Salesforce Developer",
    badge: "Platform Developer I & II",
    description: "Master Apex, LWC, SOQL, and integration patterns to build custom Salesforce applications.",
    color: "text-cyan-400",
    bgGradient: "from-cyan-500/10 to-transparent",
    borderColor: "border-cyan-500/30",
    icon: Code2,
    phases: [
      {
        id: "fundamentals",
        title: "Salesforce Fundamentals",
        subtitle: "Core platform concepts every developer must know",
        columns: 3,
        nodes: [
          { id: "sf-data-model", title: "Salesforce Data Model", description: "Objects, fields, relationships (lookup, master-detail, many-to-many), schema builder.", status: "required" },
          { id: "sf-ui", title: "Platform Navigation", description: "Setup menu, App Manager, Lightning App Builder, Object Manager.", status: "required" },
          { id: "sf-security", title: "Security Model", description: "Profiles, permission sets, roles, OWD, sharing rules, field-level security.", status: "required" },
          { id: "declarative", title: "Declarative Tools", description: "Validation rules, workflow rules, Process Builder, and the basics of Flow Builder.", status: "recommended" },
          { id: "deployment-basics", title: "Change Sets & Metadata", description: "Sandboxes, change sets, environments overview.", status: "recommended" },
          { id: "dx-basics", title: "Salesforce DX Basics", description: "SF CLI, scratch orgs, project structure, source tracking.", status: "optional" },
        ],
      },
      {
        id: "apex-core",
        title: "Apex Programming",
        subtitle: "The language of Salesforce backend development",
        columns: 3,
        nodes: [
          { id: "apex-syntax", title: "Apex Syntax & Types", description: "Classes, interfaces, data types, collections (List, Set, Map), control flow.", status: "required", problemLink: "/problems" },
          { id: "soql", title: "SOQL & SOSL", description: "SELECT queries, WHERE, ORDER BY, LIMIT, relationship queries, aggregate functions, dynamic SOQL.", status: "required", problemLink: "/problems?category=soql" },
          { id: "dml", title: "DML Operations", description: "insert, update, upsert, delete, undelete, Database methods, partial saves.", status: "required" },
          { id: "triggers", title: "Apex Triggers", description: "before/after insert/update/delete/undelete, trigger context variables, one-trigger-per-object pattern.", status: "required", problemLink: "/problems?category=trigger" },
          { id: "trigger-handler", title: "Trigger Frameworks", description: "Handler classes, separation of concerns, FFLIB trigger framework.", status: "recommended" },
          { id: "governor-limits", title: "Governor Limits", description: "SOQL queries, DML statements, heap size, CPU time — understanding and avoiding limit exceptions.", status: "required" },
        ],
      },
      {
        id: "apex-advanced",
        title: "Advanced Apex",
        subtitle: "Patterns and techniques for production-grade Apex",
        columns: 3,
        nodes: [
          { id: "async-apex", title: "Asynchronous Apex", description: "Future methods, Queueable, Batch Apex, Scheduled Apex — when to use which.", status: "required", problemLink: "/problems?category=async_apex" },
          { id: "bulkification", title: "Bulkification", description: "Always-bulk mindset: no SOQL/DML inside loops, collection-based patterns.", status: "required" },
          { id: "test-apex", title: "Apex Testing", description: "@IsTest, test data factories, Test.startTest/stopTest, mock HttpCallout, System.assert.", status: "required" },
          { id: "exception-handling", title: "Exception Handling", description: "try-catch-finally, custom exceptions, Database.SaveResult error handling.", status: "required" },
          { id: "design-patterns", title: "Design Patterns", description: "Singleton, Factory, Strategy — applied to Apex development.", status: "recommended" },
          { id: "apex-security", title: "Apex Security", description: "with sharing / without sharing, CRUD/FLS enforcement, Security.stripInaccessible.", status: "recommended" },
        ],
      },
      {
        id: "lwc",
        title: "Lightning Web Components",
        subtitle: "Modern JavaScript UI on the Salesforce platform",
        columns: 3,
        nodes: [
          { id: "lwc-basics", title: "LWC Fundamentals", description: "HTML templates, JavaScript class, CSS, component lifecycle, reactive properties.", status: "required" },
          { id: "lwc-data", title: "Data Binding & Events", description: "@api, @track, @wire decorator, custom events, event bubbling.", status: "required" },
          { id: "wire-apex", title: "Wire Service & Apex", description: "Calling Apex from LWC: @wire, imperative calls, error handling.", status: "required" },
          { id: "lwc-navigation", title: "Navigation & UI API", description: "NavigationMixin, lightning/uiRecordApi, lightning/uiListApi.", status: "recommended" },
          { id: "lwc-base", title: "Base Components", description: "lightning-record-form, lightning-datatable, lightning-combobox and other SLDS components.", status: "recommended" },
          { id: "lwc-perf", title: "LWC Performance", description: "Lazy loading, memoization, avoiding unnecessary re-renders.", status: "optional" },
        ],
      },
      {
        id: "integrations",
        title: "Integrations & APIs",
        subtitle: "Connect Salesforce to the outside world",
        columns: 3,
        nodes: [
          { id: "rest-api", title: "REST API", description: "SOQL via REST, SObject endpoints, composite/batch requests, authentication (OAuth 2.0).", status: "required" },
          { id: "soap-api", title: "SOAP API", description: "Enterprise/Partner WSDL, when to use SOAP vs REST.", status: "recommended" },
          { id: "http-callouts", title: "Apex HTTP Callouts", description: "HttpRequest, HttpResponse, named credentials, mock callouts in tests.", status: "required" },
          { id: "platform-events", title: "Platform Events", description: "Publish-subscribe model, event-driven architecture on Salesforce.", status: "recommended" },
          { id: "connected-apps", title: "Connected Apps & OAuth", description: "App registration, flows: web server, device, JWT bearer.", status: "recommended" },
          { id: "middleware", title: "Middleware & ESB", description: "MuleSoft basics, integration patterns (sync/async), ETL tools.", status: "optional" },
        ],
      },
      {
        id: "devops",
        title: "DevOps & Deployment",
        subtitle: "Shipping code reliably to production",
        columns: 3,
        nodes: [
          { id: "sfdx", title: "Salesforce DX & CLI", description: "Source format, scratch orgs, sfdx commands, .forceignore.", status: "required" },
          { id: "ci-cd-dev", title: "CI/CD Pipelines", description: "GitHub Actions, Bitbucket Pipelines, SFDX-based deployment automation.", status: "recommended" },
          { id: "version-control", title: "Git for Salesforce", description: "Branching strategies (Gitflow vs trunk-based), merge conflicts in metadata.", status: "required" },
          { id: "deployment-tools", title: "Deployment Tools", description: "Copado, Gearset, SFDX Deploy, metadata API comparisons.", status: "optional" },
        ],
      },
    ],
  },
  {
    id: "admin",
    title: "Salesforce Administrator",
    badge: "Salesforce Administrator Cert",
    description: "Configure and manage the Salesforce platform — security, automation, reports, and data management.",
    color: "text-emerald-400",
    bgGradient: "from-emerald-500/10 to-transparent",
    borderColor: "border-emerald-500/30",
    icon: Shield,
    phases: [
      {
        id: "org-setup",
        title: "Org Setup & Configuration",
        subtitle: "Initial platform setup and company settings",
        columns: 3,
        nodes: [
          { id: "company-info", title: "Company Information", description: "Fiscal year, business hours, currencies, locale settings.", status: "required" },
          { id: "user-management", title: "User Management", description: "Create and manage users, roles, profiles, permission sets, permission set groups.", status: "required" },
          { id: "login-access", title: "Login & Access Policies", description: "Password policies, session settings, login hours, IP restrictions.", status: "required" },
          { id: "sandbox", title: "Sandbox Management", description: "Sandbox types (Dev, Dev Pro, Partial, Full), refresh cycles, template setup.", status: "recommended" },
        ],
      },
      {
        id: "data-management-admin",
        title: "Data Modeling & Management",
        subtitle: "Building and maintaining your Salesforce data structure",
        columns: 3,
        nodes: [
          { id: "objects-fields", title: "Objects & Fields", description: "Standard vs custom objects, field types, required/unique/external ID fields.", status: "required" },
          { id: "relationships-admin", title: "Relationships", description: "Lookup, master-detail, hierarchy, many-to-many (junction objects).", status: "required" },
          { id: "data-import", title: "Data Import & Export", description: "Data Import Wizard, Data Loader, manual CSV processes, scheduled exports.", status: "required" },
          { id: "data-quality", title: "Data Quality", description: "Validation rules, duplicate management, matching rules, data cleanup.", status: "required" },
          { id: "field-history", title: "Field History Tracking", description: "Track changes on fields, reporting on history, retention policy.", status: "recommended" },
        ],
      },
      {
        id: "security-admin",
        title: "Security & Access",
        subtitle: "Controlling who sees and does what",
        columns: 3,
        nodes: [
          { id: "owd", title: "OWD & Sharing", description: "Org-wide defaults, role hierarchy, sharing rules (criteria-based, ownership-based).", status: "required" },
          { id: "profiles-admin", title: "Profiles & Permission Sets", description: "Object/field permissions, system permissions, tab settings, app access.", status: "required" },
          { id: "manual-sharing", title: "Manual Sharing & Teams", description: "Record-level sharing, account teams, opportunity teams, case teams.", status: "recommended" },
          { id: "audit-trail", title: "Audit Trail & Monitoring", description: "Setup audit trail, field audit trail, event monitoring, debug logs.", status: "recommended" },
        ],
      },
      {
        id: "automation-admin",
        title: "Automation",
        subtitle: "Automate business processes without code",
        columns: 3,
        nodes: [
          { id: "flow-builder", title: "Flow Builder", description: "Screen flows, record-triggered flows, scheduled flows, autolaunched flows.", status: "required" },
          { id: "approval-processes", title: "Approval Processes", description: "Multi-step approvals, approval page layouts, email templates for approvals.", status: "required" },
          { id: "email-alerts", title: "Email Alerts & Outbound Msg", description: "Workflow email alerts, outbound messages, classic automation tools.", status: "recommended" },
          { id: "formula-fields", title: "Formula Fields & Rollups", description: "Cross-object formulas, rollup summary fields, VLOOKUP in formulas.", status: "required" },
        ],
      },
      {
        id: "reports-dashboards",
        title: "Reports & Dashboards",
        subtitle: "Turn data into actionable insights",
        columns: 3,
        nodes: [
          { id: "report-types", title: "Report Types", description: "Tabular, summary, matrix, joined reports — when and how to use each.", status: "required" },
          { id: "custom-report-types", title: "Custom Report Types", description: "Create CRTs for objects without standard reports, defining relationships.", status: "required" },
          { id: "dashboards-admin", title: "Dashboards", description: "Dashboard components, dynamic dashboards, scheduling and subscriptions.", status: "required" },
          { id: "analytics-basics", title: "CRM Analytics Basics", description: "Einstein Analytics overview, datasets, lenses, basic dashboard building.", status: "optional" },
        ],
      },
      {
        id: "sales-service",
        title: "Sales & Service Cloud Basics",
        subtitle: "Core CRM feature administration",
        columns: 3,
        nodes: [
          { id: "sales-cloud-admin", title: "Sales Cloud Features", description: "Lead conversion, opportunity stages, forecasting, products & price books.", status: "required" },
          { id: "service-cloud-admin", title: "Service Cloud Features", description: "Cases, queues, assignment rules, escalation rules, Omni-Channel basics.", status: "required" },
          { id: "email-to-case", title: "Email-to-Case & Web-to-Lead", description: "Automated case creation from email, web-to-lead forms, spam filters.", status: "recommended" },
          { id: "knowledge", title: "Salesforce Knowledge", description: "Article types, data categories, publishing workflows, knowledge-centered support.", status: "optional" },
        ],
      },
    ],
  },
  {
    id: "architect",
    title: "Salesforce Architect",
    badge: "System / Solution / Technical Architect",
    description: "Design scalable, secure enterprise-grade Salesforce solutions across clouds and integrations.",
    color: "text-violet-400",
    bgGradient: "from-violet-500/10 to-transparent",
    borderColor: "border-violet-500/30",
    icon: Layers,
    phases: [
      {
        id: "architect-foundation",
        title: "Architecture Foundations",
        subtitle: "Principles every Salesforce architect must master",
        columns: 3,
        nodes: [
          { id: "enterprise-arch", title: "Enterprise Architecture Patterns", description: "SOA, event-driven architecture, microservices, layered architecture applied to Salesforce.", status: "required" },
          { id: "scalability", title: "Scalability & Performance", description: "Large data volumes (LDV), skinny tables, query optimization, deferring index updates.", status: "required" },
          { id: "multi-org", title: "Multi-Org Strategy", description: "When to use one vs many orgs, hub-and-spoke, org splits, Salesforce to Salesforce.", status: "required" },
          { id: "limits-arch", title: "Platform Limits Deep Dive", description: "API limits, async limits, storage limits — architectural implications.", status: "required" },
        ],
      },
      {
        id: "data-arch",
        title: "Data Architecture",
        subtitle: "Designing robust data models at enterprise scale",
        columns: 3,
        nodes: [
          { id: "data-modeling-arch", title: "Advanced Data Modeling", description: "Domain modeling, normalization vs denormalization for Salesforce, custom metadata types.", status: "required" },
          { id: "ldv", title: "Large Data Volumes", description: "Skewed ownership, skinny tables, deterministic field encryption, archiving strategies.", status: "required" },
          { id: "master-data", title: "Master Data Management", description: "Golden record strategy, deduplication, data stewardship, MDM tools.", status: "recommended" },
          { id: "data-migration", title: "Data Migration Architecture", description: "ETL patterns, bulk API, upsert strategies, rollback plans.", status: "required" },
          { id: "custom-metadata", title: "Custom Metadata & Settings", description: "CMT vs Custom Settings vs Custom Objects — trade-offs and use cases.", status: "recommended" },
        ],
      },
      {
        id: "integration-arch",
        title: "Integration Architecture",
        subtitle: "Enterprise integration patterns and technology choices",
        columns: 3,
        nodes: [
          { id: "eip", title: "Enterprise Integration Patterns", description: "Message bus, pub/sub, request/reply, event sourcing, saga pattern.", status: "required" },
          { id: "api-arch", title: "API Design & Management", description: "REST vs SOAP vs GraphQL, API versioning, rate limiting, API gateway.", status: "required" },
          { id: "mulesoft-arch", title: "MuleSoft Architecture", description: "Anypoint platform, 3-layer architecture (Experience/Process/System APIs), CloudHub.", status: "recommended" },
          { id: "platform-events-arch", title: "Event-Driven Architecture", description: "Platform Events, Change Data Capture, Pub/Sub API, Streaming API.", status: "required" },
          { id: "heroku", title: "Heroku & External Services", description: "Heroku Connect, Heroku dyno architecture, External Objects (Salesforce Connect).", status: "optional" },
        ],
      },
      {
        id: "security-arch",
        title: "Security Architecture",
        subtitle: "Designing secure solutions at every layer",
        columns: 3,
        nodes: [
          { id: "identity", title: "Identity & Access Management", description: "SSO (SAML, OIDC), Identity Provider vs Service Provider, Just-in-Time provisioning.", status: "required" },
          { id: "oauth-flows", title: "OAuth 2.0 Flows", description: "Web server, user-agent, device, JWT bearer — choosing the right flow.", status: "required" },
          { id: "encryption", title: "Data Encryption", description: "Shield Platform Encryption, field encryption, key management, bring your own key.", status: "required" },
          { id: "compliance", title: "Compliance & Privacy", description: "GDPR, data residency, individual consent, Data Mask in sandboxes.", status: "recommended" },
        ],
      },
      {
        id: "solution-design",
        title: "Solution Design & Governance",
        subtitle: "Delivering and governing enterprise solutions",
        columns: 3,
        nodes: [
          { id: "design-reviews", title: "Architecture Review Process", description: "Design documents, Architecture Review Board, decision frameworks.", status: "required" },
          { id: "technical-debt", title: "Technical Debt Management", description: "Identifying org cruft, refactoring strategies, incremental modernization.", status: "recommended" },
          { id: "coe", title: "Center of Excellence (CoE)", description: "Governance frameworks, naming conventions, org standards, CMDB.", status: "recommended" },
          { id: "release-management", title: "Release Management", description: "Deployment strategies, feature flags, blue-green deployments, rollback plans.", status: "required" },
        ],
      },
    ],
  },
  {
    id: "app-builder",
    title: "Platform App Builder",
    badge: "Platform App Builder Cert",
    description: "Build custom apps on Salesforce using declarative tools — Flows, custom objects, and Lightning pages.",
    color: "text-amber-400",
    bgGradient: "from-amber-500/10 to-transparent",
    borderColor: "border-amber-500/30",
    icon: Cpu,
    phases: [
      {
        id: "declarative-fundamentals",
        title: "Declarative Development Fundamentals",
        subtitle: "Build apps without writing code",
        columns: 3,
        nodes: [
          { id: "custom-objects-pab", title: "Custom Objects & Fields", description: "When to create custom objects, field types, required fields, external IDs.", status: "required" },
          { id: "page-layouts", title: "Page Layouts & Record Types", description: "Layout assignment by profile/record type, compact layouts, related lists.", status: "required" },
          { id: "formula-pab", title: "Formula Fields", description: "Cross-object formulas, date/time functions, IF/CASE logic, text formulas.", status: "required" },
          { id: "rollup-pab", title: "Roll-Up Summary Fields", description: "COUNT, SUM, MIN, MAX across master-detail relationships.", status: "required" },
        ],
      },
      {
        id: "flow-pab",
        title: "Flow Builder Mastery",
        subtitle: "The cornerstone of declarative automation",
        columns: 3,
        nodes: [
          { id: "record-triggered-flow", title: "Record-Triggered Flows", description: "Before/after save, update triggering record, run asynchronously.", status: "required" },
          { id: "screen-flow", title: "Screen Flows", description: "Screen components, navigation, conditional visibility, embedded in pages.", status: "required" },
          { id: "scheduled-flow", title: "Scheduled & Autolaunched Flows", description: "Time-based automation, batch processing without Apex.", status: "required" },
          { id: "flow-subflows", title: "Subflows & Reusability", description: "Extract common logic, call one flow from another, maintain flow library.", status: "recommended" },
          { id: "flow-debugging", title: "Flow Debugging", description: "Debug logs for flows, run-as-user, flow errors & fault paths.", status: "required" },
          { id: "flow-best-practices", title: "Flow Best Practices", description: "Bulkification in flows, avoiding recursion, governor limits with flows.", status: "required" },
        ],
      },
      {
        id: "lightning-pab",
        title: "Lightning Experience & App Building",
        subtitle: "Create engaging UX with declarative tools",
        columns: 3,
        nodes: [
          { id: "app-manager", title: "App Manager", description: "Custom apps, Lightning app configuration, utility bar, navigation items.", status: "required" },
          { id: "lightning-pages", title: "Lightning Pages", description: "App/record/home pages, Lightning App Builder, component visibility rules.", status: "required" },
          { id: "dynamic-forms", title: "Dynamic Forms & Actions", description: "Dynamic forms on record pages, conditional sections, quick actions.", status: "required" },
          { id: "list-views", title: "List Views & Search", description: "Custom list views, sharing, global search configuration.", status: "recommended" },
        ],
      },
      {
        id: "reports-pab",
        title: "Reports, Dashboards & Analytics",
        subtitle: "Surface insights from your data",
        columns: 3,
        nodes: [
          { id: "report-builder", title: "Report Builder", description: "Creating/editing summary/matrix reports, groupings, conditional highlighting.", status: "required" },
          { id: "dashboard-builder", title: "Dashboard Builder", description: "Widget types, dynamic dashboards, scheduling, mobile dashboards.", status: "required" },
          { id: "analytics-pab", title: "CRM Analytics (Einstein)", description: "Datasets, lenses, dashboards — connecting analytics to action.", status: "optional" },
        ],
      },
    ],
  },
  {
    id: "consultant",
    title: "Sales/Service Cloud Consultant",
    badge: "Sales Cloud & Service Cloud Consultant",
    description: "Implement CRM best practices, manage the sales and support lifecycle, and drive customer success.",
    color: "text-rose-400",
    bgGradient: "from-rose-500/10 to-transparent",
    borderColor: "border-rose-500/30",
    icon: BarChart3,
    phases: [
      {
        id: "business-analysis",
        title: "Business Analysis & Requirements",
        subtitle: "Understand the business before you configure",
        columns: 3,
        nodes: [
          { id: "requirements-gathering", title: "Requirements Gathering", description: "Stakeholder interviews, user stories, process mapping, gap analysis.", status: "required" },
          { id: "use-cases", title: "Use Case Documentation", description: "Functional specs, wireframes, acceptance criteria, traceability matrix.", status: "required" },
          { id: "change-management", title: "Change Management", description: "Driving user adoption, training plans, communication strategies.", status: "recommended" },
        ],
      },
      {
        id: "sales-cloud",
        title: "Sales Cloud Implementation",
        subtitle: "CRM for the sales team",
        columns: 3,
        nodes: [
          { id: "lead-management", title: "Lead & Opportunity Management", description: "Lead process, conversion rules, opportunity stages, sales methodology alignment.", status: "required" },
          { id: "forecasting", title: "Forecasting", description: "Forecast categories, collaborative forecasting, territory management.", status: "required" },
          { id: "products-pricing", title: "Products, Quotes & CPQ", description: "Price books, products, quotes, contracts, Salesforce CPQ basics.", status: "required" },
          { id: "partner-community", title: "Partner & Customer Portals", description: "Experience Cloud for partners, community setup, portal user licenses.", status: "recommended" },
          { id: "territory-mgmt", title: "Territory Management", description: "Territory model, rules, assignment, hierarchy.", status: "recommended" },
        ],
      },
      {
        id: "service-cloud",
        title: "Service Cloud Implementation",
        subtitle: "CRM for the support team",
        columns: 3,
        nodes: [
          { id: "case-management", title: "Case Management", description: "Case lifecycle, queues, assignment rules, escalation rules, case teams.", status: "required" },
          { id: "omni-channel", title: "Omni-Channel & Routing", description: "Service channels, routing configs, queues vs skills-based routing, agent capacity.", status: "required" },
          { id: "knowledge-impl", title: "Knowledge Management", description: "Article types, data categories, KCS implementation, Lightning Knowledge.", status: "recommended" },
          { id: "service-console", title: "Service Console", description: "Console layout, keyboard shortcuts, macros, utility bar, split view.", status: "required" },
          { id: "entitlements", title: "Entitlements & SLAs", description: "Entitlement process, milestones, SLA management.", status: "recommended" },
          { id: "field-service", title: "Field Service Basics", description: "Work orders, service resources, territories, appointment scheduling.", status: "optional" },
        ],
      },
      {
        id: "implementation-methodology",
        title: "Implementation Methodology",
        subtitle: "Successfully delivering Salesforce projects",
        columns: 3,
        nodes: [
          { id: "project-mgmt", title: "Project Management Basics", description: "Agile vs waterfall for Salesforce, sprint planning, backlog grooming.", status: "required" },
          { id: "uat", title: "User Acceptance Testing", description: "Test scripts, bug tracking, test environments, sign-off process.", status: "required" },
          { id: "go-live", title: "Go-Live & Hypercare", description: "Cutover planning, data migration go-live, hypercare support, lessons learned.", status: "required" },
          { id: "post-deployment", title: "Post-Deployment Support", description: "Monitoring, user feedback, iterative enhancements, adoption metrics.", status: "recommended" },
        ],
      },
    ],
  },
  {
    id: "devops",
    title: "Salesforce DevOps Engineer",
    badge: "DevOps & Deployment Specialist",
    description: "Build CI/CD pipelines, automate deployments, and govern the full Salesforce release process.",
    color: "text-teal-400",
    bgGradient: "from-teal-500/10 to-transparent",
    borderColor: "border-teal-500/30",
    icon: GitBranch,
    phases: [
      {
        id: "source-control",
        title: "Source Control for Salesforce",
        subtitle: "Git-based development at the heart of Salesforce DevOps",
        columns: 3,
        nodes: [
          { id: "git-sf", title: "Git Fundamentals for Salesforce", description: "Branching strategies: gitflow, trunk-based, release branches. Resolving metadata merge conflicts.", status: "required" },
          { id: "sfdx-project", title: "SFDX Project Structure", description: "sfdx-project.json, package directories, source format vs metadata API format.", status: "required" },
          { id: "gitignore-sf", title: ".gitignore & .forceignore", description: "What to exclude: profiles, destructive changes, environment-specific config.", status: "required" },
          { id: "pr-strategy", title: "Pull Request Strategy", description: "Code review for Apex/LWC, automated checks on PR, reviewer guidelines.", status: "recommended" },
        ],
      },
      {
        id: "ci-cd-sf",
        title: "CI/CD Pipeline Design",
        subtitle: "Automate build, test, and deploy for Salesforce",
        columns: 3,
        nodes: [
          { id: "github-actions-sf", title: "GitHub Actions for Salesforce", description: "SFDX deploy workflows, authentication via JWT, deployment check runs.", status: "required" },
          { id: "auth-ci", title: "CI Authentication", description: "JWT Bearer Flow for CI, connected app setup, certificate management.", status: "required" },
          { id: "validate-deploy", title: "Validate vs Deploy", description: "checkOnly deploys, quick deploys, deploying only changed metadata.", status: "required" },
          { id: "apex-test-ci", title: "Apex Test Execution in CI", description: "RunLocalTests vs RunAllTestsInOrg, test class selection strategies, code coverage gates.", status: "required" },
          { id: "delta-deployment", title: "Delta Deployments", description: "sfdx-git-delta, deploying only changed components, destructive changes.", status: "recommended" },
        ],
      },
      {
        id: "environments",
        title: "Environment Strategy",
        subtitle: "Managing the Salesforce org landscape",
        columns: 3,
        nodes: [
          { id: "sandbox-strategy", title: "Sandbox Strategy", description: "Matching sandbox types to stages: Dev → Dev Pro → Partial → Full → Prod.", status: "required" },
          { id: "scratch-orgs", title: "Scratch Orgs", description: "Shape-based scratch orgs, org definition files, pool management.", status: "recommended" },
          { id: "env-variables", title: "Environment-Specific Config", description: "Custom settings/metadata for per-environment config, Named Credential per org.", status: "required" },
          { id: "data-management-devops", title: "Test Data Management", description: "SFDMU for data seeding, anonymization tools, data templates.", status: "recommended" },
        ],
      },
      {
        id: "quality-gates",
        title: "Quality Gates & Testing",
        subtitle: "Enforcing code quality automatically",
        columns: 3,
        nodes: [
          { id: "pmd-apex", title: "PMD for Apex", description: "Static analysis rules, integrating PMD in CI pipeline, custom rulesets.", status: "required" },
          { id: "prettier-sf", title: "Prettier + ESLint for LWC", description: "Consistent code formatting, ESLint rules for LWC, pre-commit hooks.", status: "required" },
          { id: "code-coverage", title: "Code Coverage Strategy", description: "75% floor isn't enough — meaningful test coverage, integration tests.", status: "required" },
          { id: "e2e-sf", title: "E2E Testing with Selenium/Provar", description: "UI automation for regression testing, Provar test suites, LWC Jest tests.", status: "recommended" },
        ],
      },
      {
        id: "devops-tools",
        title: "DevOps Tooling Ecosystem",
        subtitle: "Tools that accelerate Salesforce delivery",
        columns: 3,
        nodes: [
          { id: "copado", title: "Copado", description: "Pipeline configuration, user stories, compliance, back-promotion.", status: "optional" },
          { id: "gearset", title: "Gearset", description: "Comparison UI, automated deployments, pipeline branches, monitoring.", status: "optional" },
          { id: "flosum", title: "Flosum / Prodly", description: "Native Salesforce-based DevOps, configuration migration.", status: "optional" },
          { id: "devops-center", title: "Salesforce DevOps Center", description: "Native Salesforce DevOps, work items, pipelines, GitHub integration.", status: "recommended" },
          { id: "monitoring-sf", title: "Monitoring & Alerting", description: "Event Monitoring, Field Audit Trail, Real-Time Event Monitoring, Splunk integration.", status: "recommended" },
        ],
      },
    ],
  },
];

const STATUS_CONFIG: Record<NodeStatus, { label: string; className: string; dotClass: string }> = {
  required: {
    label: "Required",
    className: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    dotClass: "bg-cyan-400",
  },
  recommended: {
    label: "Good to Know",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    dotClass: "bg-amber-400",
  },
  optional: {
    label: "Optional",
    className: "bg-white/5 text-muted-foreground border-white/10",
    dotClass: "bg-muted-foreground",
  },
};

function NodeCard({
  node,
  roadmapId,
  roadmapTitle,
}: {
  node: RoadmapNode;
  roadmapId: string;
  roadmapTitle: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [, navigate] = useLocation();
  const cfg = STATUS_CONFIG[node.status];

  function openArticle(e: React.MouseEvent) {
    e.stopPropagation();
    const params = new URLSearchParams({
      topic: node.title,
      roadmap: roadmapId,
      roadmapTitle,
    });
    navigate(`/roadmap/article/${node.id}?${params.toString()}`);
  }

  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border bg-card/60 backdrop-blur-sm cursor-pointer transition-all duration-200 group relative overflow-hidden",
        expanded ? "border-white/15 bg-card/80" : "border-white/5 hover:border-white/10 hover:bg-card/80",
      )}
      onClick={() => setExpanded(!expanded)}
      whileHover={{ y: -1 }}
    >
      <div className={cn(
        "absolute top-0 left-0 w-full h-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
        node.status === "required" ? "bg-gradient-to-r from-cyan-500 to-teal-500"
          : node.status === "recommended" ? "bg-gradient-to-r from-amber-500 to-orange-500"
          : "bg-gradient-to-r from-white/20 to-white/10"
      )} />
      <div className="p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-sm font-semibold font-display leading-snug group-hover:text-foreground transition-colors">
            {node.title}
          </h4>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn("hidden sm:inline-flex items-center gap-1 text-[9px] font-mono font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded border", cfg.className)}>
              <span className={cn("w-1 h-1 rounded-full", cfg.dotClass)} />
              {cfg.label}
            </span>
            {expanded
              ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            }
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                {node.description}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40"
                  variant="ghost"
                  onClick={openArticle}
                >
                  <Sparkles className="w-3 h-3" />
                  Read Full Article
                </Button>
                {node.problemLink && (
                  <Link
                    href={node.problemLink}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <BookOpen className="w-3 h-3" />
                    Practice problems
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!expanded && (
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            {node.description}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function PhaseBlock({
  phase,
  color,
  roadmapId,
  roadmapTitle,
}: {
  phase: RoadmapPhase;
  color: string;
  roadmapId: string;
  roadmapTitle: string;
}) {
  const cols = phase.columns ?? 3;
  const gridClass =
    cols === 2 ? "grid-cols-1 sm:grid-cols-2"
    : cols === 4 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="relative">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-start gap-3">
            <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", color.replace("text-", "bg-"))} />
            <div>
              <h3 className="font-bold text-sm sm:text-base font-display">{phase.title}</h3>
              {phase.subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{phase.subtitle}</p>
              )}
            </div>
          </div>
        </div>
        <div className={cn("grid gap-3 p-4 sm:p-6", gridClass)}>
          {phase.nodes.map((node) => (
            <NodeCard key={node.id} node={node} roadmapId={roadmapId} roadmapTitle={roadmapTitle} />
          ))}
        </div>
      </div>

      <div className="flex justify-center mt-0">
        <div className="w-0.5 h-6 bg-gradient-to-b from-white/10 to-transparent last:hidden" />
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  const [activeRoadmap, setActiveRoadmap] = useState<string>("developer");

  const current = ROADMAPS.find((r) => r.id === activeRoadmap) ?? ROADMAPS[0];
  const Icon = current.icon;

  const totalNodes = current.phases.reduce((sum, p) => sum + p.nodes.length, 0);
  const requiredCount = current.phases.reduce(
    (sum, p) => sum + p.nodes.filter((n) => n.status === "required").length, 0
  );

  return (
    <PageWrapper>
      <div className="container max-w-screen-xl px-4 md:px-6 mx-auto py-8 sm:py-12">

        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest">
            Salesforce Career Roadmaps
          </Badge>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-display mb-2">
            Choose Your Path
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
            Visual, step-by-step learning roadmaps for every major Salesforce designation. Click any topic to expand it.
          </p>
        </div>

        <div className="flex flex-col xl:flex-row gap-6 lg:gap-8">

          {/* Sidebar — role selector */}
          <aside className="xl:w-72 shrink-0">
            <div className="xl:sticky xl:top-20 space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3 px-1">
                Designations
              </p>
              {ROADMAPS.map((rm) => {
                const RmIcon = rm.icon;
                const isActive = rm.id === activeRoadmap;
                return (
                  <button
                    key={rm.id}
                    onClick={() => setActiveRoadmap(rm.id)}
                    className={cn(
                      "w-full text-left rounded-xl border p-3.5 sm:p-4 transition-all duration-200 group",
                      isActive
                        ? `${rm.borderColor} bg-white/[0.03]`
                        : "border-white/5 hover:border-white/10 hover:bg-white/[0.02]",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        isActive ? `${rm.bgGradient.replace("from-", "bg-").replace("/10", "/15").split(" ")[0]} border ${rm.borderColor}` : "bg-white/5 border border-white/5"
                      )}>
                        <RmIcon className={cn("w-4 h-4", isActive ? rm.color : "text-muted-foreground")} />
                      </div>
                      <div className="min-w-0">
                        <div className={cn("text-sm font-semibold font-display truncate transition-colors", isActive ? rm.color : "text-foreground")}>
                          {rm.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">
                          {rm.badge}
                        </div>
                      </div>
                      {isActive && <ArrowRight className={cn("w-3.5 h-3.5 shrink-0 ml-auto", rm.color)} />}
                    </div>
                  </button>
                );
              })}

              {/* Legend */}
              <div className="mt-6 p-4 rounded-xl border border-white/5 bg-white/[0.015] space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Legend</p>
                {(Object.entries(STATUS_CONFIG) as [NodeStatus, (typeof STATUS_CONFIG)[NodeStatus]][]).map(([, cfg]) => (
                  <div key={cfg.label} className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dotClass)} />
                    <span className="text-xs text-muted-foreground">{cfg.label}</span>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground pt-2 border-t border-white/5">
                  Click any node to expand details.
                </p>
              </div>
            </div>
          </aside>

          {/* Main roadmap content */}
          <main className="flex-1 min-w-0">
            {/* Roadmap header */}
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className={cn("rounded-2xl border p-5 sm:p-6 mb-6 bg-gradient-to-br to-transparent", current.borderColor, current.bgGradient)}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border shrink-0", current.borderColor, current.bgGradient.replace("from-", "bg-").split(" ")[0])}>
                    <Icon className={cn("w-6 h-6", current.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="text-lg sm:text-2xl font-extrabold font-display">{current.title}</h2>
                      <Badge variant="outline" className={cn("text-[10px] font-mono", current.borderColor, current.color, "bg-transparent")}>
                        {current.badge}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{current.description}</p>
                  </div>
                  <div className="flex gap-4 sm:gap-6 shrink-0">
                    <div className="text-center">
                      <div className={cn("text-xl font-extrabold font-mono", current.color)}>{totalNodes}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Topics</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-extrabold font-mono text-cyan-400">{requiredCount}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Required</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-extrabold font-mono text-foreground">{current.phases.length}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Phases</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phase blocks */}
              <div className="space-y-3">
                {current.phases.map((phase, idx) => (
                  <motion.div
                    key={phase.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                  >
                    <PhaseBlock phase={phase} color={current.color} roadmapId={current.id} roadmapTitle={current.title} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </main>
        </div>
      </div>
    </PageWrapper>
  );
}
