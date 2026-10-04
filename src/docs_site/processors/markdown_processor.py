"""Markdown document processor using Python-Markdown."""

from pathlib import Path

import markdown

from .base import DocumentProcessor, ProcessorOutput
from .html_processor import normalize_html_content

MARKDOWN_EXTENSIONS = [
    "extra",
    "sane_lists",
    "admonition",
]


class MarkdownProcessor(DocumentProcessor):
    """Processes .md and .markdown files into styled reader pages."""

    @property
    def file_type(self) -> str:
        return "markdown"

    @property
    def supported_suffixes(self) -> tuple[str, ...]:
        return (".md", ".markdown")

    @property
    def icon(self) -> str:
        return "📝"

    def process(
        self,
        path: Path,
        root: Path,
        pages_dir: Path,
        fid: str,
        doc_map: dict[str, str],
    ) -> ProcessorOutput:
        raw_text = path.read_text(encoding="utf-8", errors="replace")
        relpath = path.relative_to(root).as_posix()

        # Copy raw markdown alongside the rendered page for LLM / raw viewer access
        raw_out_path = pages_dir / f"{fid}.raw.md"
        raw_out_path.write_text(raw_text, encoding="utf-8")

        canonical_md_path = pages_dir / f"{fid}.md"
        canonical_md_path.write_text(raw_text, encoding="utf-8")

        # Render markdown to HTML fragment
        rendered_html = markdown.markdown(raw_text, extensions=MARKDOWN_EXTENSIONS)

        # Normalize HTML, extract headings, slugify, rewrite links, inject CSS/JS
        norm = normalize_html_content(
            raw_html=rendered_html,
            fallback_title=path.stem,
            source_relpath=relpath,
            doc_map=doc_map,
        )

        out_path = pages_dir / f"{fid}.html"
        out_path.write_text(norm["html"], encoding="utf-8")

        return ProcessorOutput(
            title=norm["title"],
            headings=norm["headings"],
            text=raw_text.strip(),
            src=f"pages/{out_path.name}",
            raw_src=f"pages/{raw_out_path.name}",
            md_src=f"pages/{canonical_md_path.name}",
        )
