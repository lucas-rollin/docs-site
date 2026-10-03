from pathlib import Path

from docs_site.processors import (
    DocumentProcessor,
    HtmlProcessor,
    ProcessorOutput,
    ProcessorRegistry,
    get_default_registry,
)


def test_registry_registration() -> None:
    registry = ProcessorRegistry()
    assert registry.all_suffixes() == ()

    html_p = HtmlProcessor()
    registry.register(html_p)
    assert ".html" in registry.all_suffixes()
    assert ".htm" in registry.all_suffixes()
    assert registry.get_processor_for_suffix(".html") is html_p
    assert registry.get_processor_for_suffix(".HTM") is html_p
    assert registry.get_processor_for_path(Path("foo/bar.HTML")) is html_p
    assert registry.get_processor_for_suffix(".unknown") is None


def test_default_registry_processors() -> None:
    registry = get_default_registry()
    suffixes = registry.all_suffixes()

    assert ".html" in suffixes
    assert ".htm" in suffixes
    assert ".pdf" in suffixes
    assert ".md" in suffixes
    assert ".markdown" in suffixes

    for p in registry.all_processors():
        assert isinstance(p, DocumentProcessor)
        assert p.file_type in ("html", "pdf", "markdown")
        assert len(p.icon) > 0


def test_custom_processor_extension(tmp_path: Path) -> None:
    class TxtProcessor:
        @property
        def file_type(self) -> str:
            return "text"

        @property
        def supported_suffixes(self) -> tuple[str, ...]:
            return (".txt",)

        @property
        def icon(self) -> str:
            return "📄"

        def process(
            self,
            path: Path,
            root: Path,
            pages_dir: Path,
            fid: str,
            doc_map: dict[str, str],
        ) -> ProcessorOutput:
            return ProcessorOutput(
                title=path.stem,
                headings=[],
                text=path.read_text(encoding="utf-8"),
                src=f"pages/{fid}.html",
            )

    registry = ProcessorRegistry()
    registry.register(TxtProcessor())
    assert isinstance(registry.get_processor_for_suffix(".txt"), DocumentProcessor)
