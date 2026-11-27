import io
from pathlib import Path
from unittest.mock import patch

from docs_site.cli import main


def test_cli_dump_entire_corpus(tmp_path: Path) -> None:
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (docs_dir / "guide.md").write_text("# Guide\n\nGuide content.", encoding="utf-8")
    (docs_dir / "index.html").write_text(
        "<h1>Index</h1><p>Index content.</p>", encoding="utf-8"
    )

    stdout_buf = io.StringIO()
    with patch("sys.stdout", stdout_buf):
        exit_code = main([str(docs_dir), "--dump"])

    assert exit_code == 0
    output = stdout_buf.getvalue()
    assert "# docs — Complete Documentation" in output
    assert "## File: guide.md" in output
    assert "Guide content." in output
    assert "## File: index.html" in output
    assert "Index content." in output


def test_cli_dump_specific_file(tmp_path: Path) -> None:
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (docs_dir / "guide.md").write_text("# Guide\n\nGuide content.", encoding="utf-8")
    (docs_dir / "api.html").write_text(
        "<h1>API Reference</h1>\n<p>Endpoint description.</p>", encoding="utf-8"
    )

    stdout_buf = io.StringIO()
    with patch("sys.stdout", stdout_buf):
        exit_code = main([str(docs_dir), "--dump", "--file", "api.html"])

    assert exit_code == 0
    output = stdout_buf.getvalue()
    assert "# API Reference" in output
    assert "Endpoint description." in output
    # Should not include guide.md content
    assert "Guide content." not in output


def test_cli_dump_direct_file_path(tmp_path: Path) -> None:
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    file_path = docs_dir / "solo.md"
    file_path.write_text("# Solo Page\n\nOnly this page.", encoding="utf-8")

    stdout_buf = io.StringIO()
    with patch("sys.stdout", stdout_buf):
        exit_code = main([str(file_path), "--dump"])

    assert exit_code == 0
    output = stdout_buf.getvalue()
    assert "# Solo Page" in output
    assert "Only this page." in output


def test_cli_dump_file_not_found(tmp_path: Path) -> None:
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (docs_dir / "guide.md").write_text("# Guide", encoding="utf-8")

    stderr_buf = io.StringIO()
    with patch("sys.stderr", stderr_buf):
        exit_code = main([str(docs_dir), "--dump", "--file", "missing.md"])

    assert exit_code == 1
    assert "error: file 'missing.md' not found" in stderr_buf.getvalue()


def test_cli_nonexistent_path(tmp_path: Path) -> None:
    missing_dir = tmp_path / "does_not_exist"
    stderr_buf = io.StringIO()
    with patch("sys.stderr", stderr_buf):
        exit_code = main([str(missing_dir)])

    assert exit_code == 1
    assert "error: not a folder or file" in stderr_buf.getvalue()


def test_cli_normal_build(tmp_path: Path) -> None:
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (docs_dir / "doc.md").write_text("# Test\n\nContent", encoding="utf-8")
    out_dir = tmp_path / "custom_out"

    stdout_buf = io.StringIO()
    with patch("sys.stdout", stdout_buf):
        exit_code = main([str(docs_dir), "-o", str(out_dir), "--no-open"])

    assert exit_code == 0
    assert (out_dir / "index.html").exists()
    assert (out_dir / "pages" / "doc_md.md").exists()
    output = stdout_buf.getvalue()
    assert "Indexed 1 file(s)" in output


def test_cli_version() -> None:
    stdout_buf = io.StringIO()
    with patch("sys.stdout", stdout_buf):
        try:
            main(["--version"])
        except SystemExit as exc:
            assert exc.code == 0
    assert "docs-site 0.4.0" in stdout_buf.getvalue()


def test_cli_help_documents_title_source() -> None:
    stdout_buf = io.StringIO()
    with patch("sys.stdout", stdout_buf):
        try:
            main(["--help"])
        except SystemExit as exc:
            assert exc.code == 0
    help_text = stdout_buf.getvalue()
    assert "--title-source" in help_text
    assert "auto" in help_text
    assert "h1" in help_text
    assert "filename" in help_text


