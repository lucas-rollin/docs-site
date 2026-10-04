from pathlib import Path

from docs_site.processors.markdown_processor import MarkdownProcessor


def test_markdown_basic_processing(tmp_path: Path) -> None:
    root = tmp_path / "docs"
    root.mkdir()
    pages_dir = tmp_path / "pages"
    pages_dir.mkdir()

    md_file = root / "guide.md"
    md_file.write_text(
        "# User Guide\n\n"
        "Welcome to the user guide.\n\n"
        "## Installation\n\n"
        "Run `pip install foo`.\n\n"
        "### Prerequisites\n\n"
        "Python 3.11+\n",
        encoding="utf-8",
    )

    processor = MarkdownProcessor()
    doc_map = {"guide.md": "guide_md"}

    output = processor.process(
        path=md_file,
        root=root,
        pages_dir=pages_dir,
        fid="guide_md",
        doc_map=doc_map,
    )

    assert output.title == "User Guide"
    assert len(output.headings) == 3
    assert output.headings[0] == {"level": 1, "id": "user-guide", "text": "User Guide"}
    assert output.headings[1] == {
        "level": 2,
        "id": "installation",
        "text": "Installation",
    }
    assert output.headings[2] == {
        "level": 3,
        "id": "prerequisites",
        "text": "Prerequisites",
    }
    assert "Welcome to the user guide." in output.text
    assert output.src == "pages/guide_md.html"
    assert output.raw_src == "pages/guide_md.raw.md"
    assert output.md_src == "pages/guide_md.md"

    # Verify generated HTML
    html_content = (pages_dir / "guide_md.html").read_text(encoding="utf-8")
    assert "<!DOCTYPE html>" in html_content
    assert "../static/css/content.css" in html_content
    assert "../static/js/content-dark-listener.js" in html_content
    assert '<h2 id="installation">Installation</h2>' in html_content

    # Verify raw copy and canonical markdown
    raw_content = (pages_dir / "guide_md.raw.md").read_text(encoding="utf-8")
    assert raw_content == md_file.read_text(encoding="utf-8")
    canonical_content = (pages_dir / "guide_md.md").read_text(encoding="utf-8")
    assert canonical_content == md_file.read_text(encoding="utf-8")


def test_markdown_link_rewriting(tmp_path: Path) -> None:
    root = tmp_path / "docs"
    root.mkdir()
    sub_dir = root / "sub"
    sub_dir.mkdir()
    pages_dir = tmp_path / "pages"
    pages_dir.mkdir()

    md_file = sub_dir / "topic.md"
    md_file.write_text(
        "# Topic\n\n"
        "[Relative Link](other.md#section)\n"
        "[Root Link](../root.md)\n"
        "[External Link](https://example.com)\n"
        "[Anchor Only](#internal)\n",
        encoding="utf-8",
    )

    doc_map = {
        "sub/topic.md": "sub_topic_md",
        "sub/other.md": "sub_other_md",
        "root.md": "root_md",
    }

    processor = MarkdownProcessor()
    processor.process(
        path=md_file,
        root=root,
        pages_dir=pages_dir,
        fid="sub_topic_md",
        doc_map=doc_map,
    )

    html_content = (pages_dir / "sub_topic_md.html").read_text(encoding="utf-8")
    assert 'href="sub_other_md.html#section"' in html_content
    assert 'href="root_md.html"' in html_content
    assert 'href="https://example.com"' in html_content
    assert 'target="_blank"' in html_content
    assert 'href="#internal"' in html_content


def test_markdown_tables_and_code_blocks(tmp_path: Path) -> None:
    root = tmp_path / "docs"
    root.mkdir()
    pages_dir = tmp_path / "pages"
    pages_dir.mkdir()

    md_file = root / "features.md"
    md_file.write_text(
        "# Features\n\n"
        "```python\n"
        "def hello():\n"
        "    return 'world'\n"
        "```\n\n"
        "| Feature | Status |\n"
        "| --- | --- |\n"
        "| Fast | Done |\n",
        encoding="utf-8",
    )

    processor = MarkdownProcessor()
    processor.process(
        path=md_file,
        root=root,
        pages_dir=pages_dir,
        fid="features_md",
        doc_map={"features.md": "features_md"},
    )

    html_content = (pages_dir / "features_md.html").read_text(encoding="utf-8")
    assert '<code class="language-python">' in html_content
    assert "<table>" in html_content
    assert "<th>Feature</th>" in html_content


def test_markdown_sample_fixture(tmp_path: Path) -> None:
    fixture_path = Path("tests/fixtures/sample_docs/>w<.md")
    assert fixture_path.exists()

    pages_dir = tmp_path / "pages"
    pages_dir.mkdir()

    processor = MarkdownProcessor()
    output = processor.process(
        path=fixture_path,
        root=fixture_path.parent,
        pages_dir=pages_dir,
        fid="sample_md",
        doc_map={fixture_path.name: "sample_md"},
    )

    assert output.title == "Markdown Fixture"
    assert len(output.headings) > 5
    assert (pages_dir / "sample_md.html").exists()
    assert (pages_dir / "sample_md.raw.md").exists()
