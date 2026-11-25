from pathlib import Path

import pytest
from pypdf import PdfWriter

from docs_site.manifest import build_manifest, scan_folder
from docs_site.site_builder import build_site


def test_scan_and_build_site(tmp_path: Path) -> None:
    src_dir = tmp_path / "docs"
    src_dir.mkdir()
    sub_dir = src_dir / "sub"
    sub_dir.mkdir()

    (src_dir / "doc1.html").write_text("<h1>Doc One</h1>", encoding="utf-8")
    (sub_dir / "doc2.htm").write_text("<h2>Doc Two</h2>", encoding="utf-8")
    (src_dir / "doc3.md").write_text(
        "# Doc Three\n\nMarkdown content.", encoding="utf-8"
    )
    (src_dir / "ignored.txt").write_text("plain text", encoding="utf-8")

    out_dir = src_dir / "_site"

    scanned = scan_folder(src_dir, out_dir)
    assert len(scanned) == 3

    manifest = build_site(src_dir, out_dir, site_title="Test Project")

    assert len(manifest["files"]) == 3
    assert (out_dir / "index.html").exists()
    assert (out_dir / "pages" / "_welcome.html").exists()
    assert (out_dir / "static" / "css" / "shell.css").exists()
    assert (out_dir / "static" / "js" / "shell.js").exists()
    assert (out_dir / "static" / "js" / "minisearch.min.js").exists()
    assert (out_dir / "llms.txt").exists()
    assert (out_dir / "llms-full.txt").exists()

    index_html = (out_dir / "index.html").read_text(encoding="utf-8")
    assert "Test Project" in index_html
    assert "window.DOCS_MANIFEST =" in index_html
    assert "static/js/minisearch.min.js" in index_html
    assert "copy-page-btn" in index_html

    # Re-scanning should ignore the newly generated _site output folder
    scanned_after = scan_folder(src_dir, out_dir)
    assert len(scanned_after) == 3


def test_scan_folder_ignores_vendor_and_hidden_dirs(tmp_path: Path) -> None:
    src_dir = tmp_path / "docs"
    src_dir.mkdir()

    (src_dir / "valid.md").write_text("# Valid", encoding="utf-8")
    (src_dir / ".hidden.md").write_text("# Hidden", encoding="utf-8")

    git_dir = src_dir / ".git"
    git_dir.mkdir()
    (git_dir / "config.html").write_text("<h1>Git</h1>", encoding="utf-8")

    venv_dir = src_dir / ".venv"
    venv_dir.mkdir()
    (venv_dir / "lib.html").write_text("<h1>Venv</h1>", encoding="utf-8")

    node_modules = src_dir / "node_modules"
    node_modules.mkdir()
    (node_modules / "pkg.html").write_text("<h1>Pkg</h1>", encoding="utf-8")

    out_dir = src_dir / "_site"
    scanned = scan_folder(src_dir, out_dir)
    assert len(scanned) == 1
    assert scanned[0].name == "valid.md"


def test_stale_pages_cleaned_on_rebuild(tmp_path: Path) -> None:
    src_dir = tmp_path / "docs"
    src_dir.mkdir()
    out_dir = tmp_path / "_site"

    f1 = src_dir / "doc1.md"
    f2 = src_dir / "doc2.md"
    f1.write_text("# Doc 1", encoding="utf-8")
    f2.write_text("# Doc 2", encoding="utf-8")

    build_site(src_dir, out_dir, site_title="Demo")
    assert (out_dir / "pages" / "doc1_md.html").exists()
    assert (out_dir / "pages" / "doc2_md.html").exists()

    # Delete doc2 and rebuild
    f2.unlink()
    build_site(src_dir, out_dir, site_title="Demo")
    assert (out_dir / "pages" / "doc1_md.html").exists()
    assert not (out_dir / "pages" / "doc2_md.html").exists()
    assert not (out_dir / "pages" / "doc2_md.md").exists()


