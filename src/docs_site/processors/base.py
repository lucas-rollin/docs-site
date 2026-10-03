"""Base interfaces and registry for document processors."""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol, runtime_checkable

from ..types import Heading


@dataclass(frozen=True)
class ProcessorOutput:
    """Standardized output produced by any document processor."""

    title: str
    headings: list[Heading]
    text: str
    src: str
    raw_src: str | None = None
    page_count: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@runtime_checkable
class DocumentProcessor(Protocol):
    """Protocol that all document processors must implement."""

    @property
    def file_type(self) -> str:
        """The logical type identifier, e.g. 'html', 'pdf', 'markdown'."""
        ...

    @property
    def supported_suffixes(self) -> tuple[str, ...]:
        """Tuple of lowercase file extensions handled by this processor."""
        ...

    @property
    def icon(self) -> str:
        """Emoji or symbol representing this file type."""
        ...

    def process(
        self,
        path: Path,
        root: Path,
        pages_dir: Path,
        fid: str,
        doc_map: dict[str, str],
    ) -> ProcessorOutput:
        """Process one file and return standardized output."""
        ...


class ProcessorRegistry:
    """Registry managing available document processors by file extension."""

    def __init__(self) -> None:
        self._processors: list[DocumentProcessor] = []
        self._suffix_map: dict[str, DocumentProcessor] = {}

    def register(self, processor: DocumentProcessor) -> None:
        self._processors.append(processor)
        for suffix in processor.supported_suffixes:
            self._suffix_map[suffix.lower()] = processor

    def get_processor_for_suffix(self, suffix: str) -> DocumentProcessor | None:
        return self._suffix_map.get(suffix.lower())

    def get_processor_for_path(self, path: Path) -> DocumentProcessor | None:
        return self.get_processor_for_suffix(path.suffix)

    def all_suffixes(self) -> tuple[str, ...]:
        return tuple(sorted(self._suffix_map.keys()))

    def all_processors(self) -> list[DocumentProcessor]:
        return list(self._processors)
