from pathlib import Path

from docs_site.llms_generator import generate_llms_files


def test_llms_txt_and_full_txt_generation(tmp_path: Path) -> None:
    out_dir = tmp_path / "_site"
    pages_dir = out_dir / "pages"
    pages_dir.mkdir(parents=True)

    (pages_dir / "doc1.raw.md").write_text("# Doc 1\n\nRaw markdown content.", encoding="utf-8")

    manifest = {
        "files": [
            {
                "id": "doc1",
                "type": "markdown",
                "title": "Doc One",
                "relpath": "doc1.md",
                "src": "pages/doc1.html",
                "raw_src": "pages/doc1.raw.md",
                "headings": [{"level": 1, "text": "Doc One", "id": "doc-one"}],
                "text": "Plain text of doc one.",
            },
            {
                "id": "doc2",
                "type": "html",
                "title": "Doc Two",
                "relpath": "doc2.html",
                "src": "pages/doc2.html",
                "headings": [],
                "text": "Plain text of doc two without headings.",
            },
        ]
    }

    llms_path, full_path = generate_llms_files(manifest, out_dir, site_title="Demo Docs")

    assert llms_path.exists()
    assert full_path.exists()

    llms_content = llms_path.read_text(encoding="utf-8")
    assert "# Demo Docs" in llms_content
    assert "- [Doc One](pages/doc1.html): Sections: Doc One" in llms_content
    assert "- [Doc Two](pages/doc2.html): Plain text of doc two without headings." in llms_content
    assert "[Full Documentation Corpus](llms-full.txt)" in llms_content

    full_content = full_path.read_text(encoding="utf-8")
    assert "# Demo Docs — Complete Documentation" in full_content
    assert "## File: doc1.md" in full_content
    assert "Raw markdown content." in full_content
    assert "## File: doc2.html" in full_content
    assert "Plain text of doc two without headings." in full_content