def test_welcome_page_dark_mode(tmp_path: Path) -> None:
    src_dir = tmp_path / "docs"
    src_dir.mkdir()
    (src_dir / "doc.md").write_text("# Doc", encoding="utf-8")
    out_dir = tmp_path / "_site"

    build_site(src_dir, out_dir, site_title="Demo")
    welcome_html = (out_dir / "pages" / "_welcome.html").read_text(encoding="utf-8")
    assert "../static/css/content.css" in welcome_html
    assert "../static/js/content-dark-listener.js" in welcome_html


def test_site_title_html_escaping(tmp_path: Path) -> None:
    src_dir = tmp_path / "docs"
    src_dir.mkdir()
    (src_dir / "doc.md").write_text("# Doc", encoding="utf-8")
    out_dir = tmp_path / "_site"

    build_site(src_dir, out_dir, site_title="<Test & Special>")
    index_html = (out_dir / "index.html").read_text(encoding="utf-8")
    assert "&lt;Test &amp; Special&gt;" in index_html
    assert "<Test & Special>" not in index_html


def test_manifest_title_source_modes(tmp_path: Path) -> None:
    src_dir = tmp_path / "docs"
    src_dir.mkdir()

    (src_dir / "guide.md").write_text("# Markdown H1\n\nBody.", encoding="utf-8")
    (src_dir / "page.html").write_text(
        "<!DOCTYPE html><html><head><title>HTML Meta Title</title></head>"
        "<body><h1>HTML H1</h1><p>Text.</p></body></html>",
        encoding="utf-8",
    )

    pdf_path = src_dir / "manual.pdf"
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    writer.add_outline_item("PDF Outline Title", 0)
    writer.add_metadata({"/Title": "PDF Metadata Title"})
    with pdf_path.open("wb") as f:
        writer.write(f)

    files = scan_folder(src_dir, tmp_path / "_unused")

    # 1. auto (default): <title> for HTML, H1 for Markdown, metadata for PDF
    auto_pages = tmp_path / "auto_pages"
    auto_pages.mkdir()
    auto_manifest = build_manifest(src_dir, files, auto_pages, title_source="auto")
    auto_titles = {e["relpath"]: e["title"] for e in auto_manifest["files"]}
    assert auto_titles == {
        "guide.md": "Markdown H1",
        "manual.pdf": "PDF Metadata Title",
        "page.html": "HTML Meta Title",
    }

    # 2. h1: first heading (or PDF outline root) with fallback to stem
    (src_dir / "no-heading.html").write_text(
        "<html><head><title>Ignored Title</title></head><body><p>No h1.</p></body></html>",
        encoding="utf-8",
    )
    files_with_no_h1 = scan_folder(src_dir, tmp_path / "_unused")
    h1_pages = tmp_path / "h1_pages"
    h1_pages.mkdir()
    h1_manifest = build_manifest(src_dir, files_with_no_h1, h1_pages, title_source="h1")
    h1_titles = {e["relpath"]: e["title"] for e in h1_manifest["files"]}
    assert h1_titles == {
        "guide.md": "Markdown H1",
        "manual.pdf": "PDF Outline Title",
        "no-heading.html": "no-heading",
        "page.html": "HTML H1",
    }

    # 3. filename: file stem for all documents
    fn_pages = tmp_path / "fn_pages"
    fn_pages.mkdir()
    fn_manifest = build_manifest(
        src_dir, files_with_no_h1, fn_pages, title_source="filename"
    )
    fn_titles = {e["relpath"]: e["title"] for e in fn_manifest["files"]}
    assert fn_titles == {
        "guide.md": "guide",
        "manual.pdf": "manual",
        "no-heading.html": "no-heading",
        "page.html": "page",
    }

    with pytest.raises(ValueError, match="invalid title_source"):
        build_manifest(
            src_dir,
            files,
            fn_pages,
            title_source="invalid",  # type: ignore[arg-type]
        )
