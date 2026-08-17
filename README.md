# docs-site

Turn a folder of dumped HTML + PDF files into a browsable, searchable local documentation site, then open it in your default browser.

## Install (any Linux with Python 3.9+)

```bash
pip install --user .
```

This installs the `docs_site` package into your user site-packages **and**
drops a `docs-site` command into `~/.local/bin` automatically (no manual
copying needed, that's what `pip install --user` is for).

Make sure `~/.local/bin` is on your `PATH`:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Use

```bash
docs-site ~/notes/linux-learning
```

Builds `~/notes/linux-learning/_site/index.html` and opens it. Re-run any
time you add more files, it rebuilds from scratch.

```bash
docs-site --help
```

## Development

Install in editable mode with the dev extras (currently just `mypy`) so code
changes take effect immediately:

```bash
pip install -e ".[dev]"
```

### Where things live

```
src/docs_site/
├── cli.py                  # argparse entry point
├── site_builder.py         # orchestrates a build: copies static/, renders templates/
├── manifest.py             # folder scanning + manifest assembly (no HTML/CSS here)
├── html_processing.py      # HTML wrapping, heading/id extraction (BeautifulSoup)
├── pdf_processing.py       # PDF text + outline extraction (PyMuPDF)
├── types.py                # shared typed structures (e.g. Heading) passed as JSON
├── utils.py                # slugify / safe_id helpers
├── py.typed
├── templates/              # Jinja2 templates
│   ├── shell.html.jinja    # the doc-site shell (left/right sidebars, search, iframe)
│   └── welcome.html.jinja  # landing page shown before a file is picked
└── static/                 # copied byte-for-byte into every build's output
    ├── css/
    │   ├── shell.css       # sidebar/header/search styling
    │   └── content.css     # reading-friendly styling injected into every HTML page
    └── js/
        ├── shell.js        # file list, TOC, search, dark-mode logic
        └── content-dark-listener.js
```

This mirrors a typical Flask/Django layout on purpose: `templates/` holds
server-rendered markup, `static/` holds assets served as-is. Nothing in
either directory is Python-templated beyond two Jinja placeholders in
`shell.html.jinja` (`site_title`, the JSON manifest) and one in
`welcome.html.jinja` (`count_files`). For development, edit `shell.css`, `shell.js`, or `content.css` directly and just refresh the browser, no rebuild step.
Conversely, the Python side (`manifest.py`, `html_processing.py`,
`pdf_processing.py`) has no knowledge of markup, it only produces a
JSON-serializable manifest (`types.Heading`, `manifest.ManifestEntry`).

To test changes quickly without reinstalling:

```bash
python -m docs_site /path/to/test/folder --no-open
```

### Type checking

```bash
mypy src/docs_site
```