# DevFlow Design Decisions & Architectural Rationale

This document outlines key technical decisions made during the architecture and engineering of DevFlow, detailing the trade-offs, evaluated alternatives, and engineering justifications.

---

## 1. Programming Language: TypeScript with Strict Mode

### Context
Developer tooling must be resilient, self-documenting, and free from runtime type exceptions.

### Decision
Use **TypeScript 5.6** with `strict: true`, `noImplicitAny: true`, and `noUncheckedIndexedAccess: true`.

### Justification
- **Safety:** Eliminates `undefined is not a function` errors and ensures exhaustive type matching across complex models (e.g. audit findings, diagnostic items).
- **Refactoring Confidence:** Extensive interfaces (e.g. `QualityReport`, `SecurityAuditReport`, `StandardRule`) can be modified with guaranteed compiler-verified safety across the codebase.
- **Ecosystem:** Modern Node.js LTS (v18, v20, v22) has first-class native and transpiled support for ES Modules.

---

## 2. CLI Framework: Commander.js over Yargs / Oclif

### Context
The platform requires a robust command-line argument parser with subcommands, options inheritance, and custom help generation.

### Decision
Selected **Commander.js v12**.

### Alternatives Considered
- *Oclif:* Heavy framework footprint, opinionated project structure, and difficult to embed as a lightweight library.
- *Yargs:* Flexible, but complex command registration and type definitions compared to Commander.js.

### Justification
- Lightweight, zero-dependency core.
- Clean subcommand nesting (`devflow docker validate`, `devflow ci init`, `devflow standards check`).
- Native support for async action handlers and argument arrays.
- Clean integration with Inquirer for interactive prompts.

---

## 3. Subprocess Execution: Centralized CommandRunner via Execa

### Context
A developer CLI platform frequently executes external binaries (`git`, `npm`, `docker`, `pytest`, `ruff`).

### Decision
Route **all** external process executions through a centralized `CommandRunner` wrapping `execa`.

### Justification
- **Shell Injection Immunity:** Standard `child_process.exec()` interpolates raw shell strings, making tools vulnerable to command injection. `CommandRunner` executes executables directly with argument arrays (`[file, ...args]`).
- **Security Redaction:** All process outputs are intercepted and sanitized to strip tokens, passwords, and authorization headers before logging or printing.
- **Consistent Timeout & Exit Codes:** Uniformly enforces timeouts and maps missing executables (`ENOENT`) to typed `DependencyError` instances with actionable advice.

---

## 4. Scaffolding Engine: Handlebars and Safe FileManager

### Context
Project generation must support dynamic templates, conditional files, variable substitution, and prevent repository corruption.

### Decision
Combine **Handlebars** for templating with an **Atomic File Manager**.

### Justification
- **Atomic Writes:** Files are written to temporary random files and renamed atomically, preventing partial corruption if the process is terminated abruptly.
- **Rollback Safety:** Generated files are tracked in an in-memory stack and deleted if an unhandled error occurs during scaffolding.
- **Path Traversal Prevention:** Target file paths are strictly resolved and validated with `resolveSafePath` to prevent malicious templates or inputs escaping the workspace boundary.

---

## 5. Engineering Standards: Rule Engine Pattern

### Context
Teams need to configure custom engineering rules (`.devflowrc.json`) and validate repositories against them.

### Decision
Implement the **Rule Engine / Strategy Pattern** (`StandardRule` interface).

### Justification
- Each rule (`RequireReadmeRule`, `RequireTestsRule`, `RequireDockerRule`, `RequireCICDRule`, etc.) is completely decoupled, with its own evaluation logic, rationale, and remediation.
- Adding a new rule requires zero modifications to the CLI handler or other rules.
- Testability: Rules are unit-tested in isolation against mocked filesystem contexts.

---

## 6. AI Integration: Privacy-First Local Fallback

### Context
AI assistance can be valuable for diagnosing build failures, but many corporate environments forbid transmitting proprietary code to external APIs.

### Decision
Design an `AIProvider` abstraction featuring a **Deterministic Local Knowledge Engine** as the primary offline provider, with cloud LLMs strictly opt-in requiring `--consent`.

### Justification
- **100% Offline Capability:** DevFlow works completely without an internet connection or API keys.
- **Zero Accidental Leaks:** Project code, environment variables, and Git diffs are never sent over the network unless the user explicitly passes `--consent` or `-y`.
- **Zero Hallucination Commands:** Commands suggested by the local rule engine are deterministic, verified, and safe.
