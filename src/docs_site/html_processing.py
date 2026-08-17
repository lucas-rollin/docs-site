"""Everything needed to turn one arbitrary HTML file into a processed content page."""

import re
from pathlib import Path
from typing import TypedDict

from bs4 import BeautifulSoup

from .types import Heading
from .utils import slugify

HTML_TAG_RE = re.compile(r"<html[\s>]", re.IGNORECASE)
HEAD_TAG_RE = re.compile(r"<head[\s>]", re.IGNORECASE)
BODY_TAG_RE = re.compile(r"<body[\s>]", re.IGNORECASE)
HEAD_CLOSE_RE = re.compile(r"</head>", re.IGNORECASE)
HTML_OPEN_RE = re.compile(r"(<html[^>]*>)", re.IGNORECASE)
HTML_CLOSE_RE = re.compile(r"(</html>)", re.IGNORECASE)
HEADING_TAG_RE = re.compile(r"^h[1-6]$")

# Relative path (from output/pages/*.html) to the shared frontend static assets.
CONTENT_CSS_HREF = "../static/css/content.css"
CONTENT_DARK_LISTENER_SRC = "../static/js/content-dark-listener.js"


class HtmlPageResult(TypedDict):
    html: str
    title: str
    headings: list[Heading]
    text: str


def ensure_full_document(document: str, title: str) -> str:
    """Wrap a bare HTML fragment into a full <html><head><body> document.

    Leaves already-complete documents untouched; fills in only whichever of
    <html>/<head>/<body> is missing.
    """
    if not HTML_TAG_RE.search(document):
        return (
            "<!DOCTYPE html>\n<html>\n<head>\n"
            '<meta charset="utf-8">\n'
            f"<title>{title}</title>\n"
            "</head>\n<body>\n"
            f"{document}\n"
            "</body>\n</html>"
        )

    if not HEAD_TAG_RE.search(document):
        document = HTML_OPEN_RE.sub(
            r"\1\n<head>\n"
            '<meta charset="utf-8">\n'
            f"<title>{title}</title>\n"
            "</head>",
            document,
            count=1,
        )

    if not BODY_TAG_RE.search(document):
        if HEAD_CLOSE_RE.search(document):
            document = HEAD_CLOSE_RE.sub(r"\g<0>\n<body>", document, count=1)
        else:
            document = HTML_OPEN_RE.sub(r"\1\n<body>", document, count=1)
        document = HTML_CLOSE_RE.sub("</body>\n\\1", document, count=1)

    return document


def process_html_file(path: Path) -> HtmlPageResult:
    """Parse, wrap-if-needed, id-tag headings, and link in the reader stylesheet/script."""
    raw = path.read_text(encoding="utf-8", errors="replace")
    raw = ensure_full_document(raw, title=path.stem)

    soup = BeautifulSoup(raw, "html.parser")
    html_tag = soup.html
    if html_tag is None:
        # Extremely malformed input; fall back to a minimal shell around it.
        soup = BeautifulSoup(ensure_full_document(str(soup), path.stem), "html.parser")
        html_tag = soup.html
    if html_tag is None:
        # ensure_full_document() always produces a top-level <html>
        raise ValueError(f"could not construct a valid <html> root for {path}")

    head_tag = soup.head
    if head_tag is None:
        head_tag = soup.new_tag("head")
        html_tag.insert(0, head_tag)

    body_tag = soup.body
    if body_tag is None:
        body_tag = soup.new_tag("body")
        html_tag.append(body_tag)

    title = path.stem
    if soup.title and soup.title.string and soup.title.string.strip():
        title = soup.title.string.strip()

    used_ids = {tag.get("id") for tag in soup.find_all(id=True) if tag.get("id")}
    headings: list[Heading] = []
    for tag in soup.find_all(HEADING_TAG_RE):
        text = tag.get_text(strip=True)
        if not text:
            continue
        hid = tag.get("id")
        if not hid:
            hid = slugify(text, used_ids)
            tag["id"] = hid
        else:
            used_ids.add(hid)
        headings.append({"level": int(tag.name[1]), "id": str(hid), "text": text})

    plain_text = soup.get_text(separator=" ", strip=True)

    link_tag = soup.new_tag("link", rel="stylesheet", href=CONTENT_CSS_HREF)
    head_tag.append(link_tag)
    script_tag = soup.new_tag("script", src=CONTENT_DARK_LISTENER_SRC)
    body_tag.append(script_tag)

    return {
        "html": str(soup),
        "title": title,
        "headings": headings,
        "text": plain_text,
    }
