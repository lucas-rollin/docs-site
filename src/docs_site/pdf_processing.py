"""Everything needed to index one PDF file (no rendering, the browser's
native PDF viewer handles that inside the iframe)."""

from pathlib import Path
from typing import TypedDict

import pymupdf

from .types import Heading


class PdfResult(TypedDict):
    title: str
    headings: list[Heading]
    text: str
    page_count: int


def process_pdf_file(path: Path) -> PdfResult:
    doc = pymupdf.open(path)
    try:
        title = (doc.metadata.get("title") or "").strip() or path.stem

        headings: list[Heading] = [
            {"level": level, "page": page, "text": text}
            for level, text, page in doc.get_toc(simple=True)
        ]

        page_count = doc.page_count
        plain_text = " ".join(doc.load_page(i).get_text() for i in range(page_count))
    finally:
        doc.close()

    return {
        "title": title,
        "headings": headings,
        "text": plain_text,
        "page_count": page_count,
    }
