"""Everything needed to index one PDF file (no rendering, the browser's
native PDF viewer handles that inside the iframe)."""

from pathlib import Path
from typing import Any, TypedDict

from pypdf import PdfReader
from pypdf.errors import PyPdfError

from .types import Heading


class PdfResult(TypedDict):
    title: str
    headings: list[Heading]
    text: str
    page_count: int


def _extract_headings(
    reader: PdfReader, outline: list[Any], level: int = 1
) -> list[Heading]:
    headings: list[Heading] = []
    for item in outline:
        if isinstance(item, list):
            headings.extend(_extract_headings(reader, item, level + 1))
        else:
            try:
                page_num = reader.get_destination_page_number(item)
                title = getattr(item, "title", "") or ""
                if page_num is not None and title.strip():
                    headings.append(
                        {"level": level, "page": page_num + 1, "text": title.strip()}
                    )
            except (PyPdfError, AttributeError, TypeError, ValueError):
                continue
    return headings


def process_pdf_file(path: Path) -> PdfResult:
    reader = PdfReader(str(path))
    metadata = reader.metadata
    raw_title = metadata.title if metadata else ""
    title = raw_title.strip() if raw_title else path.stem

    try:
        outline = reader.outline or []
        headings = _extract_headings(reader, outline)
    except (PyPdfError, AttributeError, TypeError, ValueError):
        headings = []

    page_count = len(reader.pages)
    text_chunks: list[str] = []
    for page in reader.pages:
        try:
            page_text = page.extract_text()
            if page_text:
                text_chunks.append(page_text)
        except (PyPdfError, AttributeError, TypeError, ValueError):
            continue

    plain_text = " ".join(text_chunks)

    return {
        "title": title,
        "headings": headings,
        "text": plain_text,
        "page_count": page_count,
    }
