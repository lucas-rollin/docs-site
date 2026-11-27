# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-11-27

### Added

- **Google-Style Search Operators**:
  - **Boolean `OR`**: Case-sensitive `OR` splits queries into independent branches (keeping lowercase `or` as a normal `AND` term) and scopes result snippets/highlights to the branches that matched each document.
  - **Trailing Wildcard (`word*`)**: Prefix expansion in any query position with word-start boundary highlighting in both dropdown previews and in-page HTML highlights.
  - **Exclusion (`-term`, `-"phrase"`, `-type:`, `-title:`, `-path:`)**: Excludes matching documents without highlighting excluded terms or copying them to clipboard/`#search=`.
  - **Field & Format Qualifiers (`type:`, `title:`, `path:`)**: Filter by document format (`html`/`htm`, `md`/`markdown`, `pdf`) or restrict terms, wildcards, and exact phrases to titles (`title:`) or relative paths/filenames (`path:`).
- **Search Syntax Documentation**: Added a Search Syntax reference table to `README.md`.

### Fixed

- **Exact-Quote Dropdown Previews, Match Counts & Highlighting**: Prevented words inside `"quoted phrases"` (and their MiniSearch `terms`) from leaking into `extractSnippetWindows`, `.sr-count`, `←`/`→` preview cycling, or `<mark>` highlights in dropdown titles, paths, and snippets.
- **Mixed-Query In-Page Highlighting**: Prevented words from inside `"quoted phrases"` from leaking into Pass 2 token highlighting in `content-dark-listener.js` when combined with unquoted terms.
- **PDF Exact-Phrase Search Handoff**: Appended `&phrase=true` to PDF `#search=` URL fragments when the query uses double quotes so browser PDF viewers highlight the exact phrase rather than individual words.

### Changed

- **JavaScript Test Suite Refactor**: Split `tests/search.test.js` into focused modules under `tests/js/` (`search-query.test.js`, `search-preview.test.js`, `in-page-highlight.test.js`, `shell-ui.test.js`, and shared `helpers.js`), quoted the glob in `package.json`, and removed the redundant `tests/test_search_evaluation.py` subprocess wrapper.

## [0.3.0] - 2026-11-25

### Added

- **CLI `--title-source` Option**: Added `--title-source {auto,h1,filename}` across HTML, Markdown, and PDF processors, manifest generation, and `--dump` workflows, with documentation in `README.md` and `--help`.
- **Sidebar Filename Display**: Show the base filename as a muted secondary line beneath document titles when the title differs from the filename stem.
- **Filename & Path Search Indexing**: Indexed `filename` and `relpath` in MiniSearch and fallback search with path highlighting in search results.
- **Search Result Match Preview Cycling**: Added `‹ 1 / N ›` controls and `ArrowLeft`/`ArrowRight` keyboard navigation to preview distinct match windows without leaving the dropdown.
- **Responsive Split-Screen & Mobile Layout**:
  - Three-column desktop grid (`>= 1150px`), split-screen 2-column layout (`850px–1149px`) with an *"On this page"* header TOC popover, and single-column mobile layout (`< 850px`) with an off-canvas file drawer and backdrop.
  - Icon-only header action buttons below `768px`, full-width mobile search/TOC popovers below `640px`, `100dvh` viewport support, and responsive reader typography.

### Changed

- **Clipboard & PDF Phrase Handoff**: Unwrap Google-style double quotes when copying the search phrase to the clipboard for browser `Ctrl+F` / `⌘F` and when passing `#search=` to PDFs, while preserving full query semantics in `?hl=`.

### Fixed

- **Apostrophe & Contraction Search Parsing**: Restricted phrase delimiters to double quotes (`"..."` and curly `“...”`) so apostrophes (`don't`, `user's guide`) are not misparsed as quoted phrases, and matched punctuation separators consistently inside quoted phrases.
- **Toast Timer Safety**: Guarded and cleared clipboard toast timers during environment resets.

## [0.2.1] - 2026-10-22

### Fixed

- **Search Term Semantics**: Enforce strict AND matching across all terms by default and remove silent OR fallback.
- **Whole-Word Matching**: Validate both start and end word boundaries to prevent substring false-positives (e.g. *of* matching *often* or *roof*).
- **Phrase-First Highlighting**: Group multi-word phrases and quoted exact phrases into unified `<mark>` elements without fragmenting or hitting marker caps on common words.

### Added

- **Clipboard-Assisted Page Search**: Selecting a global search result automatically copies the search query to the clipboard, focuses the document viewer, and prompts a shortcut toast (`Ctrl+F` / `⌘F`).

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

[0.4.0]: https://github.com/lucas-rollin/docs-site/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/lucas-rollin/docs-site/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/lucas-rollin/docs-site/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/lucas-rollin/docs-site/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/lucas-rollin/docs-site/releases/tag/v0.1.1
