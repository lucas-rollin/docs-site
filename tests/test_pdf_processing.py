from pathlib import Path
from pypdf import PdfWriter

from docs_site.pdf_processing import process_pdf_file


def test_process_pdf_file(tmp_path: Path) -> None:
    pdf_path = tmp_path / "sample.pdf"

    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    writer.add_blank_page(width=200, height=200)

    # Outline
    p1 = writer.add_outline_item("Chapter 1: Intro", 0)
    writer.add_outline_item("Section 1.1: Basics", 1, parent=p1)

    # Metadata
    writer.add_metadata({"/Title": "Sample Document Title"})

    with pdf_path.open("wb") as f:
        writer.write(f)

    result = process_pdf_file(pdf_path)

    assert result["title"] == "Sample Document Title"
    assert result["page_count"] == 2
    assert len(result["headings"]) == 2
    assert result["headings"][0] == {
        "level": 1,
        "page": 1,
        "text": "Chapter 1: Intro",
    }
    assert result["headings"][1] == {
        "level": 2,
        "page": 2,
        "text": "Section 1.1: Basics",
    }
