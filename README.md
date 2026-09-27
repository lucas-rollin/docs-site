# docs-site

Turn a folder of dumped HTML and PDF files into a browsable, searchable local documentation site.

## Installation

Install globally as a CLI tool using [uv](https://docs.astral.sh/uv/):

```bash
uv tool install .
```

*Note: Ensure `~/.local/bin` is in your `PATH` if it isn't already.*

## Usage

```bash
# Build and open the site in your default browser
docs-site ~/notes/linux-learning

# View CLI options
docs-site --help
```

Re-running the command rebuilds the site from scratch.

## Development

1. Create a virtual environment and install dependencies (including dev tools like `mypy`):

```bash
uv sync --group dev
```

2. Test changes directly without reinstalling:

```bash
uv run python -m docs_site /path/to/test/folder --no-open
```

3. Run type checking:

```bash
uv run mypy src/docs_site
```

### Architecture

```
src/docs_site/
├── cli.py             # argparse entry point
├── site_builder.py    # Orchestrates build: copies static/, renders templates/
├── manifest.py        # Folder scanning + manifest assembly
├── html_processing.py # HTML wrapping & heading extraction (BeautifulSoup)
├── pdf_processing.py  # PDF text & outline extraction (PyMuPDF)
├── types.py           # Shared typed data structures
├── utils.py           # Helper functions (slugify, safe_id)
├── templates/         # Jinja2 templates (shell, welcome page)
└── static/            # CSS and JS assets copied to build output
```

- **Frontend (`static/`)**: Edit CSS/JS files directly and refresh your browser to see changes without a rebuild step.
- **Backend (`manifest.py`, etc.)**: Handles data scanning and outputs a JSON-serializable manifest, keeping Python separate from HTML markup.
