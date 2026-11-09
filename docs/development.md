# DevFlow Developer & Contributor Guide

This guide covers local development workflows, code architecture, testing conventions, and build instructions for contributors to DevFlow.

---

## 1. Local Environment Setup

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Initializing the Workspace
```bash
git clone https://github.com/yashwant-gh/devflow.git
cd devflow

# Install project dependencies
npm install

# Build TypeScript to dist/
npm run build
```

---

## 2. Available Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Run DevFlow CLI directly using `tsx` (TypeScript execute) without compiling |
| `npm run build` | Compile TypeScript (`tsc`) and copy template assets to `dist/` |
| `npm test` | Run complete unit and integration test suite with Vitest |
| `npm run test:watch` | Run Vitest in interactive watch mode |
| `npm run test:coverage` | Run tests and generate v8 coverage report |
| `npm run lint` | Run ESLint across `src/` and `tests/` |
| `npm run lint:fix` | Automatically fix auto-fixable lint issues |
| `npm run format` | Format source and test files using Prettier |
| `npm run format:check` | Verify formatting consistency without writing changes |
| `npm run typecheck` | Run TypeScript type checking with zero code emission |
| `npm run clean` | Clean `dist/` and `coverage/` directories |

---

## 3. Project Directory Structure

```
devflow/
├── src/
│   ├── cli/             # CLI presentation layer (Commander, prompt adapters)
│   ├── core/            # Core infrastructure (CommandRunner, FileManager, ConfigManager)
│   ├── modules/         # Domain capability modules (Scaffolding, Quality, Audit, Docker, CI, Docs, Standards, Git, AI)
│   ├── templates/       # Bundled project templates (Express API, FastAPI, Node CLI)
│   ├── providers/       # Extensible adapters (AI providers, package managers)
│   ├── types/           # Global TypeScript type definitions and interfaces
│   ├── utils/           # Shared utilities (errors, logger, paths, constants)
│   └── index.ts         # Programmatic library entry point
├── tests/
│   ├── unit/            # Unit tests for core services and individual rules
│   └── integration/     # Integration tests for end-to-end scaffolding and CLI
├── docs/                # Comprehensive technical and architecture documentation
├── scripts/             # Build and packaging helper scripts
└── .github/workflows/   # DevFlow CI/CD automation pipelines
```

---

## 4. Extending DevFlow

### Adding a New Template
1. Create a new directory in `src/templates/<template-id>/`.
2. Add project source files with Handlebars interpolation placeholders (e.g. `{{projectName}}`).
3. If files start with dot (e.g. `.gitignore`), name them `gitignore.template` to avoid git package conflicts.
4. Register the template metadata in `src/core/template-engine.ts` in `getAvailableTemplates()`.
5. Add an integration test in `tests/integration/scaffolding.test.ts`.

### Adding a New Engineering Standard Rule
1. Implement the `StandardRule` interface in `src/modules/standards/rules.ts`.
2. Define `id`, `name`, `description`, `rationale`, `remediation`, and `evaluate(context: RuleContext)`.
3. Register the new rule in `StandardsService` constructor in `src/modules/standards/standards-service.ts`.
4. Add unit test coverage in `tests/unit/standards-rules.test.ts`.
