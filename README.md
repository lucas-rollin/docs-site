# docs-site

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)

Turn a folder of dumped HTML and PDF files into a clean, searchable, dark-mode-ready static documentation portal.

No server required—just open `index.html` in your browser.

## Features

- **Static & Offline**: Generates self-contained static HTML/CSS/JS with zero runtime server required.
- **Fast Client-side Search**: Full-text search across all HTML and PDF content, with highlight previews and keyboard navigation (`↑`/`↓`/`Enter`/`Esc`).
- **Automatic Table of Contents**: Extracts heading outlines from HTML tags (`<h1>`–`<h6>`) and bookmark outlines from PDF files into a side navigation panel.
- **Dark Mode**: Built-in dark/light theme toggle, including synchronized dark theme styling for framed HTML documents.
- **Zero Configuration**: Point it at any nested folder and it recursively scans and indexes supported files.

## Installation

Install globally as a CLI tool using [uv](https://docs.astral.sh/uv/):

```bash
uv tool install .
```

*Note: Ensure `~/.local/bin` is in your `PATH` if it isn't already.*

Or install with standard `pip`:

```bash
pip install .
```

## Usage

```bash
# Build and open the site in your default browser
docs-site ~/notes/linux-learning

# Specify a custom output directory (default is <folder>/_site)
docs-site ~/notes/linux-learning -o ~/public_html/docs

# Build without automatically opening the browser
docs-site ~/notes/linux-learning --no-open

# View all options
docs-site --help
```

Re-running the command rebuilds the site from scratch.

## Project Scope & Constraints

- **Supported Formats**: `.html`, `.htm`, and `.pdf` files.
- **HTML Assets**: HTML files are wrapped and rendered inside an iframe. Relative links to external assets (e.g. images or local stylesheets) should be self-contained or absolute.
- **PDF Viewing**: PDFs are displayed directly using your browser's native PDF reader.
- **Indexing Cap**: Indexed full text is capped at 400,000 characters per file to keep the client-side search index responsive and lightweight.

## Development

1. Create a virtual environment and install dependencies:

```bash
uv sync --group dev
```

2. Run type checking and tests:

```bash
uv run mypy src/docs_site
uv run pytest
```

3. Test changes locally without reinstalling:

```bash
uv run python -m docs_site /path/to/test/folder --no-open
```

### Architecture

```
src/docs_site/
├── cli.py             # argparse CLI entry point
├── site_builder.py    # Orchestrates build: copies static/, renders templates/
├── manifest.py        # Folder scanning + manifest assembly
├── html_processing.py # HTML wrapping & heading extraction (BeautifulSoup)
├── pdf_processing.py  # PDF text & outline extraction (pypdf)
├── types.py           # Shared typed data structures
├── utils.py           # Helper functions (slugify, safe_id)
├── templates/         # Jinja2 templates (shell, welcome page)
└── static/            # CSS and JS assets copied to build output
```

- **Frontend (`static/`)**: Edit CSS/JS files directly and refresh your browser to see changes without a rebuild step.
- **Backend (`manifest.py`, etc.)**: Handles data scanning and outputs a JSON-serializable manifest, keeping Python separate from HTML markup.

## Project Status

This tool was initially built to solve personal study and document organization workflows. Feedback, bug reports, and contributions are welcome.

## License

This project is licensed under the [MIT License](LICENSE).
