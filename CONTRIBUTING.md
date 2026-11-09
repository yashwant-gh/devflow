# Contributing to DevFlow

Thank you for your interest in contributing to DevFlow! We appreciate community contributions to make developer experience and automation better for everyone.

---

## Code of Conduct

All contributors and maintainers are expected to uphold a welcoming, respectful, and professional community. Please review our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

---

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/devflow.git
   cd devflow
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a feature branch:
   ```bash
   git checkout -b feature/my-new-feature
   ```

---

## Development Standards

- **TypeScript Strict Mode:** All source code in `src/` must pass TypeScript strict type checking (`npm run typecheck`).
- **Formatting:** Use Prettier formatting conventions (`npm run format`).
- **Linting:** Zero ESLint warnings or errors (`npm run lint`).
- **Tests:** Add unit tests for all new utilities, rules, and services in `tests/`. All tests must pass (`npm test`).
- **Safety First:** Subprocess execution must route through `CommandRunner`. Filesystem writes must route through `FileManager`.

---

## Submitting Pull Requests

1. Run the test suite:
   ```bash
   npm test
   npm run typecheck
   npm run format:check
   ```
2. Commit your changes using conventional commit messages:
   ```bash
   git commit -m "feat(standards): add license file requirement rule"
   ```
3. Push to your branch and open a Pull Request against `main`.
4. DevFlow CI will automatically validate your build, tests, and formatting.
