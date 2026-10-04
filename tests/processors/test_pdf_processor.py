from pathlib import Path

from pypdf import PdfWriter

from docs_site.processors.pdf_processor import PdfProcessor


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

    processor = PdfProcessor()
    output = processor.process(
        path=pdf_path,
        root=tmp_path,
        pages_dir=tmp_path,
        fid="sample_pdf",
        doc_map={},
    )

    assert output.title == "Sample Document Title"
    assert output.page_count == 2
    assert len(output.headings) == 2
    assert output.headings[0] == {
        "level": 1,
        "page": 1,
        "text": "Chapter 1: Intro",
    }
    assert output.headings[1] == {
        "level": 2,
        "page": 2,
        "text": "Section 1.1: Basics",
    }
    assert output.md_src == "pages/sample_pdf.md"
    assert (tmp_path / "sample_pdf.md").exists()
    md_content = (tmp_path / "sample_pdf.md").read_text(encoding="utf-8")
    assert "# Sample Document Title" in md_content
    assert "## Chapter 1: Intro" in md_content
    assert "### Section 1.1: Basics" in md_content
