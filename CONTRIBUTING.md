# Contributing to docs-site

Thank you for helping improve `docs-site`! This guide covers local setup, testing, code quality checks, and an overview of the project's architecture.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Testing & Verification](#testing--verification)
- [Linting & Formatting](#linting--formatting)
- [Architecture Overview](#architecture-overview)

## Prerequisites

Ensure you have the following tools installed before getting started:
- **[uv](https://docs.astral.sh/uv/)** (Python package & environment management)
- **[Node.js](https://nodejs.org/)** (for running Biome JS/CSS tooling via `npx`)

## Local Development Setup

1. **Install dependencies and sync the virtual environment:**

    ```bash
    uv sync --group dev
    ```

2. **Run and preview changes locally:**
    Test your local changes without reinstalling the package:

    ```bash
    uv run python -m docs_site tests/fixtures/sample_docs/ --no-open
    ```

## Testing & Verification

Run type checks and unit tests to verify your changes:

```bash
# Static type checking
uv run mypy src/docs_site

# Test suite
uv run pytest
```

## Linting & Formatting

This project uses:

- **[Ruff](https://docs.astral.sh/ruff/?utm_source=gemini)** for Python
- **[djLint](https://djlint.com/?utm_source=gemini)** for Jinja templates (`pyproject.toml`)
- **[Biome](https://biomejs.dev/?utm_source=gemini)** for JavaScript & CSS (`biome.json`)

### Run Lint Checks

```bash
# Python
uv run ruff check .
uv run ruff format --check .

# Jinja templates
uv run djlint --check --lint .

# JavaScript & CSS
npx @biomejs/biome check
```

### Apply Automatic Formatting

```bash
# Python & Jinja
uv run ruff format .
uv run djlint --reformat .

# JavaScript & CSS
npx @biomejs/biome format --write
```

## Architecture Overview

```text
src/docs_site/
├── cli.py             # argparse CLI entry point
├── site_builder.py    # Orchestrates build (copies static/, renders templates/)
├── manifest.py        # Folder scanning & manifest assembly
├── html_processing.py # HTML wrapping & heading extraction (BeautifulSoup)
├── pdf_processing.py  # PDF text & outline extraction (pypdf)
├── types.py           # Shared typed data structures
├── utils.py           # Helper functions (slugify, safe_id)
├── templates/         # Jinja2 templates (shell, welcome page)
└── static/            # CSS & JS assets copied directly to build output
```

### Subsystem Breakdown

- **Frontend (`static/`)**: CSS and JS assets for presentation and performing the multi-file text search. Requires rerruning `docs-site` to refresh.
- **Backend (`manifest.py`, etc.)**: Responsible for scanning input files and constructing a JSON-serializable manifest, keeping business logic cleanly separated from rendering logic.
