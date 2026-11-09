# Security Policy

## Supported Versions

Security updates and patches are provided for the following versions of DevFlow:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

---

## Reporting a Vulnerability

The DevFlow engineering team takes security vulnerabilities seriously. If you discover a security issue or vulnerability within DevFlow, please **do not open a public issue**.

### Reporting Process

1. Email your vulnerability details to: `security@devflow.local` (or file a confidential GitHub Security Advisory).
2. Include:
   - Description of the vulnerability and potential impact.
   - Exact steps or minimal reproduction script.
   - Operating system and Node.js version.
   - Any suggested remediation or patch.

### Response Time

- **Acknowledgment:** Within 24-48 business hours.
- **Triage & Assessment:** Within 5 business days.
- **Remediation & Advisory:** Patches will be developed and released under semantic versioning.

---

## Security Principles

- **Zero Credential Storage:** DevFlow never persists credentials into repository files.
- **Directory Traversal Immunity:** Path resolution validates all destinations.
- **Safe Subprocess Execution:** External commands use array argument separation to prevent shell injection.
- **Privacy First:** Source code is never transmitted to third parties without explicit consent.
