from pathlib import Path

from docs_site.processors.html_processor import HtmlProcessor, ensure_full_document


def test_ensure_full_document_wrap_fragment() -> None:
    fragment = "<h1>Hello World</h1><p>Sample text</p>"
    result = ensure_full_document(fragment, "My Doc")
    assert "<!DOCTYPE html>" in result
    assert "<html>" in result
    assert "<title>My Doc</title>" in result
    assert "<body>" in result
    assert "<h1>Hello World</h1>" in result


def test_ensure_full_document_existing_full() -> None:
    doc = "<!DOCTYPE html><html><head><title>Existing</title></head><body><p>Test</p></body></html>"
    result = ensure_full_document(doc, "Fallback Title")
    assert "<title>Existing</title>" in result


def test_process_html_file(tmp_path: Path) -> None:
    file_path = tmp_path / "test-doc.html"
    content = """
    <!DOCTYPE html>
    <html>
    <head><title>Custom Page Title</title></head>
    <body>
        <h1>Main Header</h1>
        <p>This is paragraph content.</p>
        <h2 id="existing-id">Sub Header</h2>
        <h3>Another Sub</h3>
    </body>
    </html>
    """
    file_path.write_text(content, encoding="utf-8")

    pages_dir = tmp_path / "pages"
    pages_dir.mkdir()
    processor = HtmlProcessor()
    output = processor.process(
        path=file_path,
        root=tmp_path,
        pages_dir=pages_dir,
        fid="test_doc",
        doc_map={},
    )

    assert output.title == "Custom Page Title"
    assert "Main Header" in output.text
    assert "This is paragraph content." in output.text

    headings = output.headings
    assert len(headings) == 3
    assert headings[0] == {"level": 1, "id": "main-header", "text": "Main Header"}
    assert headings[1] == {"level": 2, "id": "existing-id", "text": "Sub Header"}
    assert headings[2] == {"level": 3, "id": "another-sub", "text": "Another Sub"}

    # Stylesheet and dark listener script injection
    html_content = (pages_dir / "test_doc.html").read_text(encoding="utf-8")
    assert "../static/css/content.css" in html_content
    assert "../static/js/content-dark-listener.js" in html_content
