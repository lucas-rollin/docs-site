"""Shared typed structures passed between processors, manifest building, and
the frontend (as JSON)."""

from typing import Literal, TypedDict

TitleSource = Literal["auto", "h1", "filename"]
VALID_TITLE_SOURCES: tuple[TitleSource, ...] = ("auto", "h1", "filename")


class Heading(TypedDict, total=False):
    """A single table-of-contents entry.

    `level` and `text` are always present. HTML headings additionally carry
    `id` (an anchor to jump to); PDF bookmarks carry `page` instead.
    """

    level: int
    text: str
    id: str
    page: int
