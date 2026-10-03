"""Document processors and registry for docs-site."""

from .base import DocumentProcessor, ProcessorOutput, ProcessorRegistry
from .html_processor import HtmlProcessor
from .markdown_processor import MarkdownProcessor
from .pdf_processor import PdfProcessor


def get_default_registry() -> ProcessorRegistry:
    """Return a ProcessorRegistry initialized with standard processors."""
    registry = ProcessorRegistry()
    registry.register(HtmlProcessor())
    registry.register(PdfProcessor())
    registry.register(MarkdownProcessor())
    return registry


__all__ = [
    "DocumentProcessor",
    "HtmlProcessor",
    "MarkdownProcessor",
    "PdfProcessor",
    "ProcessorOutput",
    "ProcessorRegistry",
    "get_default_registry",
]
