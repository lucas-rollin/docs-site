import re
import shutil
from collections import defaultdict
from pathlib import Path
from typing import Any

from pypdf import PdfReader
from pypdf.errors import PyPdfError

from ..types import Heading
from .base import DocumentProcessor, ProcessorOutput


def _clean_pdf_text(text: str) -> str:
    """Normalize linebreaks, de-hyphenate line-wrapped words, and collapse excessive spacing."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # De-hyphenate words broken by line wraps (e.g., "docu-\nmentation" -> "documentation")
    text = re.sub(r"(\w+)-\n(\w+)", r"\1\2", text)
    # Collapse 3+ consecutive newlines to 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


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


class PdfProcessor(DocumentProcessor):
    """Processes PDF files, extracting outline, text, and generating clean Markdown."""

    @property
    def file_type(self) -> str:
        return "pdf"

    @property
    def supported_suffixes(self) -> tuple[str, ...]:
        return (".pdf",)

    @property
    def icon(self) -> str:
        return "📕"

    def process(
        self,
        path: Path,
        root: Path,
        pages_dir: Path,
        fid: str,
        doc_map: dict[str, str],
    ) -> ProcessorOutput:
        reader = PdfReader(str(path))
        metadata = reader.metadata
        raw_title = metadata.title if metadata else ""
        title = raw_title.strip() if raw_title else path.stem

        try:
            outline = reader.outline or []
            headings = _extract_headings(reader, outline)
        except (PyPdfError, AttributeError, TypeError, ValueError):
            headings = []

        # Omit top-level heading from TOC if it represents the document title
        if headings and headings[0]["level"] == 1:
            first_text = headings[0]["text"].strip().lower()
            title_lower = title.strip().lower()
            lvl1_count = sum(1 for h in headings if h["level"] == 1)
            if first_text == title_lower or (
                lvl1_count == 1 and first_text in title_lower
            ):
                headings = headings[1:]

        page_count = len(reader.pages)
        page_headings: dict[int, list[Heading]] = defaultdict(list)
        for h in headings:
            page_headings[h["page"]].append(h)

        md_blocks: list[str] = [f"# {title}"]

        for idx, page in enumerate(reader.pages, start=1):
            page_content_parts: list[str] = []

            # Emit outline headings for this page
            if idx in page_headings:
                for h in page_headings[idx]:
                    prefix = "#" * min(h["level"] + 1, 6)
                    if (
                        h["text"].strip().lower() == title.strip().lower()
                        and h["level"] == 1
                    ):
                        continue
                    page_content_parts.append(f"{prefix} {h['text']}")

            try:
                page_text = page.extract_text()
                if page_text:
                    cleaned = _clean_pdf_text(page_text)
                    if cleaned:
                        page_content_parts.append(cleaned)
            except (PyPdfError, AttributeError, TypeError, ValueError):
                continue

            if page_content_parts:
                md_blocks.append("\n\n".join(page_content_parts))

        clean_md = "\n\n".join(md_blocks).strip()

        md_out_path = pages_dir / f"{fid}.md"
        md_out_path.write_text(clean_md, encoding="utf-8")

        pdf_out_path = pages_dir / f"{fid}.pdf"
        if path.resolve() != pdf_out_path.resolve():
            shutil.copy2(path, pdf_out_path)

        return ProcessorOutput(
            title=title,
            headings=headings,
            text=clean_md,
            src=f"pages/{pdf_out_path.name}",
            md_src=f"pages/{md_out_path.name}",
            page_count=page_count,
        )
