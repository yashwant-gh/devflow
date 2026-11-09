# Changelog

All notable changes to the DevFlow platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-09

### Added
- **Core CLI Engine:**
  - Commander.js command registry with custom categorized help and ASCII banner.
  - Global options: `--help`, `--version`, `--verbose`, `--quiet`, `--json`, `--no-interactive`, `--yes`, `--dry-run`, `--cwd`.
  - Standard exit code contract (0: success, 1: general failure, 2: invalid args, 3: missing dependency, 4: quality check failure, 5: security policy failure, 130: interrupted).
- **Project Scaffolding Engine:**
  - Handlebars-driven template engine with variable substitution and conditional files.
  - Express.js REST API template (`node-express-api`) with strict TypeScript, Zod env validation, error middleware, and Vitest suite.
  - Python FastAPI template (`python-fastapi`) with Pydantic settings, structured logging, pytest, and Docker container.
  - Node.js CLI tool template (`node-cli`) with Commander.js and test suites.
- **Developer Automation:**
  - `devflow add` command supporting `testing`, `linting`, `formatting`, and `docker`.
  - `devflow test` and `devflow lint` wrappers forwarding flags to detected project runners.
- **Docker Automation:**
  - Multi-stage build Dockerfiles with non-root security.
  - Docker Compose generator with optional PostgreSQL and Redis services.
  - `devflow docker validate` with syntax and runtime checks.
- **CI/CD Pipeline Generator:**
  - Hardened GitHub Actions generator supporting `basic`, `standard`, and `strict` profiles.
  - Pinned commit SHAs, least-privilege `contents: read` permissions, timeouts, and caching.
  - `devflow ci validate` and `devflow ci update`.
- **Dependency Health & Security Analyzer:**
  - `devflow audit` analyzing npm and Python dependencies.
  - CVE severity categorization, configurable security policies, and `--fix` remediation.
- **Unified Quality Gate:**
  - `devflow check` running linting, formatting, tests, type checking, security audits, environment verification, and Git hygiene.
- **Developer Environment Diagnostics:**
  - `devflow doctor` reporting OS, tools (Node, npm, Git, Python, Docker), and project readiness.
- **Documentation Generator:**
  - `devflow docs generate` creating comprehensive READMEs with managed section markers.
- **Engineering Standards Rule Engine:**
  - Strategy-pattern rule engine enforcing repository standards.
  - `devflow standards init`, `check`, and `explain`.
- **Git & PR Assistant:**
  - `devflow pr analyze` and `devflow pr summary` generating structured PR markdown.
- **Privacy-Preserving AI Assistant:**
  - `devflow ai explain`, `explain-project`, and `pr-summary`.
  - 100% offline deterministic knowledge engine fallback.
  - Explicit consent guardrails for cloud LLM usage.
- **Comprehensive Test Suite & CI/CD:**
  - 98 unit and integration tests passing with Vitest across 19 suites.
  - DevFlow CI, CodeQL, release automation, and Dependabot configuration.
