# DevFlow Configuration Specification

DevFlow repositories are configured using `.devflowrc.json`. This file defines project metadata, quality gates, engineering standards, security policies, and automation preferences.

---

## Configuration Hierarchy

DevFlow resolves configuration in order of precedence:
1. **CLI Flags:** Explicit options passed at command invocation (e.g. `--severity high`).
2. **Project Configuration:** `.devflowrc.json` in the project root.
3. **User Configuration:** `~/.devflowrc.json` in the user's home directory.
4. **Built-in Defaults:** Safe built-in defaults.

---

## Schema Reference

```json
{
  "$schema": "https://devflow.dev/schemas/devflowrc.json",
  "version": 1,
  "project": {
    "name": "payment-service",
    "type": "node-api",
    "defaultTemplate": "node-express-api",
    "preferredPackageManager": "npm"
  },
  "standards": {
    "requireReadme": true,
    "requireTests": true,
    "requireDocker": true,
    "requireCICD": true,
    "requireEnvExample": true,
    "requireGitignore": true,
    "requireTypeChecking": true
  },
  "quality": {
    "minimumCoverage": 70,
    "failOnLintError": true,
    "failOnTypeError": true
  },
  "security": {
    "failOn": ["high", "critical"],
    "autoFix": false
  },
  "ci": {
    "provider": "github-actions",
    "profile": "standard"
  },
  "ai": {
    "consentGiven": false
  }
}
```

---

## Property Details

### `project`
- `name` *(string, required)*: The project identifier.
- `type` *(enum)*: One of `node-api`, `node-cli`, `python-fastapi`, `python-service`, `generic`.
- `preferredPackageManager` *(enum)*: One of `npm`, `pnpm`, `yarn`, `pip`, `poetry`, `uv`.

### `standards`
- `requireReadme` *(boolean, default: true)*: Enforces non-empty `README.md`.
- `requireTests` *(boolean, default: true)*: Enforces automated test suite presence.
- `requireDocker` *(boolean, default: false)*: Enforces `Dockerfile` presence.
- `requireCICD` *(boolean, default: true)*: Enforces `.github/workflows` presence.
- `requireEnvExample` *(boolean, default: true)*: Enforces `.env.example` presence.
- `requireGitignore` *(boolean, default: true)*: Enforces `.gitignore` with `.env` ignored.
- `requireTypeChecking` *(boolean, default: true)*: Enforces `tsconfig.json` with strict mode.

### `security`
- `failOn` *(array of enum)*: Severity levels that fail `devflow audit`. Values: `["low", "moderate", "high", "critical"]`.
- `autoFix` *(boolean, default: false)*: Whether to automatically run compatible remediation.
