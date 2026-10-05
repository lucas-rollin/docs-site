# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-10-04

### Added
- Markdown support (`.md`, `.markdown`) with tables, fenced code blocks and admonitions.
- `llms.txt` and `llms-full.txt` generated at the site root (disable with `--no-llms-txt`).
- Search result jumps to the matching term and highlights matches in-page.
- "Copy Page" button to copy the current page as Markdown.
- `--dump` and `--file` to print clean Markdown to stdout, e.g. `docs-site docs/ --dump | llm`.
- `--version` flag.

### Changed
- Search and Copy Page now use structured Markdown text for HTML and PDF files.
- Search no longer copies the query to the clipboard.
- Scanning skips hidden directories and `node_modules`, `build` and `dist`.
- `pytest-cov` is now a dev-only dependency.

### Fixed
- PDFs now work with `-o`: they are copied into the output folder.
- Relative links to PDFs from HTML/Markdown now resolve.
- Rebuilding removes pages left over from deleted source files.
- The welcome page now follows dark mode.
- Site titles and headings with special characters no longer break the page.

## [0.1.1] - 2026-09-27

- Initial release: HTML and PDF indexing, client-side search, dark mode.

[0.2.0]: https://github.com/lucas-rollin/docs-site/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/lucas-rollin/docs-site/releases/tag/v0.1.1