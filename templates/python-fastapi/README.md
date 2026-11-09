# {{projectName}}

> {{description}}

Generated with [DevFlow](https://github.com/devflow-cli/devflow).

## Features

- **FastAPI** high-performance Python framework.
- **Pydantic v2** & **pydantic-settings** configuration.
- Health check endpoints (`/health` and `/api/v1/health`).
- Interactive OpenAPI documentation at `/docs`.
- Structured logging and global exception handling.
- **Pytest** automated testing suite.
- Production-ready Docker container & Docker Compose.
- GitHub Actions CI workflow.

## Getting Started

### Prerequisites

- Python >= 3.10
- pip

### Installation

```bash
python -m venv .venv
# On Windows: .venv\Scripts\activate
# On Unix/macOS: source .venv/bin/activate
pip install -e ".[dev]"
```

### Environment Configuration

```bash
cp .env.example .env
```

### Run Locally

```bash
uvicorn app.main:app --reload --port 8000
```

Visit [http://localhost:8000/docs](http://localhost:8000/docs) for interactive API documentation.

### Run Tests

```bash
pytest
ruff check .
```

### Docker

```bash
docker compose up --build
```
