from pathlib import Path

from docs_site.manifest import scan_folder
from docs_site.site_builder import build_site


def test_scan_and_build_site(tmp_path: Path) -> None:
    src_dir = tmp_path / "docs"
    src_dir.mkdir()
    sub_dir = src_dir / "sub"
    sub_dir.mkdir()

    (src_dir / "doc1.html").write_text("<h1>Doc One</h1>", encoding="utf-8")
    (sub_dir / "doc2.htm").write_text("<h2>Doc Two</h2>", encoding="utf-8")
    (src_dir / "ignored.txt").write_text("plain text", encoding="utf-8")

    out_dir = src_dir / "_site"

    scanned = scan_folder(src_dir, out_dir)
    assert len(scanned) == 2

    manifest = build_site(src_dir, out_dir, site_title="Test Project")

    assert len(manifest["files"]) == 2
    assert (out_dir / "index.html").exists()
    assert (out_dir / "pages" / "_welcome.html").exists()
    assert (out_dir / "static" / "css" / "shell.css").exists()
    assert (out_dir / "static" / "js" / "shell.js").exists()
    assert (out_dir / "static" / "js" / "minisearch.min.js").exists()

    index_html = (out_dir / "index.html").read_text(encoding="utf-8")
    assert "Test Project" in index_html
    assert "window.DOCS_MANIFEST =" in index_html
    assert "static/js/minisearch.min.js" in index_html

    # Re-scanning should ignore the newly generated _site output folder
    scanned_after = scan_folder(src_dir, out_dir)
    assert len(scanned_after) == 2