def test_cli_title_source_filename(tmp_path: Path) -> None:
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (docs_dir / "getting-started.md").write_text(
        "# Welcome Heading\n\nBody text.", encoding="utf-8"
    )
    out_dir = tmp_path / "_site"

    stdout_buf = io.StringIO()
    with patch("sys.stdout", stdout_buf):
        exit_code = main(
            [
                str(docs_dir),
                "-o",
                str(out_dir),
                "--no-open",
                "--title-source",
                "filename",
            ]
        )

    assert exit_code == 0
    index_html = (out_dir / "index.html").read_text(encoding="utf-8")
    assert '"title": "getting-started"' in index_html


def test_cli_smoke_sample_docs(tmp_path: Path) -> None:
    fixtures_dir = Path(__file__).parent / "fixtures" / "sample_docs"
    assert fixtures_dir.is_dir()

    # Smoke test each --title-source mode against real sample_docs fixtures
    expected_titles = {
        "auto": {
            "sample.html": "HTML Fixture",
            "sample.md": "Markdown Fixture",
            "sample.pdf": "PDF Fixture",
        },
        "h1": {
            "sample.html": "HTML Fixture",
            "sample.md": "Markdown Fixture",
            "sample.pdf": "Text Formatting & Inline Elements",
        },
        "filename": {
            "sample.html": "sample",
            "sample.md": "sample",
            "sample.pdf": "sample",
        },
    }

    for mode, expected in expected_titles.items():
        out_dir = tmp_path / f"site_{mode}"
        stdout_buf = io.StringIO()
        with patch("sys.stdout", stdout_buf):
            exit_code = main(
                [
                    str(fixtures_dir),
                    "-o",
                    str(out_dir),
                    "--no-open",
                    "--title-source",
                    mode,
                ]
            )

        assert exit_code == 0
        assert "Indexed 3 file(s)" in stdout_buf.getvalue()
        assert (out_dir / "index.html").is_file()
        assert (out_dir / "llms.txt").is_file()
        assert (out_dir / "llms-full.txt").is_file()

        index_html = (out_dir / "index.html").read_text(encoding="utf-8")
        for title in expected.values():
            assert f'"title": "{title}"' in index_html

    # Smoke test --dump and --dump --file against sample_docs
    dump_buf = io.StringIO()
    with patch("sys.stdout", dump_buf):
        assert main([str(fixtures_dir), "--dump"]) == 0
    dump_out = dump_buf.getvalue()
    assert "## File: sample.html" in dump_out
    assert "## File: sample.md" in dump_out
    assert "## File: sample.pdf" in dump_out

    single_buf = io.StringIO()
    with patch("sys.stdout", single_buf):
        assert main([str(fixtures_dir), "--dump", "--file", "sample.md"]) == 0
    assert "# Markdown Fixture" in single_buf.getvalue()


def test_cli_dump_clean_stdout_when_file_fails(tmp_path: Path) -> None:
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    (docs_dir / "good.md").write_text("# Good Doc\n\nContent.", encoding="utf-8")
    (docs_dir / "bad.html").write_text("<h1>Bad</h1>", encoding="utf-8")

    stdout_buf = io.StringIO()
    stderr_buf = io.StringIO()

    # Mock processor failure on bad.html
    with (
        patch(
            "docs_site.processors.html_processor.HtmlProcessor.process",
            side_effect=ValueError("Corrupt HTML"),
        ),
        patch("sys.stdout", stdout_buf),
        patch("sys.stderr", stderr_buf),
    ):
        exit_code = main([str(docs_dir), "--dump"])

    assert exit_code == 0
    # stdout must contain only the valid markdown and NOT the warning
    out = stdout_buf.getvalue()
    assert "Good Doc" in out
    assert "warning:" not in out
    # Warning must be emitted to stderr
    err = stderr_buf.getvalue()
    assert "warning: skipping bad.html (Corrupt HTML)" in err
