"""Compatibility module for HTML processing."""

from pathlib import Path
from typing import TypedDict

from .processors.html_processor import (
    CONTENT_CSS_HREF,
    CONTENT_DARK_LISTENER_SRC,
    ensure_full_document,
    normalize_html_content,
)
from .types import Heading


class HtmlPageResult(TypedDict):
    html: str
    title: str
    headings: list[Heading]
    text: str


def process_html_file(path: Path) -> HtmlPageResult:
    """Parse, wrap-if-needed, id-tag headings, and link in the reader stylesheet/script."""
    raw = path.read_text(encoding="utf-8", errors="replace")
    norm = normalize_html_content(
        raw_html=raw,
        fallback_title=path.stem,
        source_relpath=path.name,
    )
    return {
        "html": norm["html"],
        "title": norm["title"],
        "headings": norm["headings"],
        "text": norm["text"],
    }


__all__ = [
    "CONTENT_CSS_HREF",
    "CONTENT_DARK_LISTENER_SRC",
    "HtmlPageResult",
    "ensure_full_document",
    "normalize_html_content",
    "process_html_file",
]
