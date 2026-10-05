# docs-site

[![PyPI](https://img.shields.io/pypi/v/docs-site)](https://pypi.org/project/docs-site/)
[![CI](https://github.com/lucas-rollin/docs-site/actions/workflows/ci.yml/badge.svg)](https://github.com/lucas-rollin/docs-site/actions/workflows/ci.yml)
[![Python versions](https://img.shields.io/pypi/pyversions/docs-site)](https://pypi.org/project/docs-site/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Turn a folder of Markdown, HTML, and PDF files into a clean, searchable, dark-mode-ready local documentation site with built-in LLM support.

## Features

- **Static & Offline**: Generates a self-contained static site with zero runtime server required. Works out of the box with `file:///` URLs or any static host.
- **Multi-Format Processing**:
  - **Markdown** (`.md`, `.markdown`): Rendered with syntax highlighting, tables, and admonitions.
  - **HTML** (`.html`, `.htm`): Formatted with isolated reader styling and link rewriting.
  - **PDF** (`.pdf`): Integrated directly with bookmark outlines and portable file bundling.
- **Fast Client-Side Search**: Full-text MiniSearch indexing across all documents with instant in-page term highlighting, auto-scroll to matches, and keyboard navigation (`↑`/`↓`/`Enter`/`Esc`).
- **LLM-Ready Workflows**:
  - **Copy Page**: One-click button in the header toolbar copies the active page's clean, structured Markdown to your clipboard.
  - **Standardized `llms.txt`**: Automatically creates `llms.txt` index and `llms-full.txt` corpus following the [llmstxt.org](https://llmstxt.org) standard.
  - **CLI Pipe**: Dump clean Markdown directly to `stdout` for CLI piping (e.g. `docs-site docs/ --dump | llm`).
- **Automatic Table of Contents**: Extracts headings (`<h1>`–`<h6>`) and PDF outline bookmarks into a sidebar.
- **Dark Mode**: Built-in dark/light theme toggle, synchronized across framed documents and welcome screen.
- **Zero Configuration**: Recursively scans folders while automatically ignoring `.git`, `.venv`, `node_modules`, and hidden directories.

## Installation

Install globally as a CLI tool using [uv](https://docs.astral.sh/uv/):

```bash
uv tool install docs-site
```

Alternatively, install with `pipx`:

```bash
pipx install docs-site
```

Or with plain `pip`, ideally inside a virtual environment:

```bash
pip install docs-site
```

## Usage

### Build and Browse

```bash
# Build and open the site in your default browser
docs-site ~/notes/linux-learning

# Specify a custom output directory (default is <folder>/_site)
docs-site ~/notes/linux-learning -o ~/public_html/docs

# Build without automatically opening the browser
docs-site ~/notes/linux-learning --no-open

# Skip generating llms.txt and llms-full.txt
docs-site ~/notes/linux-learning --no-llms-txt

# Display version
docs-site --version

# View all options
docs-site --help
```

### CLI Pipe Workflow (LLMs & Tooling)

You can pipe clean Markdown straight to tools like `llm` without creating a site directory or launching a browser:

```bash
# Dump entire corpus as consolidated Markdown
docs-site ~/notes/linux-learning --dump | llm "summarize these notes"

# Dump a specific file
docs-site ~/notes/linux-learning --dump --file guide.md | llm "explain section 2"

# Dump a single file directly
docs-site ~/notes/linux-learning/guide.pdf --dump | llm "extract key concepts"
```

## Project Scope & Constraints

- **Supported Formats**: `.md`, `.markdown`, `.html`, `.htm`, and `.pdf` files.
- **Portable Output**: All generated pages, markdown artifacts, and referenced PDFs are copied into the output directory, making `-o <custom-dir>` self-contained.
- **Clean Rebuilds**: Output `pages/` directory is cleanly recreated on rebuilds to eliminate stale files from deleted sources.
- **Indexing Cap**: Indexed full text is capped at 400,000 characters per file in the manifest to keep client-side memory lightweight.

## Contributing

Looking to work on `docs-site` itself? See [CONTRIBUTING.md](CONTRIBUTING.md) for the development setup, testing, and architecture overview.

## License

This project is licensed under the [MIT License](LICENSE).
