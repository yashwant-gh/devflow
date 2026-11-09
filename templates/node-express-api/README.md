# {{projectName}}

> {{description}}

Generated with [DevFlow](https://github.com/yashwant-gh/devflow).

## Features

- **TypeScript** with strict mode.
- **Express.js** REST API.
- **Zod** environment variable validation.
- Centralized error handling and request logging.
- **Vitest** for unit and integration testing.
- Docker & Docker Compose setup.
- GitHub Actions CI pipeline.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
npm install
```

### Environment Configuration

Copy the example environment configuration:

```bash
cp .env.example .env
```

### Development

```bash
npm run dev
```

### Build & Production Run

```bash
npm run build
npm start
```

### Testing & Quality

```bash
npm test
npm run lint
npm run typecheck
```

### Docker

```bash
docker compose up --build
```
