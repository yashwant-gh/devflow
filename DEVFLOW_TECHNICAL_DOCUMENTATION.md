# DevFlow: Complete Codebase Architecture & Developer Knowledge Documentation

> **Build smarter. Standardize everything. Ship with confidence.**
>
> A technical manual, architectural blueprint, and developer interview preparation guide for the DevFlow developer productivity and DevEx platform.

---

## Table of Contents

1. [Executive Overview & System Architecture](#1-executive-overview--system-architecture)
   - [What DevFlow Is and What Problem It Solves](#what-devflow-is-and-what-problem-it-solves)
   - [Design Philosophy and Core Invariants](#design-philosophy-and-core-invariants)
   - [System Architecture Diagram (Mermaid)](#system-architecture-diagram)
   - [CLI Pipeline and Request-Response Lifecycle](#cli-pipeline-and-request-response-lifecycle)
   - [Inter-Module Communication and Architectural Patterns](#inter-module-communication-and-architectural-patterns)
   - [Error Handling Pipeline and Sanitization](#error-handling-pipeline-and-sanitization)
2. [Deep-Dive Module Documentation](#2-deep-dive-module-documentation)
   - [2.1 CLI Layer (`src/cli/index.ts`, `src/cli/program.ts`)](#21-cli-layer)
   - [2.2 Command Registration (`src/cli/register-commands.ts` & `commands/`)](#22-command-registration)
   - [2.3 Template Engine & Scaffolding (`src/core/template-engine.ts`)](#23-template-engine--scaffolding)
   - [2.4 Safe File Manager (`src/core/file-manager.ts`)](#24-safe-file-manager)
   - [2.5 Subprocess Command Runner (`src/core/command-runner.ts`)](#25-subprocess-command-runner)
   - [2.6 Configuration Manager (`src/core/configuration-manager.ts`)](#26-configuration-manager)
   - [2.7 Project Detector (`src/core/project-detector.ts`)](#27-project-detector)
   - [2.8 Dependency Audit Engine (`src/modules/dependency-audit/audit-service.ts`)](#28-dependency-audit-engine)
   - [2.9 Docker Infrastructure Engine (`src/modules/docker/docker-service.ts`)](#29-docker-infrastructure-engine)
   - [2.10 CI/CD Automation Engine (`src/modules/cicd/cicd-service.ts`)](#210-cicd-automation-engine)
   - [2.11 Environment Diagnostics (`src/modules/diagnostics/doctor-service.ts`)](#211-environment-diagnostics)
   - [2.12 Standards Compliance Engine (`src/modules/standards/standards-service.ts`, `rules.ts`)](#212-standards-compliance-engine)
   - [2.13 Git & PR Intelligence (`src/modules/git-integration/git-service.ts`)](#213-git--pr-intelligence)
   - [2.14 Documentation Engine (`src/modules/documentation/docs-service.ts`)](#214-documentation-engine)
   - [2.15 Privacy-Preserving AI Assistant (`src/modules/ai-assistant/ai-service.ts`)](#215-privacy-preserving-ai-assistant)
   - [2.16 Quality Gate & Health Service (`src/modules/quality-check/`)](#216-quality-gate--health-service)
   - [2.17 Cross-Cutting Utilities (`src/utils/`)](#217-cross-cutting-utilities)
3. [Source-Code Execution Flows](#3-source-code-execution-flows)
   - [Flow A: Project Scaffolding (`devflow init my-project`)](#flow-a-project-scaffolding-devflow-init-my-project)
   - [Flow B: Security Vulnerability Audit (`devflow audit`)](#flow-b-security-vulnerability-audit-devflow-audit)
   - [Flow C: Docker Infrastructure Validation (`devflow docker validate`)](#flow-c-docker-infrastructure-validation-devflow-docker-validate)
   - [Flow D: CI/CD Pipeline Initialization (`devflow ci init`)](#flow-d-cicd-pipeline-initialization-devflow-ci-init)
   - [Flow E: Environment Diagnostics (`devflow doctor`)](#flow-e-environment-diagnostics-devflow-doctor)
4. [Technical Concepts Behind DevFlow](#4-technical-concepts-behind-devflow)
5. [Testing Architecture & Test Distribution](#5-testing-architecture--test-distribution)
6. [Comprehensive Technical Interview Preparation](#6-comprehensive-technical-interview-preparation)
   - [6.1 Project-Specific Architecture & Implementation (40 Questions)](#61-project-specific-questions)
   - [6.2 Node.js Runtime & TypeScript Internals (30 Questions)](#62-nodejs--typescript-questions)
   - [6.3 Software Architecture & Design Patterns (20 Questions)](#63-software-architecture-questions)
   - [6.4 Operating Systems & Process Execution (20 Questions)](#64-os--process-execution-questions)
   - [6.5 Networking & Package Registries (20 Questions)](#65-networking-questions)
   - [6.6 Testing & Debugging Methodologies (20 Questions)](#66-testing--debugging-questions)
   - [6.7 Application Security & Dependency Trust (20 Questions)](#67-security-questions)
   - [6.8 DevOps, Docker & CI/CD Engineering (20 Questions)](#68-devops-docker--cicd-questions)
7. [Project Limitations & Interview Guardrails](#7-project-limitations--interview-guardrails)
8. [Recommended Codebase Reading Order](#8-recommended-codebase-reading-order)

---

## 1. Executive Overview & System Architecture

### What DevFlow Is and What Problem It Solves

Modern software engineering organizations suffer from significant friction during project creation, environment configuration, and quality enforcement:
1. **Tooling Fragmentation:** Every engineer configures TypeScript, ESLint, Prettier, Vitest, Docker, and GitHub Actions differently, leading to inconsistent development environments.
2. **"Works on My Machine" Syndrome:** Developers commit code that fails on remote continuous integration runners because local environment diagnostics are ad-hoc or unverified.
3. **Deceptive Dependency Audits:** Raw package manager audits (such as `npm audit`) frequently report confusing remediation guidance—suggesting updates for top-level packages that developers misinterpret as fixes for nested transitive dependencies.
4. **Configuration Drift:** Repositories gradually diverge from organizational engineering standards when compliance checks are not automated locally.

**DevFlow** is a developer productivity, workflow automation, and Developer Experience (DevEx) command-line interface (CLI) platform built in strict TypeScript on Node.js. It standardizes project setup via parameterizable templates, executes atomic multi-stage scaffolding, validates development environment readiness, audits dependencies with lockfile awareness, generates hardened GitHub Actions workflows, evaluates compliance against organizational rules, and provides privacy-preserving offline developer assistance.

### Design Philosophy and Core Invariants

DevFlow adheres to five core operational invariants:
- **Truthful Operational Execution:** Every command executes actual operations against the filesystem, subprocesses, or network. There are no placeholder commands, fake spinners, or simulated mock outputs.
- **Fail-Safe Filesystem Operations:** Operations that write files enforce atomic temporary file staging, lexical path containment checks, and automatic rollback of newly created files on failure. Existing files are not overwritten without explicit permission (`--force`).
- **Subprocess Safety:** External process invocation avoids raw shell execution (`shell: false` by default in `CommandRunner`), preventing shell injection attacks across Windows, macOS, and Linux.
- **Lockfile-Aware Version Resolution:** Vulnerability audits inspect `package-lock.json` packages and disk structures directly to distinguish direct from transitive vulnerabilities, preventing version-inversion reporting.
- **Privacy-Preserving Assistance:** The built-in AI assistant uses an offline rule-based deterministic fallback engine by default, ensuring that source code and tokens are not transmitted to external APIs unless explicitly configured.

---

### System Architecture Diagram

```mermaid
flowchart TD
    subgraph UserInterface ["CLI User Interface Layer"]
        CLI_BIN["CLI Binary Entry (bin/devflow, src/cli/index.ts)"]
        PROG["Commander Program Definition (src/cli/program.ts)"]
        REG["Command Registry (src/cli/register-commands.ts)"]
        CMDS["CLI Command Handlers (src/cli/commands/*.command.ts)"]
        CLI_BIN --> PROG --> REG --> CMDS
    end

    subgraph CoreEngine ["Core Infrastructure Engine"]
        CR["CommandRunner (Subprocess Management & Execution)"]
        FM["FileManager (Atomic File I/O & Rollback)"]
        CM["ConfigurationManager (Zod Schema & Hierarchy)"]
        PD["ProjectDetector (Ecosystem & Runtime Inspection)"]
        TE["TemplateEngine (Handlebars Scaffolding Pipeline)"]
    end

    subgraph DomainModules ["Feature Domain Modules"]
        M_AUDIT["AuditService (Vulnerability & Lockfile Engine)"]
        M_DOCKER["DockerService (Instruction Checks, Daemon & Builds)"]
        M_CICD["CICDService (GitHub Actions Generation & Hardening)"]
        M_DOCTOR["DoctorService (Environment & Tool Diagnostics)"]
        M_STD["StandardsService & rules.ts (Rule Evaluation Engine)"]
        M_GIT["GitService (Commit/Diff Analyzer & PR Generator)"]
        M_DOCS["DocsService (Boundary-Guarded README Generator)"]
        M_AI["AIService (Failure Explanation & Architecture Insights)"]
        M_QUAL["QualityService & HealthService (Sequential Gates & Scoring)"]
    end

    subgraph ProviderAdapters ["Extensible Provider Adapters"]
        P_LOCAL["LocalRuleFallbackProvider (Offline Deterministic AI)"]
        P_OPENAI["OpenAIProvider (Cloud LLM API Adapter)"]
    end

    subgraph SystemUtils ["System & Safety Utilities"]
        U_ERR["DevFlowError Hierarchy (Structured Error & Context)"]
        U_LOG["Logger (Redaction, Chalk, Formatting & JSON)"]
        U_PATH["resolveSafePath (Lexical Path Traversal Guard)"]
        U_PLAT["Platform Utilities (OS, Architecture, CPU Cores)"]
    end

    CMDS --> DomainModules
    CMDS --> CoreEngine
    DomainModules --> CoreEngine
    DomainModules --> SystemUtils
    CoreEngine --> SystemUtils
    M_AI --> ProviderAdapters
```

---

### CLI Pipeline and Request-Response Lifecycle

1. **Bootstrap (`src/cli/index.ts`):**
   The CLI entry point executes `runCLI().catch(...)`. If a top-level unhandled error escapes, it prints the error and calls `process.exit(1)`.
2. **Program Definition & Global Options (`src/cli/program.ts`):**
   `createProgram()` initializes a Commander instance with flags: `--verbose`, `--quiet`, `--json`, `--no-interactive`, `-y, --yes`, `--dry-run`, and `--cwd <path>`.
3. **Dispatch & Command Handler (`src/cli/commands/*.command.ts`):**
   The matched command handler extracts global and command-specific options, verifies arguments, and calls the appropriate domain service.
4. **Execution & Contextual Guarding:**
   Domain services invoke core infrastructure components (`CommandRunner`, `FileManager`, `ProjectDetector`).
5. **Output Serialization:**
   - If `--json` is active, results are output via `logger.json()`, bypassing chalk colors and spinners.
   - If TTY is active, structured tables (`table`), chalk colors, and spinners (`ora`) provide human-readable output.
6. **Error Interception:**
   `runCLI()` intercepts errors in its top-level `try...catch` block. If the error is an instance of `DevFlowError`, it prints the formatted error message, displays `err.suggestion` (if present), and exits with `process.exit(err.exitCode)`. For unexpected errors, it exits with `ExitCode.GENERAL_FAILURE` (`1`).

---

### Inter-Module Communication and Architectural Patterns

DevFlow adopts a modular, layered CLI architecture:
- **Unidirectional Layering:** Core infrastructure (`FileManager`, `CommandRunner`) does not import domain feature modules. Domain modules import core services. CLI commands coordinate domain modules and core services.
- **Service Singletons:** Stateless services (`commandRunner`, `projectDetector`, `auditService`, `dockerService`, `cicdService`, `standardsService`) are exported as singleton instances. `FileManager` and `TemplateEngine` support constructor parameterization for directory scoping.
- **Provider Abstraction:** The AI module defines an `AIProvider` interface (`src/providers/ai/ai-provider.ts`). `AIService` selects between `LocalRuleFallbackProvider` (default) and `OpenAICompatibleProvider` based on user consent and environment configuration.
- **Rule Strategy Implementation:** In [`src/modules/standards/rules.ts`](src/modules/standards/rules.ts), rules implement the `StandardRule` interface with an `evaluate(context: RuleContext): Promise<StandardRuleResult>` method, representing a genuine Strategy/Rule pattern. In `QualityService`, checks are implemented as private sequential methods.

---

### Error Handling Pipeline and Sanitization

All anticipated errors inherit from `DevFlowError` in [`src/utils/errors.ts`](src/utils/errors.ts):

```mermaid
flowchart TD
    Error["Error (Native Node.js)"] --> DevFlowError["DevFlowError (name, message, code, suggestion, context)"]
    DevFlowError --> ValidationError["ValidationError (Input/Argument failure, exit 1)"]
    DevFlowError --> FilesystemError["FilesystemError (I/O, traversal, conflicts, exit 1)"]
    DevFlowError --> ProcessExecutionError["ProcessExecutionError (Command failures, exit codes, exit 1 or processExitCode)"]
    DevFlowError --> ConfigurationError["ConfigurationError (Zod schema, config syntax, exit 1)"]
    DevFlowError --> TemplateError["TemplateError (Scaffolding errors, missing assets, exit 1)"]
    DevFlowError --> DependencyError["DependencyError (Missing executables, exit 1)"]
    DevFlowError --> SecurityAuditError["SecurityAuditError (Policy threshold violations, exit 2)"]
    DevFlowError --> GitError["GitError (Git status, diff failures, exit 1)"]
```

Every `DevFlowError` carries:
- `code`: Machine-readable error code string (e.g. `ERR_PROCESS_EXECUTION`).
- `suggestion`: Optional human-readable remediation recommendation.
- `context`: Optional object containing debugging metadata (command, directory, exit code).
- `exitCode`: Integer process exit code (defaults to `1`, or `2` for `SecurityAuditError`).

**Log Sanitization:** All subprocess outputs pass through `logger.sanitize()` before being displayed or captured in error context. This regex-based redaction engine replaces GitHub Personal Access Tokens (`ghp_*`), npm tokens (`npm_*`), Authorization bearer headers, and URI query string tokens with `[REDACTED]`.

---

## 2. Deep-Dive Module Documentation

### 2.1 CLI Layer
- **Responsibility:** Bootstraps the Node.js process, builds the Commander program instance, handles global options, and executes top-level error trapping.
- **Key Files:** [`src/cli/index.ts`](src/cli/index.ts), [`src/cli/program.ts`](src/cli/program.ts).
- **Functions:**
  - `createProgram(): Command`: Constructs and configures the Commander instance, global options, and help formatting.
  - `runCLI(argv?: string[]): Promise<void>`: Parses arguments and catches `DevFlowError` or generic errors, exiting via `process.exit(code)`.
- **Error Handling:** `runCLI()` intercepts errors, formats suggestions, and exits with `err.exitCode`.
- **Relevant Tests:** [`tests/integration/cli.test.ts`](tests/integration/cli.test.ts).

---

### 2.2 Command Registration
- **Responsibility:** Maps terminal commands and subcommands to their action handlers and options.
- **Key Files:** [`src/cli/register-commands.ts`](src/cli/register-commands.ts), [`src/cli/commands/*.command.ts`](src/cli/commands/).
- **Function:** `registerAllCommands(program: Command, getGlobalOptions: () => GlobalOptions): void`: Registers commands across categories:
  - *Project Management:* `init`, `templates`
  - *Development Automation:* `add`, `check`, `test`, `lint`, `audit`
  - *Infrastructure:* `docker`, `ci`
  - *Developer Experience:* `doctor`, `docs`, `standards`, `pr`, `ai`
  - *System & Health:* `config`, `health`

---

### 2.3 Template Engine & Scaffolding
- **Responsibility:** Discovers bundled project templates, validates project names, renders Handlebars template files, and scaffolds projects into target directories with rollback support.
- **Key File:** [`src/core/template-engine.ts`](src/core/template-engine.ts).
- **Class:** `TemplateEngine` (exported singleton: `templateEngine`):
  - `getAvailableTemplates(): Promise<TemplateDefinition[]>`: Returns definitions for `node-express-api`, `python-fastapi`, and `node-cli`.
  - `validateProjectName(name: string): void`: Verifies naming against `^[a-zA-Z0-9_.-]+$`.
  - `scaffold(options: ScaffoldingOptions): Promise<ScaffoldingResult>`: Scaffolds template files into `options.targetDir`.
  - `registerHelpers(): void`: Registers Handlebars helpers (`eq`, `ne`, `and`, `or`, `not`, `lower`, `upper`, `kebab`).
- **Scaffolding Flow:**
  1. Validates project name.
  2. Checks if target directory exists and is non-empty; if so and `!options.overwrite`, throws `TemplateError`.
  3. Discovers template files via `fast-glob` ignoring `.map`, `.d.ts`, `dist`, and `node_modules`.
  4. Renders Handlebars placeholders and maps file paths (e.g. `gitignore.template` to `.gitignore`).
  5. Writes files using `FileManager.writeFile()`.
  6. On failure, catches error, invokes `fileManager.rollback()`, and rethrows.
- **Relevant Tests:** [`tests/unit/template-engine.test.ts`](tests/unit/template-engine.test.ts), [`tests/integration/scaffolding.test.ts`](tests/integration/scaffolding.test.ts).

---

### 2.4 Safe File Manager
- **Responsibility:** Boundary-checked, atomic file I/O operations with dry-run support, overwrite verification, and rollback tracking.
- **Key File:** [`src/core/file-manager.ts`](src/core/file-manager.ts).
- **Class:** `FileManager`:
  - `writeFile(targetRelativePath: string, content: string, options?: WriteFileOptions): Promise<FileOperationResult>`: Atomically writes via temporary sibling file (`.tmp.<timestamp>.<random>`) and `fs.rename()`.
  - `readFile(targetRelativePath: string): Promise<string>`: Reads file content at safe path.
  - `readJson<T>(targetRelativePath: string): Promise<T>`: Reads and parses JSON file.
  - `exists(targetRelativePath: string): Promise<boolean>`: Non-throwing existence check.
  - `ensureDir(targetRelativePath: string): Promise<void>`: Creates directory tree safely.
  - `rollback(): Promise<string[]>`: Deletes tracked newly created files in reverse order.
- **Path Traversal Protection:** Every method calls `resolveSafePath(this.baseDir, targetRelativePath)`. If the resolved target is outside `baseDir` via `..` or cross-drive path on Windows, `FilesystemError` is thrown.
- **Rollback Behavior & Limitations:** `rollback()` only removes files recorded in `this.createdFiles` (files where `!exists` was true before writing). If a pre-existing file is overwritten (`options.overwrite: true`), `FileManager` does not back up or restore the original content. If `fs.rename` fails during write, the temporary file is not automatically cleaned up in the catch block.
- **Relevant Tests:** [`tests/unit/file-manager.test.ts`](tests/unit/file-manager.test.ts), [`tests/unit/paths.test.ts`](tests/unit/paths.test.ts).

---

### 2.5 Subprocess Command Runner
- **Responsibility:** Spawns external binaries safely via `execa` without a system shell by default, enforcing execution timeouts and capturing stdout/stderr.
- **Key File:** [`src/core/command-runner.ts`](src/core/command-runner.ts).
- **Class:** `CommandRunner` (exported singleton: `commandRunner`):
  - `run(file: string, args?: string[], options?: CommandRunOptions): Promise<CommandRunResult>`: Executes external process.
  - `isExecutableAvailable(cmd: string): Promise<boolean>`: Checks executable presence via `where` on Windows and `which` on Unix.
- **Configuration & Execution Details:**
  - `shell: options.shell ?? false`: Arguments are passed directly as an array to `execa`, avoiding shell parsing.
  - `cwd`: Validates that `options.cwd` exists via `fs.pathExists()` before spawning; throws `ProcessExecutionError` if missing.
  - `timeout`: Default `60,000ms` (`DEFAULT_EXEC_TIMEOUT_MS`). When a command times out, throws `ProcessExecutionError` with exit code `124`.
  - `cleanup: true`: Direct child processes receive `SIGTERM` when the parent Node.js process exits. Note: Detached background grandchild processes are not terminated because process group signaling is not configured.
  - `allowFailure`: If `false` (default) and exit code is non-zero, throws `DependencyError` (if executable missing) or `ProcessExecutionError`. If `true`, returns `CommandRunResult` with actual exit code.
- **Relevant Tests:** [`tests/unit/command-runner.test.ts`](tests/unit/command-runner.test.ts).

---

### 2.6 Configuration Manager
- **Responsibility:** Discovers, loads, validates, and writes hierarchical DevFlow project configuration (`.devflowrc.json`).
- **Key File:** [`src/core/configuration-manager.ts`](src/core/configuration-manager.ts).
- **Class:** `ConfigurationManager` (exported singleton: `configurationManager`):
  - `loadConfig(cwd?: string): Promise<DevFlowConfig>`: Discovers configuration in current or parent directories and parses against Zod schema.
  - `validateConfig(raw: unknown): DevFlowConfig`: Validates object against `DevFlowConfigSchema` with defaults.
  - `writeConfig(config: Partial<DevFlowConfig>, cwd?: string): Promise<void>`: Writes configuration to `.devflowrc.json`.
- **Relevant Tests:** [`tests/unit/configuration-manager.test.ts`](tests/unit/configuration-manager.test.ts).

---

### 2.7 Project Detector
- **Responsibility:** Inspects workspace files to identify ecosystem type, package manager, and installed tooling.
- **Key File:** [`src/core/project-detector.ts`](src/core/project-detector.ts).
- **Class:** `ProjectDetector` (exported singleton: `projectDetector`):
  - `detect(cwd?: string): Promise<ProjectInfo>`: Returns project metadata:
    - `type`: `'node-api' | 'node-cli' | 'python-fastapi' | 'python-service' | 'unknown'`
    - Tooling flags: `hasGit`, `hasDocker`, `hasCompose`, `hasCI`, `hasEnv`, `hasTests`
    - Package manager: `'npm' | 'pnpm' | 'yarn' | 'pip' | 'poetry'`
- **Relevant Tests:** [`tests/unit/project-detector.test.ts`](tests/unit/project-detector.test.ts).

---

### 2.8 Dependency Audit Engine
- **Responsibility:** Analyzes project dependencies for known security vulnerabilities and outdated versions.
- **Key File:** [`src/modules/dependency-audit/audit-service.ts`](src/modules/dependency-audit/audit-service.ts).
- **Class:** `AuditService` (exported singleton: `auditService`):
  - `audit(options?: AuditOptions): Promise<SecurityAuditReport>`: Orchestrates Node or Python audit.
  - Node audit executes `npm audit --json` and `npm outdated --json`.
  - Python audit executes `pip-audit --format=json` or `safety check --json`.
- **Vulnerability Resolution Mechanics:**
  1. **Installed Version Resolution:** `resolveInstalledVersion(pkgName, nodes)` checks `vulnData.nodes` against the disk (`node_modules/.../package.json`) and the `packages` map in `package-lock.json` (npm v7+) or `dependencies` (npm v6).
  2. **Multiple Versions:** Collects unique versions in a `Set<string>` and formats them as a comma-separated list (e.g. `4.4.13, 6.1.0`).
  3. **Direct vs Transitive:** Checks whether `pkgName` exists in `package.json` dependencies or `devDepsSet`.
  4. **`fixAvailable` Interpretation:**
     - If `fixAvailable === true`: Sets `fixedVersion = null` and suggests `npm audit fix`.
     - If `fixAvailable === false`: Sets `fixedVersion = null` and suggests manual mitigation.
     - If `typeof fixAvailable === 'object'`:
       - If `fixAvailable.name === pkgName`: Direct fix. Sets `fixedVersion = fixVer`.
       - If `fixAvailable.name !== pkgName`: Transitive fix. Leaves `fixedVersion = null` (never attributes parent's version to the child) and recommends upgrading parent package `fixAvailable.name`.
  5. **Network / Lockfile Failure:** Detects missing lockfiles (`auditStatus = 'no_lockfile'`) and network failures (`auditStatus = 'network_error'`). In both cases, sets `policyPassed = false`.
- **Relevant Tests:** [`tests/unit/audit-service.test.ts`](tests/unit/audit-service.test.ts).

---

### 2.9 Docker Infrastructure Engine
- **Responsibility:** Scaffolds Dockerfiles and Docker Compose files, checks Dockerfile text instructions, validates Compose YAML, inspects daemon health, and executes image builds.
- **Key File:** [`src/modules/docker/docker-service.ts`](src/modules/docker/docker-service.ts).
- **Class:** `DockerService` (exported singleton: `dockerService`):
  - `generate(options?: DockerGeneratorOptions): Promise<FileOperationResult[]>`: Writes multi-stage `Dockerfile`, `.dockerignore`, and `docker-compose.yml` (with optional PostgreSQL/Redis).
  - `checkDockerStatus(): Promise<{ installed: boolean; daemonRunning: boolean; version?: string; error?: string }>`: Checks `commandRunner.isExecutableAvailable('docker')` and probes `docker version --format {{.Server.Version}}` with a 4s timeout.
  - `validate(cwd?: string): Promise<DockerValidationResult>`:
    - Inspects `Dockerfile` text to confirm presence of `FROM ` instruction and checks for non-root `USER`.
    - Parses `docker-compose.yml` using `YAML.parse()` to confirm valid YAML syntax and presence of `services`.
    - Returns status: `'running' | 'daemon_stopped' | 'not_installed' | 'invalid_config'`.
  - `buildImage(options?: { tag?: string; cwd?: string }): Promise<DockerBuildResult>`: Verifies Dockerfile and daemon health before running `docker build -t <tag> .`.
- **Relevant Tests:** [`tests/unit/docker-service.test.ts`](tests/unit/docker-service.test.ts).

---

### 2.10 CI/CD Automation Engine
- **Responsibility:** Generates GitHub Actions workflow configurations, validates YAML syntax and structural attributes, and applies idempotent updates.
- **Key File:** [`src/modules/cicd/cicd-service.ts`](src/modules/cicd/cicd-service.ts).
- **Class:** `CICDService` (exported singleton: `cicdService`):
  - `init(options?: CIOptions): Promise<FileOperationResult>`: Generates `.github/workflows/ci.yml`. Throws `ConfigurationError` if file exists and `!options.force`.
  - `update(options?: CIOptions): Promise<{ updated: boolean; diff?: string }>`: Compares existing workflow against newly generated content. If identical, returns `{ updated: false }`.
  - `validate(cwd?: string): Promise<CIValidationResult>`: Reads `.github/workflows/ci.yml`, parses YAML via `YAML.parse()`, and checks for `name`, `on`, `jobs`, and `permissions`.
- **Profiles:**
  - `standard`: Uses `@v4` / `@v5` action tags, runs checkout, node/python setup with dependency caching, `npm ci`, format check, lint, typecheck, test, build, and `npm audit --audit-level=high`.
  - `strict`: Pins actions to 40-character commit SHAs, sets `timeout-minutes: 10`, and sets audit level to `moderate`.
- **Supported Provider Limitation:** DevFlow implements generator logic exclusively for **GitHub Actions** (`.github/workflows/ci.yml`). GitLab CI is declared as a type option in `CIOptions`, but no GitLab generator implementation exists in the codebase.
- **Relevant Tests:** [`tests/unit/cicd-service.test.ts`](tests/unit/cicd-service.test.ts).

---

### 2.11 Environment Diagnostics
- **Responsibility:** Inspects developer workstation environment, installed binaries, runtime versions, and project prerequisites.
- **Key File:** [`src/modules/diagnostics/doctor-service.ts`](src/modules/diagnostics/doctor-service.ts).
- **Class:** `DoctorService` (exported singleton: `doctorService`):
  - `diagnose(cwd?: string): Promise<DoctorReport>`: Probes system details (`os`, `arch`, `cpus`), checks versions for `node`, `npm`, `git`, and `python` sequentially with 3s timeouts, queries `dockerService.checkDockerStatus()`, and inspects project readiness (`.env`, `node_modules`, Git repo).
- **Relevant Tests:** [`tests/unit/doctor-service.test.ts`](tests/unit/doctor-service.test.ts).

---

### 2.12 Standards Compliance Engine
- **Responsibility:** Evaluates a project against 7 standardized organizational engineering rules.
- **Key Files:** [`src/modules/standards/standards-service.ts`](src/modules/standards/standards-service.ts), [`src/modules/standards/rules.ts`](src/modules/standards/rules.ts).
- **Class:** `StandardsService` (exported singleton: `standardsService`):
  - `check(cwd?: string): Promise<StandardsReport>`: Evaluates registered rules against the target workspace.
  - `explainRule(ruleId: string): StandardRule | undefined`: Retrieves rule description, rationale, and remediation.
- **Rule Strategy Implementations (`rules.ts`):**
  1. `require-readme`: Verifies `README.md` exists and contains at least 20 characters.
  2. `require-tests`: Verifies presence of a test directory (`tests/`, `test/`, or `__tests__/`).
  3. `require-docker`: Verifies presence of `Dockerfile`.
  4. `require-cicd`: Verifies presence of CI workflow directory (`.github/workflows` or `.gitlab-ci.yml`).
  5. `require-env-example`: Verifies `.env.example` presence when `.env` is present or required.
  6. `require-gitignore`: Verifies `.gitignore` ignores `node_modules`, `.env`, and build outputs.
  7. `require-typechecking`: For TypeScript projects, verifies `tsconfig.json` has `strict: true`.
- **Relevant Tests:** [`tests/unit/standards-rules.test.ts`](tests/unit/standards-rules.test.ts).

---

### 2.13 Git & PR Intelligence
- **Responsibility:** Analyzes git branch states, diff statistics, sensitive file modifications, and flags missing test coverage for changed code.
- **Key File:** [`src/modules/git-integration/git-service.ts`](src/modules/git-integration/git-service.ts).
- **Class:** `GitService` (exported singleton: `gitService`):
  - `isGitRepository(cwd?: string): Promise<boolean>`: Executes `git rev-parse --is-inside-work-tree`.
  - `getCurrentBranch(cwd?: string): Promise<string>`: Queries `git rev-parse --abbrev-ref HEAD`.
  - `getBaseBranch(cwd?: string): Promise<string>`: Checks for `main`, falls back to `master`.
  - `analyze(options?: { cwd?: string; baseBranch?: string }): Promise<PRAnalysisReport>`: Parses `git diff --numstat` against base branch (or `HEAD`), tallies additions/deletions, identifies sensitive changes (`.env`, credentials), manifest changes, and flags untested components if `src/` changed without corresponding test file changes.
- **Relevant Tests:** [`tests/unit/git-service.test.ts`](tests/unit/git-service.test.ts).

---

### 2.14 Documentation Engine
- **Responsibility:** Generates and maintains project `README.md` while protecting custom developer text using HTML comment boundary markers.
- **Key File:** [`src/modules/documentation/docs-service.ts`](src/modules/documentation/docs-service.ts).
- **Class:** `DocsService` (exported singleton: `docsService`):
  - `generate(options?: DocsGeneratorOptions): Promise<FileOperationResult>`: Generates sections for Overview, Architecture, Getting Started, Scripts, Docker, and CI/CD.
  - If `README.md` exists, updates only the content between `<!-- devflow:managed:start -->` and `<!-- devflow:managed:end -->`, preserving custom text outside markers.
- **Relevant Tests:** [`tests/unit/docs-service.test.ts`](tests/unit/docs-service.test.ts).

---

### 2.15 Privacy-Preserving AI Assistant
- **Responsibility:** Explains check failures, test errors, and project architecture with an offline-by-default privacy model.
- **Key File:** [`src/modules/ai-assistant/ai-service.ts`](src/modules/ai-assistant/ai-service.ts).
- **Class:** `AIService` (exported singleton: `aiService`):
  - `explainFailure(rawOutput: string, options?: AIServiceOptions): Promise<AIExplainResponse>`: Explains compiler/test errors.
  - `explainProject(options?: AIServiceOptions): Promise<AIProjectExplainResponse>`: Summarizes architecture, dependencies, and structure.
  - Providers in `src/providers/ai/`:
    - `LocalRuleFallbackProvider`: Offline deterministic regex parser matching TypeScript errors (`TS2322`), ESLint rules, and Vitest assertion failures. Zero network traffic.
    - `OpenAICompatibleProvider`: Cloud LLM adapter used only when user passes consent and environment variables (`OPENAI_API_KEY`).
- **Relevant Tests:** [`tests/unit/ai-service.test.ts`](tests/unit/ai-service.test.ts).

---

### 2.16 Quality Gate & Health Service
- **Responsibility:** Sequentially executes quality check commands (`devflow check`) and computes overall health scores (`devflow health`).
- **Key Files:** [`src/modules/quality-check/quality-service.ts`](src/modules/quality-check/quality-service.ts), [`src/modules/quality-check/health-service.ts`](src/modules/quality-check/health-service.ts).
- **Class:** `QualityService` (exported singleton: `qualityService`):
  - `runChecks(options?: QualityCheckOptions): Promise<QualityReport>`: Sequentially executes check methods (`checkLint`, `checkFormatting`, `checkTests`, `checkTypecheck`, `checkAudit`, `checkEnvironment`, `checkStructure`, `checkDocs`, `checkGit`).
  - Supports filtering via `options.only` and `options.skip`.
  - Wraps each check in a `try...catch` block to ensure failures in one check do not prevent subsequent checks from executing.
- **Class:** `HealthService` (exported singleton: `healthService`):
  - `assess(cwd?: string): Promise<HealthScoreReport>`: Evaluates Quality (40%), Security (40%), and Standards (20%) to compute a 0-100 score and letter grade (A, B, C, F).
- **Relevant Tests:** [`tests/unit/health-service.test.ts`](tests/unit/health-service.test.ts).

---

### 2.17 Cross-Cutting Utilities
- **Key Files:**
  - [`src/utils/errors.ts`](src/utils/errors.ts): `DevFlowError` hierarchy and exit codes.
  - [`src/utils/logger.ts`](src/utils/logger.ts): Chalk logger with `logger.sanitize()` token masking.
  - [`src/utils/paths.ts`](src/utils/paths.ts): `resolveSafePath()` traversal guard and `normalizeDisplayPath()`.
  - [`src/utils/platform.ts`](src/utils/platform.ts): `getPlatformInfo()` returning OS, architecture, and CPU counts.
  - [`src/utils/constants.ts`](src/utils/constants.ts): Default timeouts (`DEFAULT_EXEC_TIMEOUT_MS = 60000`), template names, and banners.
- **Relevant Tests:** [`tests/unit/errors.test.ts`](tests/unit/errors.test.ts), [`tests/unit/paths.test.ts`](tests/unit/paths.test.ts).

---

## 3. Source-Code Execution Flows

### Flow A: Project Scaffolding (`devflow init my-project`)

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant Entry as src/cli/index.ts (runCLI)
    participant Program as src/cli/program.ts (createProgram)
    participant Cmd as src/cli/commands/init.command.ts
    participant Engine as src/core/template-engine.ts (scaffold)
    participant FM as src/core/file-manager.ts (writeFile)
    participant CR as src/core/command-runner.ts (run)

    Dev->>Entry: devflow init my-project --template node-express-api
    Entry->>Program: parseAsync(process.argv)
    Program->>Cmd: Action Handler: init("my-project", cmdOptions)
    Cmd->>Engine: templateEngine.scaffold(options)
    Engine->>Engine: validateProjectName("my-project")
    Engine->>FM: Check target directory conflict
    Engine->>Engine: fg('**/*', { ignore: ['.map', '.d.ts', 'dist', 'node_modules'] })
    loop For each template file
        Engine->>Engine: Handlebars compilation & variable interpolation
        Engine->>FM: writeFile(targetPath, renderedContent, { atomic: true })
        FM->>FM: resolveSafePath(baseDir, targetPath)
        FM->>FM: Write temp staging file (.tmp.*) -> fs.rename()
    end
    alt Git Init Enabled
        Cmd->>CR: run('git', ['init'], { cwd: targetDir })
    end
    Cmd-->>Dev: Success banner and next steps printed
```

#### Detailed Code Trace
1. **Entry Point (`src/cli/index.ts`):** `runCLI()` initializes the Commander program and calls `program.parseAsync(process.argv)`.
2. **Command Handler (`src/cli/commands/init.command.ts#L30-L140`):** Extracts project name and template identifier, falling back to defaults or interactive prompts (`inquirer`).
3. **Scaffolding Delegation (`src/core/template-engine.ts#L142-L178`):** Calls `templateEngine.scaffold()`.
   - `validateProjectName("my-project")` validates against `^[a-zA-Z0-9_.-]+$`.
   - Checks target directory conflict: if directory exists, is non-empty, and `!options.overwrite`, throws `TemplateError`.
4. **File Discovery & Filtering (`src/core/template-engine.ts#L198-L230`):** Scans template files with `fast-glob`, filtering out `.map`, `.d.ts`, and stray compiled `.js` files.
5. **Atomic Writing (`src/core/file-manager.ts#L52-L95`):** `fileManager.writeFile()` verifies `resolveSafePath()`, stages to `${safePath}.tmp.*`, and atomically renames.
6. **Git Initialization (`src/cli/commands/init.command.ts#L160-L165`):** If `initGit` is enabled and not `--dry-run`, executes `commandRunner.run('git', ['init'], { cwd: targetDir })`.

---

### Flow B: Security Vulnerability Audit (`devflow audit`)

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant Cmd as src/cli/commands/audit.command.ts
    participant Service as src/modules/dependency-audit/audit-service.ts
    participant Detector as src/core/project-detector.ts
    participant CR as src/core/command-runner.ts
    participant Lockfile as package-lock.json

    Dev->>Cmd: devflow audit --severity high
    Cmd->>Service: auditService.audit({ severity: 'high' })
    Service->>Detector: projectDetector.detect(root)
    Detector-->>Service: ProjectInfo (isNode: true)
    Service->>CR: run('npm', ['audit', '--json'])
    CR-->>Service: JSON output with vulnerabilities payload
    Service->>Lockfile: Read packages and dependencies mappings
    loop For each vulnerability finding
        Service->>Service: resolveInstalledVersion(pkgName, vulnData.nodes)
        Service->>Service: Distinguish direct vs transitive (via array)
        Service->>Service: Formulate remediation without version inversion
    end
    Service->>Service: Filter against policy (fail on high, critical)
    Service-->>Cmd: SecurityAuditReport
    alt Policy Passed
        Cmd-->>Dev: Print findings table + PASS status
    else Policy Failed
        Cmd-->>Dev: Print findings table + FAIL status (exitCode = 2 via SecurityAuditError)
    end
```

#### Detailed Code Trace
1. **Command Handler (`src/cli/commands/audit.command.ts#L20-L40`):** Calls `auditService.audit({ cwd, severity: cmdOptions.severity })`.
2. **Project Detection (`src/modules/dependency-audit/audit-service.ts#L36-L55`):** Confirms project contains `package.json` or `pyproject.toml`.
3. **Audit Execution (`src/modules/dependency-audit/audit-service.ts#L204-L215`):** Spawns `npm audit --json` via `commandRunner.run()` with `allowFailure: true`.
4. **Lockfile Parsing (`src/modules/dependency-audit/audit-service.ts#L123-L191`):** Loads `package-lock.json`. `resolveInstalledVersion()` matches node paths against the `packages` map and disk `package.json` files.
5. **Remediation Interpretation (`src/modules/dependency-audit/audit-service.ts#L260-L293`):** Parses `fixAvailable`. If `fixAvailable.name !== pkgName`, leaves `fixedVersion = null` and directs update to ancestor package.
6. **Policy Evaluation (`src/modules/dependency-audit/audit-service.ts#L358-L380`):** Checks for findings matching `config.security.failOn` (`high`, `critical`). Throws `SecurityAuditError` if violated.

---

### Flow C: Docker Infrastructure Validation (`devflow docker validate`)

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant Cmd as src/cli/commands/docker.command.ts
    participant Service as src/modules/docker/docker-service.ts
    participant FM as src/core/file-manager.ts
    participant CR as src/core/command-runner.ts

    Dev->>Cmd: devflow docker validate
    Cmd->>Service: dockerService.validate(cwd)
    Service->>FM: exists('Dockerfile')
    Service->>FM: readFile('Dockerfile') -> Verify FROM and USER text instructions
    Service->>FM: exists('docker-compose.yml') -> Parse YAML via YAML.parse()
    Service->>Service: checkDockerStatus()
    Service->>CR: isExecutableAvailable('docker')
    alt Docker CLI Available
        Service->>CR: run('docker', ['version', '--format', '...'], timeout: 4000)
        CR-->>Service: Daemon version or connection failure
    end
    Service-->>Cmd: DockerValidationResult (status, warnings, error)
    Cmd-->>Dev: Print Docker status and validation summary
```

#### Detailed Code Trace
1. **Command Entry (`src/cli/commands/docker.command.ts#L20-L35`):** Calls `dockerService.validate(globals.cwd)`.
2. **Static Dockerfile Checks (`src/modules/docker/docker-service.ts#L278-L315`):** Reads `Dockerfile`, checks that text contains `FROM `, and checks for non-root `USER`.
3. **Compose YAML Parsing (`src/modules/docker/docker-service.ts#L317-L340`):** If compose file exists, parses text via `YAML.parse()`, checking for `services`.
4. **Daemon Inspection (`src/modules/docker/docker-service.ts#L226-L270`):** `checkDockerStatus()` checks `commandRunner.isExecutableAvailable('docker')`. If available, executes `docker version` with a 4s timeout. Classifies status as `'running'`, `'daemon_stopped'`, or `'not_installed'`.

---

### Flow D: CI/CD Pipeline Initialization (`devflow ci init`)

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant Cmd as src/cli/commands/ci.command.ts
    participant Service as src/modules/cicd/cicd-service.ts
    participant Detector as src/core/project-detector.ts
    participant FM as src/core/file-manager.ts

    Dev->>Cmd: devflow ci init --profile strict
    Cmd->>Service: cicdService.init({ profile: 'strict' })
    Service->>Detector: projectDetector.detect(root)
    Service->>FM: exists('.github/workflows/ci.yml')
    alt File Exists and No Force Flag
        Service-->>Cmd: Throw ConfigurationError
    else New File or Force Enabled
        Service->>Service: generateGitHubActionsWorkflow(projectInfo, 'strict')
        Service->>Service: YAML.parse(content) -> Verify syntax
        Service->>FM: writeFile('.github/workflows/ci.yml', content)
        Service-->>Cmd: FileOperationResult
    end
    Cmd-->>Dev: Success message
```

#### Detailed Code Trace
1. **Command Handler (`src/cli/commands/ci.command.ts#L20-L35`):** Calls `cicdService.init({ profile: cmdOptions.profile, force: cmdOptions.force })`.
2. **Conflict Check (`src/modules/cicd/cicd-service.ts#L47-L58`):** If `.github/workflows/ci.yml` exists and `!options.force`, throws `ConfigurationError`.
3. **Workflow Synthesis (`src/modules/cicd/cicd-service.ts#L160-L245`):** Generates GitHub Actions YAML. In `strict` profile, pins action versions to commit SHAs.
4. **Validation and Writing (`src/modules/cicd/cicd-service.ts#L62-L75`):** Verifies YAML syntax via `YAML.parse()` before writing via `fileManager.writeFile()`.

---

### Flow E: Environment Diagnostics (`devflow doctor`)

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant Cmd as src/cli/commands/doctor.command.ts
    participant Service as src/modules/diagnostics/doctor-service.ts
    participant Plat as src/utils/platform.ts
    participant Docker as src/modules/docker/docker-service.ts
    participant CR as src/core/command-runner.ts

    Dev->>Cmd: devflow doctor
    Cmd->>Service: doctorService.diagnose(cwd)
    Service->>Plat: getPlatformInfo() -> OS, Arch, CPUs
    Service->>CR: Inspect versions sequentially of node, npm, git, python
    Service->>Docker: dockerService.checkDockerStatus()
    Service->>Service: Check project dependencies, .env, .git
    Service-->>Cmd: DoctorReport (system, tools, project, recommendations)
    Cmd-->>Dev: Print formatted diagnostics report
```

#### Detailed Code Trace
1. **Command Handler (`src/cli/commands/doctor.command.ts#L15-L30`):** Calls `doctorService.diagnose()`.
2. **System Inspection (`src/modules/diagnostics/doctor-service.ts#L12-L35`):** Calls `getPlatformInfo()` to read OS name, architecture, and CPU cores.
3. **Tool Version Probing (`src/modules/diagnostics/doctor-service.ts#L49-L91`):** Sequentially calls `getToolVersion(cmd, ['--version'])` for `npm`, `git`, and `python` via `commandRunner.run()` with a 3s timeout.
4. **Docker Daemon Status (`src/modules/diagnostics/doctor-service.ts#L93-L125`):** Queries `dockerService.checkDockerStatus()` to verify CLI installation and daemon availability.
5. **Project State Inspection (`src/modules/diagnostics/doctor-service.ts#L140-L190`):** Checks presence of `.env`, `node_modules`, and Git repository.

---

## 4. Technical Concepts Behind DevFlow

### 1. TypeScript Interfaces, Generics & Strict Typing
- **Where in DevFlow:** [`src/types/index.ts`](src/types/index.ts), [`src/core/file-manager.ts`](src/core/file-manager.ts#L147), [`src/core/configuration-manager.ts`](src/core/configuration-manager.ts).
- **Implementation:** Compiled under `"strict": true`, `"noImplicitAny": true`, `"noUncheckedIndexedAccess": true`. Generics are used in `fileManager.readJson<T>(path)`. Discriminated unions (`status: 'not_installed' | 'daemon_stopped' | 'running' | 'invalid_config'`) enforce compiler checks in `switch` statements.

### 2. Node.js Event Loop & Non-Blocking Asynchronous I/O
- **Where in DevFlow:** [`src/core/file-manager.ts`](src/core/file-manager.ts), [`src/core/command-runner.ts`](src/core/command-runner.ts).
- **Implementation:** File I/O operations delegate to `fs/promises` via libuv threads. Process executions wrap `execa` returning native promises without blocking the main event thread.

### 3. Subprocess Execution & Process Lifecycle
- **Where in DevFlow:** [`src/core/command-runner.ts`](src/core/command-runner.ts).
- **Implementation:** Spawns binaries directly via `execa` (`child_process.spawn` wrapper). Does not spawn a system shell by default (`shell: false`). Captures `stdout` and `stderr` as strings and sanitizes tokens.

### 4. Shell Injection Prevention
- **Where in DevFlow:** [`src/core/command-runner.ts#L77`](src/core/command-runner.ts#L77).
- **Implementation:** By executing binaries directly with array arguments (`file, args, { shell: false }`), arguments are passed directly to OS system calls (`execve` on POSIX, `CreateProcessW` on Windows) without shell interpolation.

### 5. Process Exit Codes & Error Propagation
- **Where in DevFlow:** [`src/cli/program.ts#L129-L137`](src/cli/program.ts#L129-L137), [`src/core/command-runner.ts#L105-L133`](src/core/command-runner.ts#L105-L133).
- **Implementation:** Non-zero child exit codes are preserved in `ProcessExecutionError.processExitCode`. Top-level CLI execution calls `process.exit(err.exitCode)` upon catching `DevFlowError`.

### 6. Environment Variables & Secret Redaction
- **Where in DevFlow:** [`src/core/command-runner.ts#L71-L74`](src/core/command-runner.ts#L71-L74), [`src/utils/logger.ts#L22-L40`](src/utils/logger.ts#L22-L40).
- **Implementation:** Child processes receive `{ ...process.env, ...options.env }`. Captured output passes through `logger.sanitize()`, which replaces GitHub tokens (`ghp_*`), npm tokens (`npm_*`), Authorization headers, and private key blocks with `[REDACTED]`.

### 7. Lexical Path Traversal Guard
- **Where in DevFlow:** [`src/utils/paths.ts#L8-L27`](src/utils/paths.ts#L8-L27).
- **Implementation:** `resolveSafePath(baseDir, relativeOrAbsolutePath)` computes `path.relative(resolvedBase, resolvedTarget)`. If it begins with `..` or is absolute (cross-drive switch on Windows), a `FilesystemError` is thrown.
- **Limitation:** Performs purely lexical string-based path resolution. Does not dereference symlinks via `fs.realpath`.

### 8. Atomic Writes & Scaffolding Rollback
- **Where in DevFlow:** [`src/core/file-manager.ts#L88-L94`](src/core/file-manager.ts#L88-L94), [`src/core/file-manager.ts#L174-L189`](src/core/file-manager.ts#L174-L189).
- **Implementation:** Writes to a sibling staging file (`${safePath}.tmp.*`) before renaming via `fs.rename()`. If scaffolding fails, `FileManager.rollback()` deletes newly created files in reverse order.
- **Limitation:** Rollback only tracks newly created files (`!exists`). Pre-existing files that were overwritten are not backed up or restored.

### 9. Lockfile Parsing & Dependency Graph Traversal
- **Where in DevFlow:** [`src/modules/dependency-audit/audit-service.ts#L123-L191`](src/modules/dependency-audit/audit-service.ts#L123-L191).
- **Implementation:** Parses `packages` and `dependencies` in `package-lock.json`. Uses node paths from `npm audit` to look up exact installed versions for nested dependencies.

### 10. Direct vs Transitive Vulnerability Differentiation
- **Where in DevFlow:** [`src/modules/dependency-audit/audit-service.ts#L231-L293`](src/modules/dependency-audit/audit-service.ts#L231-L293).
- **Implementation:** If `fixAvailable.name !== pkgName`, the advisory affects an indirect dependency. Leaves `fixedVersion = null` and directs the user to update the top-level parent package.

### 11. Offline Fallback & Network Handling
- **Where in DevFlow:** [`src/modules/dependency-audit/audit-service.ts#L317-L340`](src/modules/dependency-audit/audit-service.ts#L317-L340), [`src/providers/ai/local-provider.ts`](src/providers/ai/local-provider.ts).
- **Implementation:** Detects network errors (`ENOTFOUND`, `ECONNREFUSED`) from `npm audit`, sets `auditStatus: 'network_error'`, and fails the security policy. AI queries fall back to offline deterministic pattern matching.

### 12. Git Working Tree & Diff Inspection
- **Where in DevFlow:** [`src/modules/git-integration/git-service.ts`](src/modules/git-integration/git-service.ts).
- **Implementation:** Verifies repository status with `git rev-parse --is-inside-work-tree` and inspects line changes with `git diff --numstat`.

### 13. Docker CLI Probing & Static Configuration Validation
- **Where in DevFlow:** [`src/modules/docker/docker-service.ts`](src/modules/docker/docker-service.ts).
- **Implementation:** Validates `Dockerfile` by checking basic text instructions (`FROM`, `USER`). Parses `docker-compose.yml` via `YAML.parse()`. Probes the daemon using `docker version --format {{.Server.Version}}` with a 4s timeout.

### 14. GitHub Actions CI/CD Generation & Hardening
- **Where in DevFlow:** [`src/modules/cicd/cicd-service.ts#L160-L245`](src/modules/cicd/cicd-service.ts#L160-L245).
- **Implementation:** Generates `.github/workflows/ci.yml`. In `strict` profile, pins actions to 40-character commit SHAs, sets `permissions: contents: read`, and configures job timeouts.

### 15. Testing Architecture & Test Doubles
- **Where in DevFlow:** [`tests/unit/`](tests/unit/), [`tests/integration/`](tests/integration/).
- **Implementation:** Unit tests mock external boundaries (`vi.mock('execa')`, `fs.mkdtemp()`). Integration tests run full scaffolding flows in isolated temporary directories.

### 16. Constructor Parameterization for Test Isolation
- **Where in DevFlow:** [`src/core/template-engine.ts#L42-L58`](src/core/template-engine.ts#L42-L58), [`src/core/file-manager.ts#L24-L27`](src/core/file-manager.ts#L24-L27).
- **Implementation:** Services accept directory paths in constructors (`new TemplateEngine(dir)`, `new FileManager(dir)`), enabling tests to target temporary folders without mutating repository files.

### 17. Separation of Concerns & Modular Structure
- **Where in DevFlow:** Full repository structure.
- **Implementation:** CLI transport logic resides in `src/cli/`, domain logic in `src/modules/`, core utilities in `src/core/` and `src/utils/`.

### 18. Structured Error Hierarchy & Remediation Hints
- **Where in DevFlow:** [`src/utils/errors.ts`](src/utils/errors.ts).
- **Implementation:** Custom error subclasses attach machine-readable codes, context objects, and actionable remediation suggestions.

---

## 5. Testing Architecture & Test Distribution

### Vitest Configuration (`vitest.config.ts`)
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/cli/index.ts',
        'src/types/**/*.ts',
        'src/templates/**',
      ],
    },
  },
});
```

---

### Test Distribution (98 Tests Across 19 Suites)

| Suite File | Category | Test Count | Key Scenarios Tested |
| :--- | :--- | :---: | :--- |
| [`tests/unit/command-runner.test.ts`](tests/unit/command-runner.test.ts) | Unit | 12 | Valid runs, stdout/stderr capture, dry-run, exit codes, shell metacharacters, space paths, timeouts, missing executables, invalid cwd. |
| [`tests/unit/paths.test.ts`](tests/unit/paths.test.ts) | Unit | 10 | Relative `../` traversal, deep traversal, Windows backslashes, mixed slashes, cross-drive traversal, safe space paths, display normalization. |
| [`tests/unit/docker-service.test.ts`](tests/unit/docker-service.test.ts) | Unit | 9 | Multi-stage Dockerfile generation, missing CLI, stopped daemon, active daemon, missing Dockerfile, build failure, build success, syntax error. |
| [`tests/unit/errors.test.ts`](tests/unit/errors.test.ts) | Unit | 9 | DevFlowError hierarchy, inheritance, error codes, suggestions, context metadata, process exit codes. |
| [`tests/unit/file-manager.test.ts`](tests/unit/file-manager.test.ts) | Unit | 8 | Atomic writes, safe reads, JSON parsing, duplicate content skipping, overwrite rejection, space paths, atomic rollback, traversal blocking. |
| [`tests/unit/audit-service.test.ts`](tests/unit/audit-service.test.ts) | Unit | 7 | Missing lockfile, direct vs transitive advisories, nested multiple versions, major breaking changes, missing lock entries, malformed JSON, network errors. |
| [`tests/unit/standards-rules.test.ts`](tests/unit/standards-rules.test.ts) | Unit | 7 | README rule, testing rule, CI rule, .env.example rule, gitignore rule, typescript strict rule, rule explanations. |
| [`tests/integration/scaffolding.test.ts`](tests/integration/scaffolding.test.ts) | Integration | 5 | End-to-end scaffolding for Node API, Python FastAPI; absence of duplicate `.js` test files/sourcemaps; directory conflict protection; fault rollback. |
| [`tests/unit/cicd-service.test.ts`](tests/unit/cicd-service.test.ts) | Unit | 5 | Node.js CI workflow generation, security permissions, pinned SHA strict mode, Python workflow generation, overwrite guard, update idempotency. |
| [`tests/unit/ai-service.test.ts`](tests/unit/ai-service.test.ts) | Unit | 5 | TypeScript error explanation, ESLint error explanation, Vitest test failure explanation, audit explanation, architectural overview. |
| [`tests/unit/template-engine.test.ts`](tests/unit/template-engine.test.ts) | Unit | 4 | Template discovery, project name validation, dry-run scaffolding, Handlebars helper interpolation. |
| [`tests/unit/configuration-manager.test.ts`](tests/unit/configuration-manager.test.ts) | Unit | 3 | Default configuration generation, Zod schema validation, invalid property rejection, `.devflowrc.json` file writes. |
| [`tests/unit/project-detector.test.ts`](tests/unit/project-detector.test.ts) | Unit | 3 | Node Express API detection, Python FastAPI detection, Node CLI tool detection, package manager resolution. |
| [`tests/unit/add-service.test.ts`](tests/unit/add-service.test.ts) | Unit | 3 | Adding testing configuration, adding linting configuration, adding formatting configuration to existing projects. |
| [`tests/integration/cli.test.ts`](tests/integration/cli.test.ts) | Integration | 2 | CLI version banner execution (`--version`), CLI general help output (`--help`). |
| [`tests/unit/git-service.test.ts`](tests/unit/git-service.test.ts) | Unit | 2 | Git repository check, current branch lookup, base branch resolution, diff line counting, PR description markdown synthesis. |
| [`tests/unit/docs-service.test.ts`](tests/unit/docs-service.test.ts) | Unit | 2 | Standardized README generation, boundary preservation of user-written sections outside markers. |
| [`tests/unit/doctor-service.test.ts`](tests/unit/doctor-service.test.ts) | Unit | 1 | Comprehensive environment diagnostic verification (OS, Node, npm, Git, Python, Docker CLI, Docker Daemon). |
| [`tests/unit/health-service.test.ts`](tests/unit/health-service.test.ts) | Unit | 1 | Overarching project health calculation across quality gates, security audits, and standards compliance. |
| **Total** | **19 Suites** | **98 Tests** | **91 Unit Tests, 7 Integration Tests, 0 Skipped, 0 Failures** |

---

## 6. Comprehensive Technical Interview Preparation

### 6.1 Project-Specific Architecture & Implementation (40 Questions)

#### Q1: What is DevFlow and why did you build it?
**Answer:** DevFlow is a developer productivity, workflow automation, and Developer Experience (DevEx) CLI platform built in strict TypeScript on Node.js. It standardizes project setup via parameterizable templates, enforces engineering standards, provides lockfile-aware dependency security audits, validates environments, and generates production-oriented Docker and GitHub Actions CI/CD pipelines. It was built to solve tooling fragmentation, inconsistent development setups, and unverified local environments.

#### Q2: How does the DevFlow CLI parse command-line arguments?
**Answer:** DevFlow uses Commander.js in [`src/cli/program.ts`](src/cli/program.ts) to define commands, options, and descriptions. Global options (`--verbose`, `--quiet`, `--json`, `--no-interactive`, `-y, --yes`, `--dry-run`, `--cwd <path>`) are parsed into a typed `GlobalOptions` object. Subcommand handlers are registered via `registerAllCommands()` in [`src/cli/register-commands.ts`](src/cli/register-commands.ts).

#### Q3: Why is `shell: false` the default in `CommandRunner`?
**Answer:** In [`src/core/command-runner.ts#L77`](src/core/command-runner.ts#L77), setting `shell: false` instructs the process runner (`execa`) to invoke binaries directly and pass arguments as discrete string elements to OS system calls (`CreateProcessW` on Windows, `execve` on POSIX). If `shell: true` were used, arguments would be evaluated by `/bin/sh` or `cmd.exe`, making the CLI vulnerable to command injection if arguments contain shell metacharacters (e.g. `;`, `|`, `&&`, `$()`).

#### Q4: How did you fix the duplicate JavaScript and TypeScript test discovery bug in scaffolded projects?
**Answer:** In scaffolded projects, Vitest discovered duplicate tests (`api.test.ts` and `api.test.js`). The root causes were twofold: (1) `dist/templates/` contained stale compiled JS and `.map` files from early builds, and (2) templates lacked an explicit `vitest.config.ts`. The fix was: (a) adding an explicit `vitest.config.ts` to templates specifying `include: ['tests/**/*.test.ts']` and `exclude: ['node_modules', 'dist']`, (b) updating `scripts/copy-templates.js` to empty the target directory and filter `.map` and `.d.ts` files, and (c) adding glob ignore patterns in `TemplateEngine.scaffold()` to ignore `.map`, `.d.ts`, and compiled `.js` files.

#### Q5: What caused the security audit version-inversion bug where remediation versions appeared lower than installed versions?
**Answer:** Modern npm audit JSON reports vulnerabilities with a `fixAvailable` object containing `{ name, version, isSemVerMajor }`. In transitive vulnerabilities, `name` refers to the *top-level* package that needs updating, not the vulnerable package itself. The previous implementation assigned `fixAvailable.version` directly as `fixedVersion` for the vulnerable package. In [`src/modules/dependency-audit/audit-service.ts#L275-L293`](src/modules/dependency-audit/audit-service.ts#L275-L293), we verify whether `fixAvailable.name === pkgName`. If it does not match, `fixedVersion` remains `null`, and the remediation message directs the developer to update the top-level parent package.

#### Q6: How does DevFlow resolve the true installed version of a vulnerable package?
**Answer:** Rather than displaying the advisory's vulnerable range (e.g. `<3.0.3`), `resolveInstalledVersion()` in [`src/modules/dependency-audit/audit-service.ts#L137-L191`](src/modules/dependency-audit/audit-service.ts#L137-L191) first checks the exact node path on disk (`node_modules/.../package.json`) and in the `packages` map of `package-lock.json` (npm v7+). If not found, it checks `dependencies` (npm v6). If still unresolved, it returns `'Unknown'` rather than fabricating a version.

#### Q7: How does DevFlow handle multiple installed versions of the same package at different locations in the tree?
**Answer:** When npm audit returns an advisory affecting multiple locations (e.g., `nodes: ['node_modules/lib-a/.../tar', 'node_modules/lib-b/.../tar']`), `resolveInstalledVersion()` iterates through each node path, checks the lockfile's `packages` mapping and on-disk files, collects distinct installed versions in a `Set<string>`, and returns all resolved versions (e.g. `"4.4.13, 6.1.0"`).

#### Q8: How does DevFlow prevent path traversal attacks during file generation?
**Answer:** [`src/utils/paths.ts#L8-L27`](src/utils/paths.ts#L8-L27) implements `resolveSafePath(baseDir, relativeOrAbsolutePath)`. It resolves both paths to absolute coordinates and asserts that `path.relative(resolvedBase, resolvedTarget)` neither begins with `..` nor is an absolute path (which occurs on Windows when switching drive letters). If an escape is detected, a `FilesystemError` is thrown immediately. Note: It performs lexical string containment checking; it does not dereference symlinks via `fs.realpath`.

#### Q9: How are atomic writes implemented in `FileManager`?
**Answer:** In [`src/core/file-manager.ts#L88-L94`](src/core/file-manager.ts#L88-L94), content is first written to a temporary sibling file (`${safePath}.tmp.${Date.now()}.${random}`). Once successfully written, `fs.rename(tempPath, safePath)` replaces the destination file atomically, ensuring no partial or corrupted files remain if the process is terminated midway.

#### Q10: How does the scaffolding rollback mechanism work and what are its limitations?
**Answer:**
- **Mechanism:** When scaffolding begins, `FileManager` tracks every successfully created file in an internal array (`this.createdFiles`). If any error occurs during template copying, variable rendering, or configuration, `TemplateEngine.scaffold()` catches the error, invokes `fileManager.rollback()`, and deletes the created files in reverse order before rethrowing.
- **Limitation:** Rollback only tracks newly created files (files where `!exists` was true before writing). Pre-existing files that were overwritten are not backed up or restored. Additionally, if `fs.rename` throws during an atomic write, the temporary file is not explicitly cleaned up by the catch block.

#### Q11: How does DevFlow distinguish between Docker missing, Docker daemon stopped, and Docker running?
**Answer:** In [`src/modules/docker/docker-service.ts#L226-L271`](src/modules/docker/docker-service.ts#L226-L271), `checkDockerStatus()` first calls `commandRunner.isExecutableAvailable('docker')`. If missing, status is `'not_installed'`. If present, it executes `docker version --format '{{.Server.Version}}'` with a 4s timeout. If that fails or outputs an empty version, status is `'daemon_stopped'`. If it succeeds with a version string, status is `'running'`.

#### Q12: Why does DevFlow refuse to report a successful Docker build when Docker is unavailable?
**Answer:** To guarantee engineering truthfulness and avoid deceptive reporting. [`DockerService.buildImage()`](src/modules/docker/docker-service.ts) checks daemon health before building. If the daemon is stopped or CLI is missing, it returns `success: false` with a specific `failureReason` (`daemon_stopped` or `not_installed`) and error output, and sets `process.exitCode = 1`.

#### Q13: What template options does DevFlow provide out of the box?
**Answer:** (1) `node-express-api`: TypeScript Express REST API with Zod env validation, error middleware, and health checks. (2) `python-fastapi`: Python FastAPI service with Pydantic settings, pytest, and ruff. (3) `node-cli`: TypeScript CLI tool built on Commander.js.

#### Q14: How does DevFlow prevent overwriting existing user data during scaffolding?
**Answer:** If the target directory exists and contains existing files, [`TemplateEngine.scaffold()`](src/core/template-engine.ts#L167-L177) throws a `TemplateError` detailing the directory conflict unless `--force` or `overwrite: true` was explicitly supplied.

#### Q15: How does the documentation generator protect custom user content in `README.md`?
**Answer:** In [`src/modules/documentation/docs-service.ts`](src/modules/documentation/docs-service.ts), generated content is wrapped in HTML comment markers: `<!-- devflow:managed:start -->` and `<!-- devflow:managed:end -->`. When regenerating, DevFlow locates these markers and updates only the managed block, preserving all user-written content above and below the markers.

#### Q16: How does the CI/CD service guarantee idempotent workflow updates?
**Answer:** In [`src/modules/cicd/cicd-service.ts#L77-L108`](src/modules/cicd/cicd-service.ts#L77-L108), `update()` compares the trimmed content of the existing `.github/workflows/ci.yml` against the freshly generated workflow. If identical, it returns `{ updated: false }` without touching the filesystem or duplicating steps.

#### Q17: What security hardening is applied to generated GitHub Actions workflows?
**Answer:** (1) Top-level `permissions: contents: read` restricts GITHUB_TOKEN scope. (2) `concurrency.cancel-in-progress: true` prevents wasted runner minutes. (3) In `strict` profile, actions are pinned to 40-character commit SHAs (e.g. `actions/checkout@b4ffde...`). (4) Job execution timeouts (`timeout-minutes`) prevent runaway builds.

#### Q18: How does DevFlow prevent sensitive tokens from leaking in console logs or error reports?
**Answer:** [`src/utils/logger.ts#L22-L40`](src/utils/logger.ts#L22-L40) passes all logged strings through `logger.sanitize()`, which applies regular expressions matching GitHub Personal Access Tokens (`ghp_*`), npm tokens (`npm_*`), Authorization bearer headers, and private key blocks, replacing them with `[REDACTED]`.

#### Q19: How does the AI Assistant guarantee developer privacy?
**Answer:** [`src/modules/ai-assistant/ai-service.ts`](src/modules/ai-assistant/ai-service.ts) defaults to `LocalRuleFallbackProvider`, which runs entirely offline with zero network requests. It uses deterministic pattern matching against TypeScript error codes (e.g. `TS2322`), ESLint rules, and Vitest error output to provide explanations without sending code to third-party APIs.

#### Q20: How does `ProjectDetector` determine whether a workspace is a Node API vs a Node CLI?
**Answer:** In [`src/core/project-detector.ts`](src/core/project-detector.ts), it inspects `package.json`. If dependencies include `express`, `fastify`, or `koa`, it classifies it as `node-api`. If `package.json` contains a `bin` declaration, it classifies it as `node-cli`.

#### Q21: What is the purpose of `devflow doctor`?
**Answer:** It acts as a diagnostic health checker for the developer's workstation. It inspects OS architecture, core counts, versions of Node.js, npm, Git, Python, Docker CLI, Docker Daemon, and validates project readiness (presence of `.env`, `node_modules`, Git repo).

#### Q22: What rules does the Standards Engine enforce?
**Answer:** Defined in [`src/modules/standards/rules.ts`](src/modules/standards/rules.ts): (1) `require-readme` (README presence), (2) `require-tests` (test folder presence), (3) `require-docker` (Dockerfile presence), (4) `require-cicd` (CI workflow presence), (5) `require-env-example` (`.env.example` presence), (6) `require-gitignore` (ignores node_modules, .env, dist), (7) `require-typechecking` (enforces strict: true in tsconfig).

#### Q23: How does `devflow pr analyze` detect missing tests?
**Answer:** In [`src/modules/git-integration/git-service.ts`](src/modules/git-integration/git-service.ts), it parses `git diff --numstat`. If source files (`src/**/*.ts`) are modified but no test files (`tests/**/*.ts`) are modified, it flags an untested component warning in the generated PR report.

#### Q24: What is the difference between `devflow check` and `devflow standards check`?
**Answer:** `devflow check` runs dynamic engineering quality gates (executes linters, formatters, typechecks, test suites, and security audits). `devflow standards check` runs static repository governance rules (verifying presence of required files, tsconfig strictness, and organizational policies).

#### Q25: How does DevFlow validate user configuration files?
**Answer:** In [`src/core/configuration-manager.ts`](src/core/configuration-manager.ts), configurations loaded from `.devflowrc.json` are validated against `DevFlowConfigSchema` using Zod. Invalid keys or wrong types throw a `ConfigurationError` explaining the exact property schema violation.

#### Q26: How does DevFlow handle child process timeouts?
**Answer:** In [`src/core/command-runner.ts#L75-L103`](src/core/command-runner.ts#L75-L103), `execa` is passed `timeout: options.timeout ?? DEFAULT_EXEC_TIMEOUT_MS` (60s) with `cleanup: true` and `killSignal: 'SIGTERM'`. If a command exceeds the limit, `execa` kills the child process and throws an error that is translated into a `ProcessExecutionError` with exit code 124.

#### Q27: How does `CommandRunner` verify working directories?
**Answer:** Before spawning any process, `CommandRunner.run()` verifies that `options.cwd` exists using `fs.pathExists()`. If it does not exist, it throws `ProcessExecutionError` with clear guidance rather than allowing Node's process spawn to fail cryptically.

#### Q28: How does DevFlow prevent false clean passes during security audits when offline?
**Answer:** If `npm audit` fails due to network disconnection or DNS failure (`ENOTFOUND`, `ECONNREFUSED`), `auditService` detects this from the stderr stream, sets `auditStatus: 'network_error'`, and sets `policyPassed: false`.

#### Q29: What happens when an npm audit output is malformed or invalid JSON?
**Answer:** `auditService` catches the JSON parse error, inspects output, sets `auditStatus: 'skipped'`, and sets `policyPassed: false`, preventing corrupted data from silently passing security gates.

#### Q30: How does `devflow add <feature>` work on existing projects?
**Answer:** In [`src/modules/configuration/add-service.ts`](src/modules/configuration/add-service.ts), it detects the project ecosystem and writes the required configurations (e.g., `vitest.config.ts` for testing, `eslint.config.js` for linting, `.prettierrc.json` for formatting, or `Dockerfile` and Compose for docker) with overwrite protection.

#### Q31: How is the CLI formatted for human consumption vs automated CI consumption?
**Answer:** Every command checks `globals.json`. If true, results are serialized to stdout via `logger.json()` with zero colors or spinners. If false, formatted tables (`table`), chalk colors, and ora spinners are rendered.

#### Q32: Why does DevFlow use fast-glob instead of native fs.readdir for template file collection?
**Answer:** `fast-glob` allows recursive file discovery with ignore patterns (`['**/*.map', '**/*.d.ts', '**/dist/**', '**/node_modules/**']`) in a single async call, simplifying template file discovery.

#### Q33: How does `devflow health` compute an overarching health score?
**Answer:** In [`src/modules/quality-check/health-service.ts`](src/modules/quality-check/health-service.ts), it weights three pillars: Quality checks (40%), Security audit (40%), and Standards compliance (20%), returning a score from 0 to 100% with a letter grade (A, B, C, F).

#### Q34: What Handlebars helpers are registered in `TemplateEngine`?
**Answer:** In [`src/core/template-engine.ts#L61-L77`](src/core/template-engine.ts#L61-L77): `eq`, `ne`, `and`, `or`, `not`, `lower`, `upper`, and `kebab` (which transforms PascalCase or CamelCase names to kebab-case).

#### Q35: How does DevFlow support dry-run operations?
**Answer:** Global `--dry-run` is propagated to `CommandRunner` (which prints `[DRY-RUN] Would execute: ...` without spawning processes) and `FileManager` (which reports `created`/`updated` without writing bytes to disk).

#### Q36: How does DevFlow ensure clean git working trees when running Git commands?
**Answer:** In [`src/modules/git-integration/git-service.ts`](src/modules/git-integration/git-service.ts), `isGitRepository()` verifies the repository via `git rev-parse --is-inside-work-tree`, and `analyze()` runs `git diff --numstat` to detect uncommitted or branch changes.

#### Q37: How does DevFlow handle non-zero exit codes when `allowFailure: true` is passed?
**Answer:** In [`src/core/command-runner.ts#L105`](src/core/command-runner.ts#L105), if `options.allowFailure: true` is set, `CommandRunner` returns the `CommandRunResult` with the actual `exitCode` rather than throwing `ProcessExecutionError`.

#### Q38: What dependencies does DevFlow rely on for CLI output formatting?
**Answer:** `chalk` for terminal colors, `ora` for terminal spinners, `table` for border-aligned text tables, and `inquirer` for interactive prompts.

#### Q39: What error codes are defined in the `DevFlowError` hierarchy?
**Answer:** `ERR_VALIDATION`, `ERR_FILESYSTEM`, `ERR_PROCESS_EXECUTION`, `ERR_CONFIGURATION`, `ERR_TEMPLATE`, `ERR_DEPENDENCY`, `ERR_SECURITY_AUDIT`, and `ERR_GIT`.

#### Q40: What makes DevFlow production-oriented rather than a prototype?
**Answer:** Real subprocess execution, atomic file staging with rollback, path traversal security checks, accurate lockfile version resolution, complete test coverage (98 tests across 19 suites), strict TypeScript compilation with zero errors, zero ESLint warnings, and automated GitHub Actions CI workflows.

---

### 6.2 Node.js Runtime & TypeScript Internals (30 Questions)

#### Q41: How does Node.js handle module resolution in ECMAScript Modules (ESM)?
**Answer:** DevFlow sets `"type": "module"` in `package.json` and `"moduleResolution": "NodeNext"` in `tsconfig.json`. Under NodeNext ESM resolution, relative import paths in TypeScript must explicitly include the `.js` file extension (e.g. `import { logger } from '../utils/logger.js';`), which maps directly to the compiled JavaScript files in `dist/`.

#### Q42: What is the difference between `child_process.exec` and `child_process.spawn`?
**Answer:** `exec` spawns a system shell (`/bin/sh` or `cmd.exe`), buffers the entire stdout/stderr output in memory up to a maxBuffer limit (default 1MB), and invokes a callback upon process termination. `spawn` executes the binary directly as an OS process without a shell, streaming data through Node.js streams. DevFlow uses `execa` (which wraps `spawn`) to prevent shell injection and handle large outputs safely.

#### Q43: How does the Node.js Event Loop process asynchronous operations?
**Answer:** The libuv event loop operates in distinct phases: (1) Timers (`setTimeout`, `setInterval`), (2) Pending callbacks (I/O callbacks), (3) Idle/prepare, (4) Poll (retrieves new I/O events), (5) Check (`setImmediate`), and (6) Close callbacks. Microtasks (`process.nextTick` and resolved Promise callbacks) are executed immediately after every phase transition.

#### Q44: What happens if an unhandled promise rejection occurs in modern Node.js?
**Answer:**
- **General concept:** In Node.js v15+, an unhandled promise rejection terminates the process with a non-zero exit code (`ERR_UNHANDLED_REJECTION`).
- **DevFlow implementation:** In `src/cli/index.ts`, `runCLI().catch((err) => { console.error('Fatal CLI execution error:', err); process.exit(1); })` traps unhandled top-level promise rejections. Within `runCLI()`, execution is enclosed in a `try...catch` block. DevFlow relies on promise catching rather than registering a global `process.on('unhandledRejection')` listener.

#### Q45: What does `"strict": true` enable in `tsconfig.json`?
**Answer:** It enables a family of strict type-checking flags including: `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, and `alwaysStrict`. DevFlow also adds `noUncheckedIndexedAccess: true` to prevent undefined array/object access bugs.

#### Q46: What is `noUncheckedIndexedAccess` and where did it prevent a bug in DevFlow?
**Answer:** With `noUncheckedIndexedAccess: true`, looking up an index in an array or a property in a record produces type `T | undefined` rather than assuming `T`. In `AuditService`, `directAdvisories[0]` has type `NpmAdvisoryVia | undefined`. TypeScript forced us to explicitly write `if (primaryAdv)` before accessing `primaryAdv.title`, preventing runtime `TypeError: Cannot read properties of undefined`.

#### Q47: How does Node.js handle process signals like `SIGINT` and `SIGTERM`?
**Answer:** Signals sent to the Node process (such as pressing `Ctrl+C` for `SIGINT`) trigger listeners registered via `process.on('SIGINT', callback)`. If no listener is registered, Node terminates immediately. Child processes spawned by `execa` with `cleanup: true` receive `SIGTERM` when the parent Node process exits.

#### Q48: How does `fs.rename` provide atomic guarantees, and what is its cross-device limitation?
**Answer:**
- **General concept:** On POSIX and modern Windows NTFS systems within the same filesystem/volume, `fs.rename` is an atomic filesystem metadata operation: the directory entry is atomically switched to point to the new inode. However, if source and destination reside on different physical drives or mounted volumes, `fs.rename` fails with `EXDEV: cross-device link not permitted`.
- **DevFlow implementation:** DevFlow creates staging files as siblings in the exact same directory (`${safePath}.tmp.*`), guaranteeing same-volume atomic renames.

#### Q49: What is the purpose of TypeScript Generics in utility classes?
**Answer:** Generics allow functions or classes to operate over different types while maintaining compile-time type safety. In `FileManager.readJson<T>(path): Promise<T>`, the caller can specify the expected shape (e.g. `fileManager.readJson<PackageJson>('package.json')`), enabling autocomplete and static validation without using `any`.

#### Q50: How does `Promise.allSettled` differ from `Promise.all`?
**Answer:**
- **General concept:** `Promise.all` rejects immediately if any promise in the array rejects. `Promise.allSettled` waits for all promises to fulfill or reject, returning an array of outcome objects (`{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }`).
- **DevFlow implementation:** In `QualityService.runChecks()`, checks are executed sequentially with individual `try...catch` blocks to record status without aborting subsequent checks.

#### Q51: How does Node.js stream I/O handle backpressure?
**Answer:** Backpressure occurs when data is read faster than the downstream destination can write. In Node streams, when `writable.write(chunk)` returns `false`, the writer buffers data until the internal buffer drains and emits the `'drain'` event. DevFlow relies on `execa`'s stream pipeline to consume child process output buffers without causing memory bloat.

#### Q52: What is the difference between `dependencies`, `devDependencies`, and `peerDependencies`?
**Answer:** `dependencies` are required at runtime in production. `devDependencies` are only required during development and testing (e.g. `vitest`, `typescript`, `eslint`). `peerDependencies` declare that a package expects a specific version of a dependency to be provided by the consuming parent project (common in plugins).

#### Q53: What is the difference between `type` and `interface` in TypeScript?
**Answer:** `interface` is primarily designed for defining object shapes and supports declaration merging (augmenting interfaces across files). `type` aliases can define primitives, unions, intersections, tuples, and mapped types. DevFlow uses `interface` for service contracts (`ScaffoldingOptions`) and `type` for discriminated unions (`CIProfile = 'basic' | 'standard' | 'strict'`).

#### Q54: How does Node.js path normalization handle Windows vs. POSIX slashes?
**Answer:** On Windows, `path.resolve()` and `path.join()` emit backslashes (`\`), whereas on POSIX they emit forward slashes (`/`). DevFlow implements `normalizeDisplayPath()` in [`src/utils/paths.ts`](src/utils/paths.ts) to replace `\\` with `/`, ensuring that output displayed in terminal logs, JSON reports, and Markdown files is consistent across operating systems.

#### Q55: What are Discriminated Unions in TypeScript?
**Answer:** Discriminated unions (or tagged unions) are types sharing a common literal property (the discriminant). For example, `DockerValidationResult` uses `status: 'not_installed' | 'daemon_stopped' | 'running' | 'invalid_config'`. TypeScript's type checker narrows the type automatically inside `switch (result.status)` statements.

#### Q56: What is Zod and why is it preferred over raw TypeScript types for configuration parsing?
**Answer:** TypeScript types are erased at compile time and provide zero runtime protection. Zod performs runtime schema validation. When DevFlow reads `.devflowrc.json`, Zod parses the raw JSON, asserts types, fills in default values, and throws human-readable validation errors if a property is malformed.

#### Q57: How does Node.js resolve executable paths across platforms?
**Answer:** Node delegates executable lookups to the operating system's `PATH` environment variable. On Windows, `where` locates `.exe`, `.cmd`, or `.bat` files. On Unix, `which` checks directories in `PATH`. `CommandRunner.isExecutableAvailable()` abstracts this check cleanly.

#### Q58: What is `import.meta.url` in ES Modules?
**Answer:** In ESM, `__dirname` and `__filename` are not defined globally. `import.meta.url` provides the file URL of the executing module (e.g. `src/core/template-engine.ts`). Using `fileURLToPath(import.meta.url)` and `path.dirname()` allows DevFlow to determine its own installation directory dynamically.

#### Q59: What is the difference between `process.exit()` and `process.exitCode`?
**Answer:**
- **General concept:** `process.exit(code)` terminates the Node process immediately, aborting any pending event loop callbacks, open file descriptors, or flushing streams. Setting `process.exitCode = code` allows the event loop to run down naturally, finish open I/O operations, and exit cleanly with the specified exit code.
- **DevFlow implementation:** In `src/cli/program.ts`, `runCLI()` explicitly invokes `process.exit(err.exitCode)` or `process.exit(ExitCode.GENERAL_FAILURE)` upon catching errors, ensuring the CLI process exits immediately with the determined exit code.

#### Q60: What are WeakMaps in JavaScript and when are they used?
**Answer:** `WeakMap` is a collection of key-value pairs where keys must be objects and are held weakly. If no other reference to the key object exists, the entry is eligible for garbage collection, preventing memory leaks in object-caching scenarios.

#### Q61: What is the purpose of `.npmrc`?
**Answer:** Configures npm behavior, including custom package registries, authentication tokens (`//registry.npmjs.org/:_authToken`), proxy settings, and package hoisting strategies.

#### Q62: How does TypeScript `as const` assertion work?
**Answer:** Appending `as const` to an array or object literal instructs TypeScript to infer the narrowest, immutable literal type (making properties `readonly` and string literals non-widened), enabling strict union derivation.

#### Q63: How does Node.js handle memory allocation for Buffers?
**Answer:** `Buffer` instances represent fixed-length sequences of raw binary bytes allocated outside the V8 JavaScript heap in unmanaged memory via libuv, avoiding V8 garbage collection overhead for high-throughput I/O.

#### Q64: What is the purpose of `peerDependenciesMeta` in `package.json`?
**Answer:** Allows packages to declare that certain peer dependencies are optional (`optional: true`), preventing package managers from throwing hard errors if the consumer does not install them.

#### Q65: How does Node.js resolve symlinks during module resolution?
**Answer:** By default, Node resolves symlinks to their real physical paths (`fs.realpathSync`) before resolving dependencies. Passing `--preserve-symlinks` forces Node to resolve modules relative to the symlink location.

#### Q66: What is a Source Map (`.js.map`)?
**Answer:** A JSON file mapping compiled, transpiled, or minified JavaScript back to the original TypeScript source lines and columns, allowing debuggers to display the original source code during breakpoint inspection.

#### Q67: What causes `EACCES` vs. `ENOENT` errors in Node.js?
**Answer:** `ENOENT` (Error NO ENTIty) indicates that a target file or path does not exist. `EACCES` indicates that the process lacks the necessary filesystem permissions to read, write, or execute the target file.

#### Q68: What is the difference between `fs.readFile` and `fs.createReadStream`?
**Answer:** `fs.readFile` buffers the entire file contents in memory before resolving. `fs.createReadStream` reads the file sequentially in discrete chunks (default 64KB), making it scalable for large files without exhausting heap memory.

#### Q69: What is the purpose of `package-lock.json`?
**Answer:** It records an exact, deterministic tree of all installed packages, their specific versions, integrity hashes (SHA-512), and dependency requirements, ensuring reproducible builds across all machines.

#### Q70: How does TypeScript handle declaration files (`.d.ts`)?
**Answer:** `.d.ts` files contain only type declarations (types, interfaces, function signatures) with zero executable runtime JavaScript. They allow TypeScript compilers to type-check external libraries without needing access to their source implementations.

---

### 6.3 Software Architecture & Design Patterns (20 Questions)

#### Q71: What architectural pattern does DevFlow follow?
**Answer:** DevFlow follows a modular, layered CLI architecture. The CLI layer (`src/cli/`) acts as the command-line transport adapter. Domain Modules (`src/modules/`) contain business logic. Core Infrastructure (`src/core/`) handles filesystem, process execution, configuration, and templating. Cross-cutting utilities (`src/utils/`) handle logging, errors, and path security. It uses direct TypeScript module imports and service singletons without a runtime dependency injection container.

#### Q72: How does DevFlow apply the Single Responsibility Principle (SRP)?
**Answer:** Each module is bounded to a single operational concern: `CommandRunner` only manages subprocess lifecycles; `FileManager` only handles atomic disk I/O and rollback; `TemplateEngine` only compiles and renders template trees; and `AuditService` only analyzes dependency graphs.

#### Q73: How is the Open/Closed Principle (OCP) demonstrated in DevFlow?
**Answer:** The AI Assistant module (`src/modules/ai-assistant/`) defines a generic `AIProvider` interface. Adding a new AI backend (e.g. Anthropic Claude or local Ollama) requires implementing the interface in `src/providers/ai/` without modifying `AIService` or CLI commands.

#### Q74: What is Dependency Inversion and how is it used in DevFlow?
**Answer:**
- **General concept:** High-level policy modules should not depend directly on low-level concrete details; both should depend on abstractions.
- **DevFlow implementation:** DevFlow does not use an IoC container. High-level modules import singleton service instances directly. Partial inversion is achieved through constructor options in `FileManager` and `TemplateEngine`, allowing callers to inject custom working directories or template roots during testing.

#### Q75: How does DevFlow implement the Strategy Pattern?
**Answer:**
- **Standards compliance:** In [`src/modules/standards/rules.ts`](src/modules/standards/rules.ts), the Strategy/Rule pattern is formally implemented: `StandardRule` defines an evaluation contract and distinct rule classes (`RequireReadmeRule`, `RequireTestsRule`, etc.) implement it.
- **Quality checks:** In `QualityService`, checks are implemented as private sequential methods (`checkLint`, `checkFormatting`, etc.) rather than polymorphic strategy objects.

#### Q76: What is the Command Pattern and where is it used?
**Answer:** In `src/cli/commands/`, every CLI command (`audit`, `init`, `docker validate`) is registered as a command handler binding options, flags, and an action callback with Commander, decoupling terminal dispatch from underlying service execution.

#### Q77: Why are singletons used for core services in DevFlow?
**Answer:** Stateless services like `commandRunner`, `projectDetector`, and `templateEngine` are exported as module-level singletons (`export const commandRunner = new CommandRunner()`). Because they hold no mutable per-request state, sharing instances reduces memory overhead and simplifies imports across command handlers. Note: `FileManager` retains mutable state (`this.createdFiles`, `this.baseDir`) and is instantiated per operation or target directory.

#### Q78: How does DevFlow handle Cross-Cutting Concerns?
**Answer:** Cross-cutting concerns such as logging (`logger`), secret sanitization (`logger.sanitize`), error wrapping (`DevFlowError`), and path boundary safety (`resolveSafePath`) are centralized in `src/utils/` and invoked uniformly across all layers.

#### Q79: How does DevFlow avoid circular dependencies?
**Answer:** By enforcing unidirectional dependency flow:
`CLI Commands -> Domain Modules -> Core Infrastructure -> Utilities`. Core services never import from domain modules, and utilities never import from core services.

#### Q80: What is the difference between monolithic and modular CLI architecture?
**Answer:** A monolithic CLI puts all command handlers, filesystem calls, and business rules in a single file or a few tightly coupled scripts. A modular CLI breaks functionality into isolated, testable modules with discrete responsibilities and clean public APIs, making unit testing and maintenance straightforward.

#### Q81: How does DevFlow achieve High Cohesion and Low Coupling?
**Answer:** High cohesion is achieved by grouping related operations inside specific modules (e.g. all Dockerfile generation, instruction checks, and daemon calls live exclusively in `DockerService`). Low coupling is achieved by communicating via typed parameter and result objects (`DockerValidationResult`) rather than passing internal implementation state.

#### Q82: What is an Invariant in software design, and what invariants does DevFlow enforce?
**Answer:** An invariant is a condition that must always remain true during the execution of a system. DevFlow enforces: (1) no files are written outside the target workspace (lexically checked via `resolveSafePath`), (2) subprocesses avoid shell execution by default (`shell: false`), and (3) Docker builds are never reported as successful if the daemon is stopped or the build fails.

#### Q83: How does DevFlow handle Failure Domains?
**Answer:** By isolating checks. In `QualityService`, each check executes in its own `try...catch` block. If linting fails, it records a failure status without aborting subsequent checks (tests, security audit, typechecking).

#### Q84: What is the Facade Pattern and where does DevFlow use it?
**Answer:** `addService` (`src/modules/configuration/add-service.ts`) acts as a facade over `DockerService`, `TemplateEngine`, and `FileManager`. Running `devflow add docker` presents a single function call to the CLI layer while internally coordinating Dockerfile synthesis, Compose generation, and atomic writing.

#### Q85: What is the Template Method Pattern?
**Answer:** A behavioral pattern where an algorithm defines a skeleton in a method, deferring specific steps to subclasses or callbacks. While DevFlow does not use an abstract class hierarchy for checks, `QualityService.runChecks()` defines an orchestration skeleton, evaluating options, executing steps sequentially, and aggregating final report metrics.

#### Q86: How does DevFlow support Idempotent operations?
**Answer:** An idempotent operation can be applied multiple times without changing the result beyond the initial application. `CICDService.update()` compares existing content with generated content and returns `updated: false` if identical, preventing duplicate entries or redundant Git diffs.

#### Q87: Why does DevFlow avoid global mutable state?
**Answer:** Global mutable state introduces race conditions, makes concurrent operations unpredictable, and pollutes test suites across test runs. All state is scoped to options objects passed into methods.

#### Q88: How is the Factory Pattern used in DevFlow?
**Answer:** `createProgram()` in `src/cli/program.ts` acts as a factory function that constructs and configures new Commander program instances with registered options and handlers.

#### Q89: What is Defensive Programming and how is it practiced in DevFlow?
**Answer:** Defensive programming anticipates potential misuse or unexpected inputs. DevFlow practices this by validating directory existence before spawning subprocesses, sanitizing all outputs before printing, and verifying path boundaries before all filesystem writes.

#### Q90: How does DevFlow balance Extensibility with Simplicity?
**Answer:** By providing sensible defaults (out-of-the-box templates, standard CI profiles, local rule-based AI) while providing extension hooks through `.devflowrc.json` configuration, custom CI profiles, and pluggable AI providers.

---

### 6.4 Operating Systems & Process Execution (20 Questions)

#### Q91: What is a Process ID (PID) and how does the operating system track running processes?
**Answer:** A Process ID (PID) is a unique integer assigned by the operating system kernel to identify an active process in the system's process table. The kernel uses the PID to manage the process's lifecycle, virtual memory mappings, CPU scheduling state, open file descriptors, and security credentials (UID/GID). In Node.js, `process.pid` returns the current process ID, and `childProcess.pid` exposes the PID of spawned subprocesses.

#### Q92: What are standard streams (stdin, stdout, stderr) and their standard file descriptor numbers?
**Answer:** In POSIX and Windows operating systems, standard streams are predefined I/O communication channels between a program and its environment:
- File Descriptor `0` (`stdin`): Standard Input, used to stream input data to the process.
- File Descriptor `1` (`stdout`): Standard Output, used by processes to write non-error output streams.
- File Descriptor `2` (`stderr`): Standard Error, used to output diagnostic messages and errors separately from standard data.
DevFlow's `CommandRunner` buffers child process `stdout` and `stderr` independently to ensure error messages are not lost or mixed with structured data.

#### Q93: How does process creation differ between POSIX systems and Windows?
**Answer:** 
- On POSIX systems (Linux, macOS), process creation follows the two-step `fork()` and `exec()` paradigm. `fork()` creates an exact duplicate of the parent process (using copy-on-write page tables), after which `execve()` replaces the child process's memory image with the target executable.
- On Windows, the Win32 API provides `CreateProcessW()`, which creates a new process and executes the target binary in a single atomic operating system operation without replicating the parent process address space. Node.js abstracts these differences through libuv (`uv_spawn`).

#### Q94: What is a Zombie process and what is an Orphan process?
**Answer:**
- A **Zombie process** is a process that has completed execution via `exit()`, but its entry remains in the operating system process table because its parent process has not yet read its exit status via `wait()` or `waitpid()`.
- An **Orphan process** is a running process whose parent has terminated before it. The init process (PID 1 on POSIX) or system manager adopts the orphaned process and reaps its exit status when it terminates.

#### Q95: How do POSIX signals (`SIGINT`, `SIGTERM`, `SIGKILL`) work, and what is the difference between `SIGTERM` and `SIGKILL`?
**Answer:** Signals are asynchronous notifications sent by the OS kernel to a process to notify it of an event:
- `SIGINT` (Signal 2): Sent when the user presses `Ctrl+C`. It can be trapped, handled, or ignored.
- `SIGTERM` (Signal 15): The standard graceful termination signal. It requests the process to terminate, allowing it to flush buffers, release file locks, and clean up temporary resources.
- `SIGKILL` (Signal 9): The unconditional kill signal. It cannot be caught, blocked, or ignored; the OS kernel immediately terminates the process and reclaims its memory. DevFlow uses `SIGTERM` first with a graceful timeout, falling back to process cleanup.

#### Q96: Why does `SIGKILL` bypass application cleanup handlers?
**Answer:** `SIGKILL` is handled entirely inside kernel space. When a kernel receives a `SIGKILL` directed at a PID, the scheduler immediately removes the process from the run queue, frees its allocated virtual memory pages, and closes its file descriptors. The process instructions are never executed again in user space, meaning application-level signal handlers (`process.on('SIGTERM')`) or `finally` blocks never run.

#### Q97: What is Shell Injection and how does executing without a shell (`shell: false`) prevent it?
**Answer:** Shell injection occurs when untrusted user input containing shell metacharacters (such as `;`, `&&`, `|`, `` ` ``, `$()`) is passed into a shell interpreter (`/bin/sh` or `cmd.exe`). The shell interprets these characters as command delimiters, executing arbitrary commands with the privileges of the parent process. By passing `shell: false` (the default in `CommandRunner` and `execa`), arguments are passed directly as an array of binary string pointers to the OS kernel (`execve` on POSIX, `CreateProcessW` on Windows), bypassing shell parsing completely.

#### Q98: How does the OS resolve binary locations using the `PATH` environment variable?
**Answer:** The `PATH` environment variable contains an ordered list of directory paths separated by colons (`:`) on POSIX or semicolons (`;`) on Windows. When an executable name (e.g. `docker`) is passed without an absolute path, the OS iterates sequentially through each directory in `PATH`, checking if a matching executable file exists with appropriate execute permissions (or matching `.exe`/`.cmd`/`.bat` extensions on Windows).

#### Q99: What is the difference between synchronous blocking I/O and asynchronous non-blocking I/O?
**Answer:**
- In **synchronous blocking I/O**, the executing thread makes a system call (e.g. `read()`) and is placed into a waiting/sleep state by the OS scheduler until the hardware device (disk or network card) completes the operation. The thread cannot do any other work.
- In **asynchronous non-blocking I/O**, the thread requests an I/O operation and immediately continues executing other application code. When the I/O completes, the OS (via `epoll` on Linux, `kqueue` on macOS, or `IOCP` on Windows) notifies the runtime (Node.js/libuv), which queues the callback into the event loop.

#### Q100: How does the OS allocate and manage Virtual Memory for a process?
**Answer:** The OS provides each process with its own continuous virtual address space through the Memory Management Unit (MMU) and page tables. Virtual memory is broken into fixed-size chunks called pages (typically 4KB). Physical RAM is divided into matching page frames. The MMU translates virtual page addresses into physical frames at runtime, providing memory isolation so one process cannot read or corrupt another process's memory.

#### Q101: What happens when a process exhausts available memory (Out Of Memory / OOM Killer)?
**Answer:** On Linux systems, when the kernel exhausts physical RAM and swap space, the Out-of-Memory (OOM) Killer is invoked. It scores active processes based on memory usage, runtime, and `oom_score_adj`. It selects the highest-scoring candidate and sends an uncatchable `SIGKILL` to reclaim its memory immediately. In Node.js, exceeding V8's heap limit (`--max-old-space-size`) triggers a fatal runtime abort before the OS OOM killer intervenes.

#### Q102: How does a child process inherit its environment variables and current working directory?
**Answer:** When a process spawns a child, the OS copies the parent's environment block and working directory reference by default. In `CommandRunner`, DevFlow explicitly controls this inheritance by passing `cwd` (resolving the target working directory) and augmenting `env: { ...process.env, ...options.env }`, allowing specific overrides without mutating `process.env` in the parent process.

#### Q103: What is Inter-Process Communication (IPC) and what mechanisms exist?
**Answer:** IPC encompasses mechanisms provided by the operating system allowing processes to exchange data and synchronize actions:
- **Standard Pipes (Anonymous Pipes):** Unidirectional byte streams connecting stdout/stderr to parent stdin.
- **Named Pipes (FIFOs):** Persistent filesystem objects for inter-process communication.
- **Unix Domain Sockets:** High-performance bidirectional sockets for local inter-process messaging.
- **Shared Memory:** Multiple processes map the same physical memory page.
- **Signals:** Asynchronous integer notifications for lifecycle control.

#### Q104: How does DevFlow prevent subprocess commands from hanging indefinitely?
**Answer:** In [`src/core/command-runner.ts`](src/core/command-runner.ts), `CommandRunner` sets a default timeout of 60,000 milliseconds (`DEFAULT_EXEC_TIMEOUT_MS`, configurable per invocation via `CommandRunOptions.timeout`). If the child process does not exit within this window, `execa` terminates the child process and throws an error that DevFlow translates into a `ProcessExecutionError` with exit code `124`.

#### Q105: What is a File Descriptor (FD) leak and how can it be avoided?
**Answer:** A File Descriptor leak occurs when a program opens files, sockets, or pipes without closing them after operations complete. Because operating systems enforce per-process and system-wide file descriptor limits (`ulimit -n`), leaking descriptors eventually causes subsequent file opens or network connections to fail with `EMFILE: too many open files`. DevFlow avoids FD leaks by using high-level `fs/promises` methods that automatically close descriptors upon completion.

#### Q106: What is the difference between CPU-bound tasks and I/O-bound tasks in Node.js?
**Answer:**
- **I/O-bound tasks** (e.g. reading files, network requests, child process execution) spend most of their time waiting for external hardware or processes. Node.js handles thousands of concurrent I/O operations effortlessly on a single thread using non-blocking libuv event polling.
- **CPU-bound tasks** (e.g. cryptographic hashing, image processing, complex parsing) execute continuous CPU instructions on the V8 main thread, blocking the event loop and delaying all concurrent operations. Node.js handles CPU-bound tasks via Worker Threads or external processes.

#### Q107: How does Windows handle line endings (`\r\n` CRLF) vs POSIX (`\n` LF), and how does DevFlow handle cross-platform line endings?
**Answer:** Windows uses Carriage Return + Line Feed (`\r\n` or CRLF), whereas POSIX systems use Line Feed (`\n` or LF). Inconsistent line endings cause git churn, test assertion failures, and shell script parsing errors. DevFlow addresses this by: (1) normalizing string comparisons using `.trim()` and regex line splits (`/\r?\n/`), and (2) enforcing `.gitattributes` with `* text=auto eol=lf` across all generated project templates.

#### Q108: What are Windows file locks vs POSIX advisory locks, and how do they impact atomic file replacements?
**Answer:**
- On POSIX, file locking is advisory by default: processes can overwrite or delete an open file without error.
- On Windows, file locking is mandatory: if a process holds an open file handle without `FILE_SHARE_DELETE` or `FILE_SHARE_READ`, any attempt by another process to delete or rename that file fails with `EBUSY` or `EPERM`. DevFlow handles this by staging writes in separate temporary files and ensuring file handles are fully closed before executing atomic renames.

#### Q109: What is an exit code in Unix/Windows and what do exit codes greater than 128 signify in Unix?
**Answer:** An exit code is an 8-bit unsigned integer (0-255 on Unix, 32-bit signed integer on Windows) returned by a terminated process. Code `0` indicates success; non-zero codes indicate specific errors. On Unix, exit codes greater than 128 signify termination by a signal, computed as `128 + signal_number` (e.g. exit code 137 represents `128 + 9` = `SIGKILL`, and 130 represents `128 + 2` = `SIGINT`).

#### Q110: How does DevFlow handle child process termination during user interrupts (Ctrl+C)?
**Answer:**
- **General concept:** When a user presses `Ctrl+C`, the terminal sends `SIGINT` to the foreground process group.
- **DevFlow implementation:** `CommandRunner` configures `cleanup: true` and `killSignal: 'SIGTERM'` on `execa` options, ensuring that direct child processes receive `SIGTERM` when the parent Node.js process terminates.
- **Limitation:** DevFlow does not configure detached process group signaling (`detached: true` with negative PID kills). Detached background grandchild processes or external daemons spawned by child processes are not automatically reaped by DevFlow.

---

### 6.5 Networking & Package Registries (20 Questions)

#### Q111: What is the npm Registry and what underlying protocol does it use?
**Answer:** The npm Registry is a distributed RESTful database that stores package metadata and tarball archives. It communicates over standard HTTPS, serving package manifest documents as JSON (`https://registry.npmjs.org/<package-name>`) and package tarballs as `.tgz` files over HTTP/1.1 and HTTP/2.

#### Q112: What is an npm tarball (`.tgz`) and what does it contain?
**Answer:** An npm package tarball is a Gzip-compressed TAR archive containing the package's publishable files. By convention, all files are located inside a root directory named `package/`. When running `npm install`, npm downloads the `.tgz` archive, extracts it into `node_modules/<package-name>`, and verifies its SHA-512 cryptographic integrity hash.

#### Q113: What causes `ENOTFOUND` and `ECONNREFUSED` network errors in Node.js?
**Answer:**
- `ENOTFOUND`: A DNS lookup failure. The system resolver could not map the requested hostname (e.g. `registry.npmjs.org`) to an IP address.
- `ECONNREFUSED`: The target IP address was reached, but the remote host actively rejected the connection (no service was listening on the target port or a firewall blocked the port). DevFlow's `AuditService` explicitly traps these error codes to report network offline status cleanly.

#### Q114: How does TLS/HTTPS authentication protect package downloads?
**Answer:** When npm connects to `https://registry.npmjs.org`, a TLS 1.3 handshake occurs:
1. The client verifies the server's X.509 certificate against trusted root Certificate Authorities (CAs) to prevent Man-in-the-Middle (MITM) attacks.
2. The client and server establish ephemeral symmetric encryption keys (using ECDHE) to encrypt all package traffic in transit.
3. This ensures that neither package manifests nor `.tgz` archives can be intercepted or altered by intermediate network nodes.

#### Q115: What is Subresource Integrity (SRI) and how does npm use it in `package-lock.json`?
**Answer:** Subresource Integrity uses cryptographic hashes to verify that fetched resources have not been tampered with. In `package-lock.json`, every package entry contains an `integrity` field formatted as `sha512-<base64-hash>`. When downloading a package, npm computes the SHA-512 hash of the downloaded `.tgz` file; if it does not match the lockfile hash, npm aborts the installation with an `EINTEGRITY` error.

#### Q116: What is the purpose of HTTP connection timeouts and socket idle timeouts?
**Answer:** If a network connection drops silently without sending TCP `FIN` or `RST` packets (e.g. during cable disconnects or routing drops), a socket can remain open indefinitely waiting for packets. Setting connection and read timeouts ensures that client applications abort unresponsive sockets after a deterministic threshold, freeing sockets and worker threads.

#### Q117: What is Exponential Backoff with Jitter in network retries?
**Answer:** When network requests fail due to transient errors (e.g. HTTP 503 or 429), retrying immediately can overwhelm the server (the "thundering herd" problem). Exponential backoff increases the wait time exponentially with each retry ($t = t_{base} \cdot 2^{attempt}$). Adding random "jitter" distributes retries across time, reducing contention and allowing servers to recover.

#### Q118: How does an HTTP Proxy (`HTTP_PROXY`, `HTTPS_PROXY`) work?
**Answer:** In corporate networks, outbound direct internet connections are often blocked. Clients send requests to a forward proxy server. For HTTPS, the client sends an `HTTP CONNECT host:443` request. The proxy establishes a raw TCP tunnel to the remote host and relays encrypted TLS bytes back and forth without terminating the TLS connection.

#### Q119: What is HTTP Status Code 429 Too Many Requests and how should clients respond?
**Answer:** HTTP 429 indicates that the client has exceeded the server's rate limits within a given time window. The server often includes a `Retry-After: <seconds>` header indicating how long the client must pause before issuing new requests. Well-behaved CLI tools must pause requests until the specified duration elapses.

#### Q120: What are HTTP Status Codes 502, 503, and 504?
**Answer:**
- `502 Bad Gateway`: An edge reverse proxy received an invalid response from the upstream backend server.
- `503 Service Unavailable`: The server is currently overloaded or undergoing scheduled maintenance.
- `504 Gateway Timeout`: The edge reverse proxy timed out waiting for a response from the upstream service.

#### Q121: How do Content Delivery Networks (CDNs) accelerate package distribution?
**Answer:** CDNs deploy globally distributed edge caching servers. When a developer in Tokyo requests `lodash.tgz`, the CDN serves the cached static archive from an edge PoP (Point of Presence) in Tokyo rather than routing across the Pacific to an origin server in North America, reducing round-trip latency and origin server load.

#### Q122: What is the purpose of an npm auth token and how is it formatted?
**Answer:** An npm auth token is a bearer token used to authenticate private package publishing and installation. In `.npmrc`, it is declared as `//registry.npmjs.org/:_authToken=npm_xxxxxxxxxxxx`. DevFlow's `logger.sanitize()` explicitly masks tokens matching patterns like `npm_[A-Za-z0-9_-]+` and `bearer [A-Za-z0-9._~+/-]+` to prevent accidental credential leakage in logs.

#### Q123: What is DNS Caching and what are TTLs?
**Answer:** When a client resolves a domain name (e.g. `api.github.com`), the DNS resolver stores the IP address in cache for the duration specified by the DNS record's Time-To-Live (TTL) field. Subsequent requests use the cached IP address, eliminating redundant DNS queries until the TTL expires.

#### Q124: What is the difference between IPv4 and IPv6 resolution in Node.js?
**Answer:** IPv4 uses 32-bit addresses (`192.168.1.1`); IPv6 uses 128-bit addresses (`2001:db8::1`). In Node.js v17+, DNS resolution defaults to ordering addresses according to RFC 6724 ("Happy Eyeballs"), attempting IPv6 first. If an ISP or network does not correctly support IPv6, this can lead to connection hangs unless DNS resolution order is configured.

#### Q125: What is `npm audit` and how does it query security advisories over the network?
**Answer:** When `npm audit --json` runs, npm collects the installed package names, dependency ranges, and resolved versions from `package-lock.json` and submits a `POST` request with the JSON payload to `https://registry.npmjs.org/-/npm/v1/security/audits/quick`. The registry evaluates the graph against the GitHub Advisory Database and returns a vulnerability report.

#### Q126: What happens if `npm audit` is executed behind a corporate firewall with self-signed SSL certificates?
**Answer:** Node.js rejects the TLS connection with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` or `SELF_SIGNED_CERT_IN_CHAIN` because the corporate proxy's root certificate is not present in Node's bundled Mozilla CA certificate store. Solutions include configuring `npm config set cafile <path-to-pem>` or setting `NODE_EXTRA_CA_CERTS`.

#### Q127: How does npm cache packages locally on disk?
**Answer:** npm maintains a local content-addressable cache in `~/.npm/_cacache`. It stores downloaded `.tgz` tarballs indexed by their SHA-512 hashes. If the same package version is requested in another project, npm copies the package directly from disk cache without making a network round-trip.

#### Q128: What is the difference between `npm install` and `npm ci` regarding network requests?
**Answer:**
- `npm install` can update `package-lock.json`, query registries for updated minor/patch versions permitted by `^` and `~` semver ranges, and recalculate dependencies.
- `npm ci` (Clean Install) strictly requires an existing `package-lock.json`, deletes `node_modules`, and installs the exact versions and hashes specified in the lockfile without making version resolution queries, optimizing speed and determinism in CI/CD pipelines.

#### Q129: What is CORS and does it apply to CLI tools?
**Answer:** Cross-Origin Resource Sharing (CORS) is a browser security mechanism that restricts web pages from making cross-origin HTTP requests. It is enforced entirely by the browser engine. CLI tools running in Node.js (like DevFlow) communicate directly over raw TCP/TLS sockets and are not subject to CORS restrictions.

#### Q130: How does DevFlow prevent leaking sensitive environment variables over the network in CI/CD?
**Answer:** Generated GitHub Actions workflows use secret references (`${{ secrets.NPM_TOKEN }}`) rather than hardcoded credentials. Furthermore, DevFlow CLI's logging layer filters and masks authorization headers, bearer tokens, and private API keys before printing stdout/stderr.

---

### 6.6 Testing & Debugging Methodologies (20 Questions)

#### Q131: What is the Test Pyramid and how does DevFlow distribute tests across its layers?
**Answer:** The Test Pyramid is a testing philosophy advocating for:
1. **Unit Tests (Base):** Fast, isolated tests verifying individual functions and classes in memory.
2. **Integration Tests (Middle):** Tests verifying collaboration between multiple modules and the filesystem or mocked subprocesses.
3. **End-to-End (E2E) Tests (Peak):** Tests verifying complete user workflows from CLI invocation to disk output.
DevFlow has 98 passing tests across 19 suites: 91 unit tests in `tests/unit/` and 7 integration tests in `tests/integration/` (`cli.test.ts` and `scaffolding.test.ts`).

#### Q132: What is the difference between Unit Tests, Integration Tests, and End-to-End (E2E) Tests?
**Answer:**
- **Unit Tests:** Focus on single units of code (a method, class, or pure function) in isolation from external systems.
- **Integration Tests:** Verify that two or more concrete components collaborate correctly (e.g. `TemplateEngine` using `FileManager` to write rendered templates to a real temporary test directory).
- **E2E Tests:** Execute the fully compiled application entry point against real operating system environments, simulating actual end-user commands and validating exit codes and terminal output.

#### Q133: What is the difference between a Mock, a Stub, a Spy, and a Fake (Test Doubles)?
**Answer:**
- **Stub:** Returns canned, predetermined data to calls made during the test (e.g. `vi.fn().mockResolvedValue({ stdout: 'Docker version 24.0.0' })`).
- **Spy:** Wraps a real function to record execution metadata (number of calls, arguments passed, return values) without altering its underlying implementation.
- **Mock:** A test double configured with pre-programmed expectations about how it should be called; the test fails if expectations are violated.
- **Fake:** A working implementation with a shortcut that makes it unsuitable for production (e.g. an in-memory filesystem instead of a physical disk).

#### Q134: How does Vitest achieve high performance compared to legacy test runners like Jest?
**Answer:** Vitest leverages Vite's high-performance compilation pipeline:
1. Uses `esbuild` for native TypeScript transpilation without `ts-jest` or Babel overhead.
2. Uses Worker Threads via `tinypool` to run test suites in parallel across multiple CPU cores.
3. Implements module caching and native ESM support without CommonJS transformation bottlenecks.

#### Q135: Why is Test Isolation essential, and how does Vitest isolate test worker threads?
**Answer:** Test isolation ensures that one test cannot affect the outcome of another by mutating shared memory, modifying global variables (`process.env`), or leaving files on disk. Vitest runs test files in separate Worker Threads or isolated Node.js contexts, ensuring clean globals and fresh memory spaces per test suite.

#### Q136: How does DevFlow isolate filesystem operations in unit tests?
**Answer:** In unit tests (e.g. [`tests/unit/file-manager.test.ts`](tests/unit/file-manager.test.ts)), DevFlow creates isolated temporary directories under `os.tmpdir()` using `fs.mkdtemp()`. Using dedicated temporary folders prevents collisions with the developer's real repository files and tests physical filesystem semantics accurately.

#### Q137: How does DevFlow test subprocess execution without actually running slow system binaries?
**Answer:** DevFlow mocks `execa` in unit tests (e.g. [`tests/unit/command-runner.test.ts`](tests/unit/command-runner.test.ts)) via `vi.mock('execa')`. The mock intercepts calls to `execa(binary, args, options)` and returns simulated `ExecaReturnValue` objects with customizable `stdout`, `stderr`, and `exitCode`. For example, Docker CLI detection is tested by mocking `docker version` to return exit code 0 or throw `ENOENT`.

#### Q138: What are Deterministic Tests and what factors cause "flaky" tests?
**Answer:** Deterministic tests always produce the exact same outcome (pass or fail) when given the same codebase. Common causes of flakiness include:
- Unhandled asynchronous timing (relying on `setTimeout` instead of awaiting promises).
- Non-deterministic ordering in `fs.readdir` or object key iteration.
- Shared mutable global state across tests.
- Hardcoded path separators (`/` vs `\`) failing across different operating systems.
- Dependence on live external network services or system time.

#### Q139: How does DevFlow eliminate test flakiness caused by cross-platform differences?
**Answer:**
1. Paths are normalized using `path.resolve` and forward-slash transforms before assertion checks.
2. File permissions and POSIX mode bits are normalized during comparisons.
3. Tests avoid hardcoded Windows (`C:\`) or Unix (`/var`) root paths, using dynamic fixtures and `path.join()`.
4. Line endings are stripped or split with `/\r?\n/` before regex matching.

#### Q140: What is Code Coverage and what do Line, Branch, Function, and Statement coverage measure?
**Answer:**
- **Statement Coverage:** Percentage of executable statements executed during tests.
- **Line Coverage:** Percentage of source code lines touched by tests.
- **Function Coverage:** Percentage of declared functions invoked during tests.
- **Branch Coverage:** Percentage of logical decision paths (e.g. `if (a && b) { ... } else { ... }`) evaluated as both `true` and `false`. Branch coverage is the most rigorous metric because it exposes untested edge cases in conditional logic.

#### Q141: Why can 100% code coverage give a false sense of security?
**Answer:** Code coverage only proves that code was *executed*, not that it was *correct* or that assertions validated business invariants. Code coverage cannot detect:
- Missing edge cases (e.g. handling empty arrays or null values when not guarded).
- Concurrency race conditions.
- Performance regressions and memory leaks.
- Semantic flaws (e.g. writing to the wrong directory despite code executing).

#### Q142: What is Snapshot Testing and when is it appropriate vs fragile?
**Answer:** Snapshot testing serializes a component's output (HTML, JSON, terminal output) into a reference snapshot file on disk and compares future test runs against it. It is useful for testing complex, stable outputs (like generated GitHub Actions YAML files). It is fragile when snapshots capture volatile data (timestamps, randomly generated UUIDs, filesystem paths) or when developers blindly update snapshots without inspecting diffs.

#### Q143: How do you debug asynchronous race conditions or unhandled rejections in tests?
**Answer:**
1. Enable Vitest's `--dangerouslyIgnoreUnhandledErrors=false` to fail immediately on unhandled rejections.
2. Run tests with Node's `--trace-warnings` and `--unhandled-rejections=strict` flags.
3. Avoid floating promises; always use `await` or return promises.
4. Catch errors within async operations to prevent unhandled rejection crashes when one task fails.

#### Q144: What is the purpose of `beforeEach`, `afterEach`, `beforeAll`, and `afterAll` hooks?
**Answer:**
- `beforeAll`: Runs once before all tests in a suite (e.g. compiling templates or establishing heavy fixtures).
- `beforeEach`: Runs before *every individual* test (e.g. creating a fresh temporary directory, resetting mocks via `vi.clearAllMocks()`).
- `afterEach`: Runs after every individual test (e.g. deleting test files, restoring environment variables).
- `afterAll`: Runs once after all tests in a suite have completed (e.g. tearing down global test harness).

#### Q145: How does DevFlow ensure temporary test directories are cleanly removed after test completion?
**Answer:** In test suites that perform disk writes (e.g. [`tests/integration/scaffolding.test.ts`](tests/integration/scaffolding.test.ts)), `beforeEach` creates a unique temporary directory via `fs.mkdtemp(path.join(os.tmpdir(), 'devflow-test-'))`. The corresponding `afterEach` hook wraps `fs.remove(tempDir)` in a `try...catch` block to guarantee filesystem cleanup even if assertions fail.

#### Q146: What is Property-Based Testing vs Example-Based Testing?
**Answer:**
- **Example-Based Testing:** Developers write explicit test cases with specific hardcoded inputs and outputs (e.g. `assert(kebab('FooBar') === 'foo-bar')`).
- **Property-Based Testing:** The test framework generates hundreds of randomized inputs to verify that general mathematical or logical invariants hold across all possible inputs (e.g. asserting that for any string $s$, `kebab(s)` never contains uppercase letters or spaces).

#### Q147: How can you capture a V8 Heap Snapshot to debug memory leaks in Node.js?
**Answer:**
1. Start Node with the `--inspect` flag and connect Chrome DevTools (`chrome://inspect`).
2. Navigate to the Memory tab and select "Take Heap Snapshot".
3. Trigger the suspicious workflow multiple times.
4. Take a second snapshot and use the "Comparison" view to identify retaining paths for objects that were not garbage collected (e.g. growing arrays, lingering event listeners).

#### Q148: What is Post-Mortem Debugging and how do Core Dumps assist in diagnosing crashes?
**Answer:** Post-mortem debugging analyzes the state of an application *after* a fatal crash. An operating system core dump captures the complete physical and virtual memory image, registers, thread call stacks, and CPU state at the instant of failure. Tools like `lldb`, `gdb`, or Node's `report` API inspect the core dump to locate the exact machine instruction and memory address that caused the segmentation fault.

#### Q149: How does DevFlow structure test fixtures for complex JSON payloads?
**Answer:** DevFlow defines structured fixture objects in test helpers (e.g. `mockNpmAuditJson` in [`tests/unit/audit-service.test.ts`](tests/unit/audit-service.test.ts)). Fixtures replicate real-world npm audit outputs containing nested `via` structures, transitive vulnerabilities, circular dependencies, and edge cases (such as missing fix versions) to test parsing without network dependencies.

#### Q150: What is Mutation Testing and how does it evaluate test suite quality?
**Answer:** Mutation testing (using tools like Stryker) systematically injects faults ("mutants") into your production source code (e.g. changing `>` to `<`, flipping `true` to `false`, deleting statements). It then executes your test suite against each mutant. If your tests fail, the mutant is "killed" (good); if tests pass, the mutant "survived" (indicating a gap in your test assertions).

---

### 6.7 Application Security & Dependency Trust (20 Questions)

#### Q151: What is a Software Supply Chain Attack and what vectors exist in the JavaScript ecosystem?
**Answer:** A supply chain attack compromises an upstream dependency, build tool, or distribution pipeline rather than attacking the end target application directly. In JavaScript/npm, vectors include:
1. Account takeover of open-source maintainers via credential stuffing or phishing.
2. Malicious package publishing via typosquatting or dependency confusion.
3. Malicious install scripts (`preinstall`, `postinstall`) executing remote payloads.
4. Compromised CI/CD build environments modifying published `.tgz` tarballs.

#### Q152: What is Typosquatting in package registries and how does npm protect against it?
**Answer:** Typosquatting is the practice of publishing malicious packages with names visually or phonetically similar to popular packages (e.g. `cross-env` vs `crossenv`, `lodsh` vs `lodash`) in hopes that developers make a typographical error during installation. npm combats this using automated lexdistance algorithms that block publication of package names that closely resemble high-download packages.

#### Q153: What is Dependency Confusion (Namespace Confusion) and how do scoped packages prevent it?
**Answer:** Dependency confusion occurs when an organization uses internal private package names (e.g. `corp-auth`) without scoping. An attacker registers the identical package name on the public npm registry with a high semver version (`99.9.9`). By default, misconfigured package managers prefer the higher version from the public registry, pulling malicious code into corporate builds. Using npm scoped packages (`@mycorp/corp-auth`) tied to private registries eliminates this attack vector.

#### Q154: What are npm lifecycle scripts (`preinstall`, `postinstall`) and why are they high-risk attack vectors?
**Answer:** Lifecycle scripts allow packages to execute arbitrary shell commands automatically upon installation (`npm install`). Attackers use these scripts to harvest environment variables, steal SSH and AWS keys, or establish reverse shells. Security-conscious teams often run `npm install --ignore-scripts` in untrusted or CI environments to disable automatic script execution.

#### Q155: What are CVE, CWE, and CVSS, and how do they quantify security vulnerabilities?
**Answer:**
- **CVE (Common Vulnerabilities and Exposures):** A standardized, publicly registered identifier for a known security flaw (e.g. `CVE-2023-45133`).
- **CWE (Common Weakness Enumeration):** A categorical taxonomy of software security weaknesses (e.g. `CWE-79` for Cross-Site Scripting, `CWE-22` for Path Traversal).
- **CVSS (Common Vulnerability Scoring System):** A standardized metric (0.0 to 10.0) quantifying the severity and exploitability of a vulnerability.

#### Q156: How is a CVSS v3.1 Base Score calculated across Attack Vector, Attack Complexity, and Privileges Required?
**Answer:** The CVSS Base Score evaluates:
- **Attack Vector (AV):** Network (`N`), Adjacent (`A`), Local (`L`), Physical (`P`).
- **Attack Complexity (AC):** Low (`L`), High (`H`).
- **Privileges Required (PR):** None (`N`), Low (`L`), High (`H`).
- **User Interaction (UI):** None (`N`), Required (`R`).
- **Impact Metrics:** Confidentiality (`C`), Integrity (`I`), Availability (`A`).
A vulnerability with Network vector, Low complexity, No privileges required, and High impact achieves a critical CVSS score of 9.8-10.0.

#### Q157: What is Path Traversal (Directory Traversal) and how does `resolveSafePath` prevent it?
**Answer:**
- **General concept:** Path traversal occurs when untrusted input containing relative traversal sequences (`../` or `..\`) causes file operations to escape the intended parent directory, overwriting critical files outside the project root.
- **DevFlow implementation:** In [`src/utils/paths.ts`](src/utils/paths.ts), `resolveSafePath()` resolves the absolute canonical paths and asserts `!relative.startsWith('..') && !path.isAbsolute(relative)`. If an escape or Windows cross-drive switch is detected, it throws `FilesystemError`.
- **Limitation:** Performs purely lexical string containment checking. Does not resolve symbolic links using `fs.realpath`. If an in-boundary symlink points outside the directory, lexical path checks do not detect it.

#### Q158: What is Command Injection vs Argument Injection in subprocess execution?
**Answer:**
- **Command Injection:** Untrusted input is passed to a shell (`/bin/sh -c`), allowing an attacker to inject command chaining operators (`;`, `&&`) and execute arbitrary secondary programs.
- **Argument Injection:** The program is executed directly without a shell, but user input is passed as a flag or argument that alters the program's behavior unexpectedly (e.g. passing `--upload-pack` to `git clone`). DevFlow prevents command injection by disabling shells (`shell: false`) and sanitizes argument arrays.

#### Q159: What is the Principle of Least Privilege and how does it apply to CLI tools and CI/CD runners?
**Answer:** The Principle of Least Privilege states that every module, process, and user must operate with only the minimum set of permissions necessary to perform its legitimate function. For CLI tools and CI runners:
1. CI tokens (`GITHUB_TOKEN`) should have read-only permissions by default, elevating to write only on specific jobs (`permissions: contents: read`).
2. Subprocesses should run under non-root user accounts.
3. File write permissions should be restricted strictly to target build directories.

#### Q160: What is Secret Scanning and how does DevFlow prevent credential leaks in terminal outputs?
**Answer:** Secret scanning inspects text strings, commits, and logs for patterns matching API tokens, private keys, and passwords. DevFlow implements `logger.sanitize()` in [`src/utils/logger.ts`](src/utils/logger.ts). It executes regex replacements across stdout and stderr streams to mask:
- Private keys (`-----BEGIN PRIVATE KEY-----`).
- Bearer tokens (`Bearer [A-Za-z0-9._~+/-]+`).
- GitHub and npm personal access tokens (`ghp_[A-Za-z0-9]+`, `npm_[A-Za-z0-9]+`).
- URI query string passwords and tokens (`token=[^&]+`).

#### Q161: What is the difference between direct dependencies and transitive dependencies in security audits?
**Answer:**
- **Direct Dependencies:** Packages explicitly listed in your `package.json` under `dependencies` or `devDependencies`.
- **Transitive Dependencies:** Packages required by your direct dependencies (the dependencies of your dependencies). In modern applications, over 90% of installed packages and vulnerabilities reside in transitive dependencies.

#### Q162: What is a "phantom dependency" and how do modern package managers avoid it?
**Answer:** A phantom dependency occurs when a project imports a package that is present inside `node_modules` (because it was hoisted by npm or yarn) but is *not* explicitly declared in `package.json`. If an upstream direct dependency stops requiring it, the phantom dependency disappears, breaking the build. Modern package managers like pnpm solve this using content-addressable storage and non-flat symlinked `node_modules` trees.

#### Q163: What is a Software Bill of Materials (SBOM) and what standard formats exist?
**Answer:** An SBOM is a formal, machine-readable inventory of all software components, libraries, modules, and licenses included in an application, along with supply chain metadata and hashes. The two leading open industry standards are:
- **SPDX (Software Package Data Exchange):** An ISO/IEC standard (ISO/IEC 5962:2021) managed by the Linux Foundation.
- **CycloneDX:** A lightweight, security-focused SBOM standard developed by OWASP.

#### Q164: What is the SLSA (Supply-chain Levels for Software Artifacts) framework?
**Answer:** SLSA (pronounced "salsa") is a security framework of standards and controls developed by Google and OpenSSF to prevent tampering and improve software supply chain integrity. It defines four maturity levels (SLSA 1 through 4) covering:
- Build process isolation and automation.
- Cryptographically verifiable, non-falsifiable provenance.
- Hermetic, reproducible builds.
- Two-person code review.

#### Q165: What is ReDoS (Regular Expression Denial of Service) and how can it be mitigated?
**Answer:** ReDoS occurs when an application evaluates a regular expression with "catastrophic backtracking" (typically involving nested quantifiers like `(a+)+$`) against a crafted malicious input string. The regex engine's search tree expands exponentially ($O(2^n)$), consuming 100% CPU and hanging the Node.js event loop. Mitigations include: (1) using linear-time regex engines (RE2), (2) avoiding nested greedy quantifiers, and (3) enforcing strict input length limits before evaluation.

#### Q166: Why should production Docker containers never run as the `root` user?
**Answer:** In Docker, by default, the `root` user inside the container shares the same UID (UID 0) as the `root` user on the host kernel. If an attacker achieves a container escape (via a kernel vulnerability or misconfigured volume mount), they obtain full root privileges over the host operating system. DevFlow's Docker generation templates create and switch to a non-root user (e.g. `USER node` or `USER appuser`) before the runtime entry point.

#### Q167: What is Content Security Policy (CSP) and does it apply to CLI applications?
**Answer:** CSP is an HTTP response header that restricts the resources (scripts, images, stylesheets) that a browser can load and execute, preventing Cross-Site Scripting (XSS) and data exfiltration. Because CLI applications run directly in Node.js without a browser DOM, CSP headers do not apply to CLIs. CLI security focuses on input validation, command sanitization, and filesystem path sandboxing.

#### Q168: How does DevFlow's `AuditService` differentiate between vulnerable versions and fixed versions?
**Answer:**
- **General concept:** Vulnerability advisories specify vulnerable version ranges (e.g. `>= 1.0.0 < 1.3.4`), whereas the project has an exact installed version (e.g. `1.2.0`). Remediation may require updating a top-level parent package rather than the vulnerable transitive package.
- **DevFlow implementation:** In [`src/modules/dependency-audit/audit-service.ts`](src/modules/dependency-audit/audit-service.ts), `AuditService` traverses `npm audit --json`. It extracts `vulnerableVersions` from the advisory, resolves the *actually installed* version from `node_modules` or `package-lock.json`, and inspects `fixAvailable`. If `fixAvailable.name !== pkgName`, it leaves `fixedVersion = null` and directs the user to update the top-level parent package.
- **Limitation:** DevFlow relies on the structured data provided by `npm audit --json` and `package-lock.json`; it does not perform offline dependency graph compilation.

#### Q169: What is OpenSSF Scorecard and how does it assess open-source repository security?
**Answer:** OpenSSF Scorecard is an automated security evaluation tool that scans GitHub/GitLab repositories for critical security practices. It evaluates 18+ automated checks including: branch protection rules, pinned CI dependencies, active maintenance, signed commits, CodeQL scanning, fuzzing, and binary artifact management, returning a score from 0 to 10.

#### Q170: What is Static Application Security Testing (SAST) and what is DevFlow's actual implementation?
**Answer:**
- **General concept:** SAST analyzes source code without executing it to detect security vulnerabilities, anti-patterns, and compliance issues.
- **DevFlow implementation:** DevFlow includes static analysis through ESLint configuration rules and the Standards Compliance Engine (`devflow standards check`), which checks repository governance rules (`require-gitignore`, `require-typechecking`, etc.).
- **Limitation:** DevFlow's generated GitHub Actions workflows do *not* include automated GitHub CodeQL actions or external commercial SAST scanners. Any CodeQL integration must be added separately.

---

### 6.8 DevOps, Docker & CI/CD Engineering (20 Questions)

#### Q171: What is Multi-Stage Docker Building and why is it essential for production images?
**Answer:** Multi-stage building uses multiple `FROM` instructions in a single `Dockerfile`. Each stage can use a distinct base image and copy artifacts from previous stages. It is essential because:
1. It separates the build environment (containing compilers, TypeScript, package managers, development headers) from the runtime environment.
2. Production runtime images contain only the compiled binary or transpiled JavaScript and production dependencies, drastically shrinking image size (e.g. from 1.2GB down to 90MB).
3. It minimizes the attack surface by excluding package managers (`npm`), source code, git metadata, and compiler tools from the production container.

#### Q172: How does Docker Layer Caching work and how should Dockerfile instructions be ordered to optimize cache hits?
**Answer:** Docker caches the filesystem diff generated by each instruction. During a build, Docker checks if the instruction and its input files are identical to a previously built layer. If a layer changes, that layer and all subsequent layers must be rebuilt from scratch (cache invalidation). To maximize cache hits:
1. Order instructions from least frequently changed to most frequently changed.
2. Copy `package.json` and `package-lock.json` first, then run `npm ci`.
3. Copy application source code *after* dependency installation, ensuring source code edits do not trigger redundant dependency reinstalls.

#### Q173: What is the Docker Daemon and how does the Docker CLI communicate with it?
**Answer:** The Docker Daemon (`dockerd`) is a persistent background service running on the host OS that manages container lifecycles, images, networks, and storage volumes. The Docker CLI (`docker`) is a lightweight client binary that communicates with the daemon via a REST API over a Unix Domain Socket (`/var/run/docker.sock` on Linux/macOS) or a Named Pipe (`\\.\pipe\docker_engine` on Windows).

#### Q174: What causes the `Cannot connect to the Docker daemon` error, and how does DevFlow diagnose it?
**Answer:** This error occurs when the Docker CLI binary is installed on the host `PATH`, but the background daemon process (`dockerd` or Docker Desktop) is not running or the current user lacks permissions to read/write the Docker socket. In [`src/modules/docker/docker-service.ts`](src/modules/docker/docker-service.ts), DevFlow's `checkDockerStatus()` detects this by running `docker version --format {{.Server.Version}}` with a 4s timeout and `allowFailure: true`, classifying the result as `daemon_stopped` with actionable remediation guidance.

#### Q175: What are Rootless Containers and what security advantages do they provide?
**Answer:** Rootless containers allow the Docker daemon and containers to run entirely inside a user namespace without root privileges. Even if an attacker achieves a full container escape or compromises the daemon, they only obtain the permissions of an unprivileged user on the host system, completely mitigating host takeover risks.

#### Q176: What Linux kernel primitives underpin container isolation?
**Answer:** Containers are isolated processes underpinned by two core Linux kernel primitives:
1. **Control Groups (cgroups):** Enforce resource constraints and metering (CPU, memory, disk I/O, network bandwidth, number of PIDs).
2. **Namespaces:** Provide isolation of system resources:
   - `pid` (process tree isolation)
   - `net` (network interfaces, routing tables, port bindings)
   - `mnt` (filesystem mount points)
   - `ipc` (inter-process communication queues)
   - `uts` (hostname and domain name)
   - `user` (maps container UIDs to unprivileged host UIDs)

#### Q177: What is the difference between an Ephemeral CI Runner and a Persistent Self-Hosted Runner?
**Answer:**
- **Ephemeral Runners (e.g. GitHub-hosted runners):** A fresh virtual machine or container is provisioned for every single workflow run and destroyed immediately upon job completion. Provides absolute isolation and guarantees no state or secrets leak between jobs.
- **Persistent Self-Hosted Runners:** Dedicated physical machines or VMs maintained by the organization. Faster job starts and shared disk caches, but vulnerable to state pollution across runs, cross-job credential leaks, and maintenance overhead.

#### Q178: Why should GitHub Actions steps pin action versions by immutable full commit SHA instead of tags?
**Answer:** Git tags (e.g. `actions/checkout@v4`) are mutable references that can be deleted or force-pushed by repository maintainers or an attacker who compromises the repository. Pinning by full 40-character commit SHA (e.g. `actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1`) provides cryptographic immutability, guaranteeing that the exact reviewed code is executed in every build.

#### Q179: How does GitHub Actions caching (`actions/cache` or `cache: 'npm'`) optimize dependency installation?
**Answer:** Dependency caching computes a cache key based on the OS and the SHA-256 hash of lockfiles (`hashFiles('**/package-lock.json')`). If the lockfile has not changed, the action restores the cached dependency directory from GitHub storage in seconds, bypassing external registry tarball downloads and reducing CI build times significantly.

#### Q180: What is the difference between CI Artifacts and CI Workspaces?
**Answer:**
- **CI Artifacts:** Compressed archives (e.g. test reports, code coverage HTML, compiled distribution tarballs) uploaded to the CI platform storage via `actions/upload-artifact`. They persist after the workflow finishes and can be downloaded by engineers.
- **CI Workspaces:** Transient filesystem volumes shared between concurrent or sequential steps within a single runner instance; they are discarded when the runner VM shuts down.

#### Q181: What is a Matrix Build in CI/CD and when should it be used?
**Answer:** A matrix build evaluates a job definition across multiple input variables (e.g. operating systems `[ubuntu-latest, windows-latest, macos-latest]` and Node.js versions `[18.x, 20.x, 22.x]`). GitHub Actions spawns parallel job instances for every combination, allowing cross-platform and multi-runtime compatibility verification in a single workflow.

#### Q182: What is the difference between `ENTRYPOINT` and `CMD` in a Dockerfile?
**Answer:**
- `ENTRYPOINT`: Specifies the primary executable that will always run when the container starts (e.g. `ENTRYPOINT ["node", "dist/server.js"]`).
- `CMD`: Provides default arguments to the `ENTRYPOINT` or specifies the default command if no `ENTRYPOINT` is defined (e.g. `CMD ["node", "dist/server.js"]`). Arguments passed to `docker run <image> <args>` override `CMD`, but append to `ENTRYPOINT`.

#### Q183: How does `.dockerignore` improve Docker build performance and security?
**Answer:** When `docker build` runs, the Docker CLI sends the entire build context directory to the Docker daemon. A properly configured `.dockerignore` excludes `node_modules/`, `.git/`, `.env`, temporary files, and local build artifacts. This:
1. Prevents accidental inclusion of sensitive secrets (`.env`) into image layers.
2. Speeds up build transfers by preventing gigabytes of local dependencies from uploading to the daemon.
3. Prevents host-compiled binary artifacts from conflicting with container OS binaries.

#### Q184: What is the difference between Continuous Integration (CI), Continuous Delivery (CD), and Continuous Deployment?
**Answer:**
- **Continuous Integration (CI):** Developers merge code to the mainline frequently; automated builds, tests, and linters run on every commit to catch integration regressions early.
- **Continuous Delivery (CD):** Builds, tests, and packages artifacts automatically so that software is always in a releasable state, but deployment to production requires manual human approval.
- **Continuous Deployment:** Every change that passes all automated CI/CD pipeline stages is deployed directly to production environments automatically without manual intervention.

#### Q185: What are GitHub Actions concurrency groups and why are they used on pull requests?
**Answer:** Concurrency groups (configured via `concurrency: { group: ..., cancel-in-progress: true }`) ensure that only one workflow run executes for a given pull request branch at a time. If a developer pushes three commits in quick succession, GitHub Actions cancels the obsolete in-progress builds and runs only the latest commit, saving CI runner minutes and reducing pipeline congestion.

#### Q186: What is a Container Healthcheck instruction (`HEALTHCHECK`) and how does Docker evaluate container liveness?
**Answer:** The `HEALTHCHECK` instruction tells Docker how to test that the containerized process is healthy (e.g. `HEALTHCHECK --interval=30s --timeout=5s CMD wget --spider http://localhost:3000/health || exit 1`). Docker periodically runs the command inside the container. If it exits with 0, the container is marked `healthy`; if it fails consecutively, it is marked `unhealthy`, allowing orchestrators (Docker Compose, Kubernetes) to restart or route traffic away from the container.

#### Q187: What is Docker Compose and how does DevFlow generate development environment configurations?
**Answer:** Docker Compose is a declarative tool for defining and running multi-container applications via YAML (`docker-compose.yml`). DevFlow's `DockerService` generates Compose configurations with application service definitions, port mappings, environment variables, optional PostgreSQL and Redis service blocks, healthchecks, and named volumes for database persistence.

#### Q188: What is Infrastructure as Code (IaC) and what principles guide modern CI/CD configuration management?
**Answer:** IaC manages infrastructure and deployment pipelines using machine-readable definition files rather than manual UI configuration. Core principles:
1. **Version Controlled:** All pipelines are stored in git alongside application code (`.github/workflows/`).
2. **Declarative:** Defines the desired end-state rather than imperative scripting steps.
3. **Idempotent:** Re-running the pipeline produces identical infrastructure state.
4. **Reproducible:** Environments can be recreated reliably from scratch anywhere.

#### Q189: How does DevFlow validate Docker configuration files?
**Answer:**
- **General concept:** Static configuration validation inspects files without requiring a live daemon, whereas runtime validation checks communication with the daemon socket.
- **DevFlow implementation:** In [`src/modules/docker/docker-service.ts`](src/modules/docker/docker-service.ts), `DockerService` performs:
  1. **Dockerfile Instruction Checking:** Inspects `Dockerfile` text to confirm presence of `FROM ` instruction and checks for a non-root `USER` instruction.
  2. **Compose YAML Parsing:** Parses `docker-compose.yml` via `YAML.parse()` to ensure valid YAML structure and presence of `services`.
  3. **Daemon Inspection:** Probes `docker version --format {{.Server.Version}}` with a 4s timeout.
- **Correction:** DevFlow performs text instruction checks and YAML parsing; it does *not* perform abstract syntax tree (AST) parsing of Dockerfiles.

#### Q190: What are the key stages of an enterprise CI/CD pipeline, and what does DevFlow actually configure?
**Answer:**
- **General concept:** An enterprise CI/CD pipeline typically comprises five sequential stages: (1) Code formatting & linting, (2) Type checking, (3) Automated unit/integration testing, (4) Security auditing & SAST scanning, and (5) Container building & artifact publishing.
- **DevFlow implementation:** In generated GitHub Actions workflows (`.github/workflows/ci.yml`), DevFlow configures:
  1. Repository checkout (`actions/checkout`).
  2. Node.js or Python setup with package caching (`cache: 'npm'` or `cache: 'pip'`).
  3. Dependency installation (`npm ci` or `pip install`).
  4. Code formatting verification (`npm run format:check`).
  5. Code linting (`npm run lint` or `ruff check .`).
  6. Type checking (`npm run typecheck`).
  7. Automated testing (`npm test` or `pytest`).
  8. Project build (`npm run build`).
  9. Dependency security audit (`npm audit --audit-level=...` or `pip-audit`).
- **Limitation:** DevFlow's generator does not include container image publishing or CodeQL steps.

---

## 7. Project Limitations & Interview Guardrails

When discussing DevFlow in technical interviews or architecture reviews, an engineer must accurately represent what DevFlow does internally versus what relies on host environments, external tools, or has not been implemented.

### 7.1 Verified Genuine Implementations
The following capabilities are implemented in the DevFlow codebase and verified by 98 passing automated tests:
1. **Template Discovery & Scaffolding:** In-memory Handlebars compilation and file generation in [`src/core/template-engine.ts`](src/core/template-engine.ts).
2. **Lexical Path Boundary Guard:** `resolveSafePath()` in [`src/utils/paths.ts`](src/utils/paths.ts) prevents directory traversal (`../`) and Windows cross-drive switches lexically.
3. **Subprocess Management:** `CommandRunner` in [`src/core/command-runner.ts`](src/core/command-runner.ts) wraps `execa` with `shell: false`, configurable timeouts, and direct child cleanup on exit.
4. **Lockfile-Aware Audit Resolution:** `AuditService` in [`src/modules/dependency-audit/audit-service.ts`](src/modules/dependency-audit/audit-service.ts) parses `npm audit --json`, cross-references `package-lock.json` (`packages` and `dependencies`) and on-disk files, distinguishes direct from transitive vulnerabilities, and avoids version inversion.
5. **Quality Gate Orchestrator:** `QualityService` in [`src/modules/quality-check/quality-service.ts`](src/modules/quality-check/quality-service.ts) runs lint, format, test, typecheck, audit, and standards sequentially with per-check `try...catch` isolation.
6. **Docker Instruction Checking & Compose Parsing:** `DockerService` in [`src/modules/docker/docker-service.ts`](src/modules/docker/docker-service.ts) validates `FROM ` and non-root `USER` via text checks, parses Compose via `YAML.parse()`, and checks daemon availability via `docker version`.
7. **Standards Compliance Engine:** `StandardsService` and `rules.ts` evaluate 7 concrete rules (`require-readme`, `require-tests`, `require-docker`, `require-cicd`, `require-env-example`, `require-gitignore`, `require-typechecking`).
8. **Boundary-Preserved Documentation:** `DocsService` updates only between `<!-- devflow:managed:start -->` and `<!-- devflow:managed:end -->`.
9. **Cross-Platform Path Normalization:** `normalizeDisplayPath()` transforms Windows `\` to `/`.

---

### 7.2 Verified Limitations & Unimplemented Capabilities
1. **Rollback Overwrite Limitation:** `FileManager.rollback()` only removes files recorded in `this.createdFiles` (files where `!exists` was true before writing). Pre-existing files that were overwritten are not backed up or restored. If `fs.rename` throws during an atomic write, the temporary file is not explicitly cleaned up by the catch block.
2. **Symlink Containment Limitation:** `resolveSafePath()` performs purely lexical string path resolution (`path.resolve()`, `path.relative()`). It does not dereference symlinks using `fs.realpath()`. An in-boundary symlink pointing outside the workspace boundary will not be detected.
3. **Process Tree Cleanup Limitation:** `CommandRunner` sets `cleanup: true`, which sends `SIGTERM` to the direct child process. It does not configure detached process group signaling (`detached: true` with negative PID signaling), meaning detached background grandchild processes are not reaped.
4. **CI/CD Provider Limitation:** DevFlow generates workflows exclusively for **GitHub Actions** (`.github/workflows/ci.yml`). GitLab CI is declared as a type option in `CIOptions`, but no generator implementation exists.
5. **No CodeQL Generation:** DevFlow does not generate CodeQL workflow actions or configurations.
6. **Docker Instruction Checks (Not AST):** `DockerService.validate()` uses simple string checks (`!dockerfileText.includes('FROM ')`) rather than an abstract syntax tree (AST) parser.
7. **External Runtime Dependencies:** Live security audits require an active internet connection to `registry.npmjs.org` and a valid lockfile; running Docker containers requires Docker Desktop or the Linux Docker daemon running; remote CI workflows execute on GitHub runners.

---

### 7.3 Interview Talking Points: Accurate Engineering vs Overstatements

| Topic | Accurate Engineering Claim | Overstatement to Avoid |
| :--- | :--- | :--- |
| **Atomic File Operations** | "DevFlow writes files to a temporary sibling file and renames them via `fs.rename`, rolling back newly created files if scaffolding fails." | "DevFlow implements a transactional ACID filesystem with snapshot recovery of overwritten files." |
| **Docker Integration** | "DevFlow generates multi-stage Dockerfiles and validates syntax by inspecting required instructions (`FROM`, `USER`) and parsing Compose YAML." | "DevFlow performs full AST parsing of Dockerfiles and manages container lifecycles directly." |
| **Security Auditing** | "DevFlow parses `npm audit --json` and inspects `package-lock.json` packages/dependencies to resolve actual installed versions and avoid version inversion." | "DevFlow compiles a full dependency graph solver and maintains a proprietary CVE database." |
| **Subprocess Execution** | "DevFlow invokes binaries directly via `execa` with `shell: false`, configurable timeouts, and direct child cleanup on exit." | "DevFlow has built a custom C++ process isolation sandbox with universal process tree termination." |
| **CI/CD Automation** | "DevFlow generates and validates GitHub Actions workflows with dependency caching and SHA pinning in strict mode." | "DevFlow provides multi-cloud CI/CD deployment automation across GitHub Actions and GitLab CI with CodeQL SAST." |
| **Design Patterns** | "DevFlow uses a modular layered architecture, with the Strategy pattern implemented for Standards rules in `rules.ts`." | "DevFlow strictly implements Hexagonal Architecture with an Inversion of Control container across all services." |

---

## 8. Recommended Codebase Reading Order

To understand and master the DevFlow codebase, follow this sequential reading path:

```mermaid
flowchart TD
    Step1["1. Types & Constants<br/>src/types/index.ts<br/>src/utils/constants.ts"] --> Step2["2. Core Utilities<br/>src/utils/errors.ts<br/>src/utils/logger.ts<br/>src/utils/paths.ts<br/>src/utils/platform.ts"]
    Step2 --> Step3["3. Core Infrastructure<br/>src/core/file-manager.ts<br/>src/core/command-runner.ts<br/>src/core/template-engine.ts"]
    Step3 --> Step4["4. Configuration & Detection<br/>src/core/configuration-manager.ts<br/>src/core/project-detector.ts"]
    Step4 --> Step5["5. Domain Feature Modules<br/>src/modules/standards/ & rules.ts<br/>src/modules/dependency-audit/<br/>src/modules/quality-check/<br/>src/modules/docker/<br/>src/modules/cicd/"]
    Step5 --> Step6["6. CLI Command Layer<br/>src/cli/program.ts<br/>src/cli/register-commands.ts<br/>src/cli/commands/*.command.ts"]
    Step6 --> Step7["7. Automated Test Suites<br/>tests/unit/*.test.ts<br/>tests/integration/*.test.ts"]
```

### Step 1: Types and Constants
- [`src/types/index.ts`](src/types/index.ts): Core domain types (`ScaffoldingOptions`, `SecurityAuditReport`, `QualityReport`, `DockerValidationResult`, `GlobalOptions`, `ExitCode`).
- [`src/utils/constants.ts`](src/utils/constants.ts): Product metadata, exit code mappings, default timeouts (`DEFAULT_EXEC_TIMEOUT_MS = 60000`).

### Step 2: Core Utilities
- [`src/utils/errors.ts`](src/utils/errors.ts): `DevFlowError` hierarchy, error codes, and suggestions.
- [`src/utils/logger.ts`](src/utils/logger.ts): Logger implementation and `logger.sanitize()` token redaction.
- [`src/utils/paths.ts`](src/utils/paths.ts): `resolveSafePath()` lexical traversal guard and `normalizeDisplayPath()`.
- [`src/utils/platform.ts`](src/utils/platform.ts): `getPlatformInfo()` runtime inspection.

### Step 3: Core Infrastructure Services
- [`src/core/file-manager.ts`](src/core/file-manager.ts): Atomic writing via staging, overwrite verification, and rollback tracking.
- [`src/core/command-runner.ts`](src/core/command-runner.ts): Non-shell subprocess execution, timeouts, and executable lookups.
- [`src/core/template-engine.ts`](src/core/template-engine.ts): Template discovery, Handlebars helper registration, and scaffolding pipeline.

### Step 4: Configuration & Project Detection
- [`src/core/configuration-manager.ts`](src/core/configuration-manager.ts): Zod schema validation and `.devflowrc.json` persistence.
- [`src/core/project-detector.ts`](src/core/project-detector.ts): Manifest inspection and tooling detection.

### Step 5: Domain Feature Modules
- [`src/modules/standards/standards-service.ts`](src/modules/standards/standards-service.ts) & [`rules.ts`](src/modules/standards/rules.ts): Strategy pattern implementation for 7 standards rules.
- [`src/modules/dependency-audit/audit-service.ts`](src/modules/dependency-audit/audit-service.ts): `npm audit --json` parsing, lockfile node path resolution, and remediation logic.
- [`src/modules/quality-check/quality-service.ts`](src/modules/quality-check/quality-service.ts): Sequential quality check execution and report aggregation.
- [`src/modules/quality-check/health-service.ts`](src/modules/quality-check/health-service.ts): Weighted health score calculation.
- [`src/modules/docker/docker-service.ts`](src/modules/docker/docker-service.ts): Dockerfile instruction checks, Compose YAML parsing, and daemon status check.
- [`src/modules/cicd/cicd-service.ts`](src/modules/cicd/cicd-service.ts): GitHub Actions workflow synthesis and idempotent updating.
- [`src/modules/diagnostics/doctor-service.ts`](src/modules/diagnostics/doctor-service.ts): System and tool diagnostics.
- [`src/modules/git-integration/git-service.ts`](src/modules/git-integration/git-service.ts): Git repository inspection and PR diff analysis.
- [`src/modules/documentation/docs-service.ts`](src/modules/documentation/docs-service.ts): Boundary-preserved README generation.
- [`src/modules/ai-assistant/ai-service.ts`](src/modules/ai-assistant/ai-service.ts): Offline-first local pattern matching and provider abstraction.

### Step 6: CLI Command Layer
- [`src/cli/program.ts`](src/cli/program.ts): Commander program initialization, global options, and top-level error trapping in `runCLI()`.
- [`src/cli/register-commands.ts`](src/cli/register-commands.ts): Command registry wiring.
- [`src/cli/commands/*.command.ts`](src/cli/commands/): Subcommand action handlers.

### Step 7: Automated Test Suites
- [`tests/unit/file-manager.test.ts`](tests/unit/file-manager.test.ts): Atomic write, overwrite protection, and rollback unit tests.
- [`tests/unit/command-runner.test.ts`](tests/unit/command-runner.test.ts): Subprocess execution, dry-run, timeout, and mock tests.
- [`tests/unit/audit-service.test.ts`](tests/unit/audit-service.test.ts): Mock npm audit JSON fixtures and version resolution tests.
- [`tests/unit/standards-rules.test.ts`](tests/unit/standards-rules.test.ts): Individual standard rule evaluation tests.
- [`tests/unit/docker-service.test.ts`](tests/unit/docker-service.test.ts): Docker status and validation tests.
- [`tests/unit/cicd-service.test.ts`](tests/unit/cicd-service.test.ts): GitHub Actions generation and idempotency tests.
- [`tests/integration/scaffolding.test.ts`](tests/integration/scaffolding.test.ts): End-to-end scaffolding and test cleanliness in temporary folders.
- [`tests/integration/cli.test.ts`](tests/integration/cli.test.ts): Top-level CLI flag tests (`--version`, `--help`).
