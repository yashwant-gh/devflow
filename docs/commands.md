# DevFlow Command Reference

Comprehensive reference guide for all DevFlow CLI commands, options, and behaviors.

---

## Global Options

The following flags are available across all DevFlow commands:

```
  -v, --version        Output current DevFlow version
  -h, --help           Output usage and command help
  --verbose            Output detailed debugging and execution timing
  --quiet              Suppress non-essential terminal output
  --json               Output machine-readable JSON
  --no-interactive     Disable interactive prompts
  -y, --yes            Automatically confirm default prompt answers
  --dry-run            Simulate operations without making changes
  --cwd <path>         Execute command against explicit target directory
```

---

## 1. `devflow init [name]`

Initialize a new project from a production-ready template.

### Arguments & Options
- `[name]`: Name of the new project directory.
- `-t, --template <id>`: `node-express-api`, `python-fastapi`, or `node-cli`.
- `--desc <description>`: Project description string.
- `--no-testing`: Exclude testing configuration.
- `--no-linting`: Exclude linting configuration.
- `--no-docker`: Exclude Docker configuration.
- `--no-compose`: Exclude Docker Compose.
- `--no-ci`: Exclude GitHub Actions CI pipeline.
- `--no-git`: Skip Git initialization.
- `--install`: Automatically install project dependencies after generation.
- `--force`: Allow scaffolding into a non-empty directory.

### Examples
```bash
devflow init my-api --template node-express-api --no-interactive
devflow init auth-service -t python-fastapi --no-docker
```

---

## 2. `devflow templates`

List all available project scaffolding templates, supported languages, categories, and tags.

```bash
devflow templates
devflow templates --json
```

---

## 3. `devflow add <feature>`

Add standardized tooling configurations to an existing project.

### Arguments
- `<feature>`: One of `testing`, `linting`, `formatting`, `docker`.

### Options
- `--force`: Overwrite existing files.
- `--postgres`: Include PostgreSQL container service (for `docker`).
- `--redis`: Include Redis container service (for `docker`).

### Examples
```bash
devflow add testing
devflow add docker --postgres --redis
```

---

## 4. `devflow check`

Execute unified engineering quality gate checks.

### Options
- `--only <checks>`: Comma-separated list of checks to run (`lint`, `format`, `test`, `typecheck`, `audit`, `env`, `structure`, `docs`, `git`).
- `--skip <checks>`: Comma-separated list of checks to skip.

### Examples
```bash
devflow check
devflow check --only lint,test
devflow check --skip audit --json
```

---

## 5. `devflow audit`

Analyze project dependencies for known security vulnerabilities and outdated versions.

### Options
- `-s, --severity <level>`: Minimum severity level (`low`, `moderate`, `high`, `critical`).
- `--fix`: Automatically apply compatible security fixes.

### Examples
```bash
devflow audit
devflow audit --severity high
devflow audit --fix
```

---

## 6. `devflow test [args...]`

Run automated project test suites using detected test runner (`vitest`, `pytest`, etc.).

```bash
devflow test
devflow test -- --watch
```

---

## 7. `devflow lint [args...]`

Run project linter using detected linter (`eslint`, `ruff`, etc.).

```bash
devflow lint
```

---

## 8. `devflow docker validate`, `init`, `build`

Manage, generate, validate, and build Docker container configurations.

### Commands
- `devflow docker validate`: Validate Dockerfile and Docker Compose configuration syntax, and check Docker CLI and daemon runtime status.
- `devflow docker init`: Generate production Dockerfile and Docker Compose configurations (`--postgres`, `--redis`, `--port`).
- `devflow docker build [tag]`: Build container image using Dockerfile (requires active Docker daemon; never fabricates success).

```bash
devflow docker validate
devflow docker init --postgres
devflow docker build my-service:latest
```

---

## 9. `devflow ci init`, `validate`, `update`

Manage CI/CD pipeline automation workflows.

### Commands
- `devflow ci init --profile [basic|standard|strict]`: Generate workflow.
- `devflow ci validate`: Validate workflow syntax and permissions.
- `devflow ci update`: Update existing workflow to match latest specification.

---

## 10. `devflow doctor`

Diagnose developer environment, system runtimes, project dependencies, and environment status.

```bash
devflow doctor
devflow doctor --json
```

---

## 11. `devflow docs generate`

Generate or update standardized `README.md` documentation while protecting user sections.

```bash
devflow docs generate
devflow docs generate --force
```

---

## 12. `devflow standards init`, `check`, `explain`

Enforce organizational engineering standards across repositories.

```bash
devflow standards init
devflow standards check
devflow standards explain [ruleId]
```

---

## 13. `devflow pr analyze` & `devflow pr summary`

Analyze Git changes, flag security and test risks, and generate Pull Request markdown.

```bash
devflow pr analyze
devflow pr summary
```

---

## 14. `devflow ai explain`, `explain-project`, `pr-summary`

Analyze failure outputs and project architecture.

```bash
devflow ai explain "test failure message"
devflow ai explain-project
devflow ai pr-summary
```

---

## 15. `devflow health`

Assess overarching project health score across quality, security, standards, and diagnostics.

```bash
devflow health
devflow health --json
```

---

## 16. `devflow config show`, `validate`, `init`

Inspect and manage configuration hierarchy.

```bash
devflow config show
devflow config validate
```
