"""HTML document processor and shared HTML normalization helpers."""

import posixpath
import re
from pathlib import Path
from typing import Any
from urllib.parse import urldefrag, urlparse

from bs4 import BeautifulSoup

from ..types import Heading
from ..utils import slugify
from .base import DocumentProcessor, ProcessorOutput

HTML_TAG_RE = re.compile(r"<html[\s>]", re.IGNORECASE)
HEAD_TAG_RE = re.compile(r"<head[\s>]", re.IGNORECASE)
BODY_TAG_RE = re.compile(r"<body[\s>]", re.IGNORECASE)
HEAD_CLOSE_RE = re.compile(r"</head>", re.IGNORECASE)
HTML_OPEN_RE = re.compile(r"(<html[^>]*>)", re.IGNORECASE)
HTML_CLOSE_RE = re.compile(r"(</html>)", re.IGNORECASE)
HEADING_TAG_RE = re.compile(r"^h[1-6]$")

CONTENT_CSS_HREF = "../static/css/content.css"
CONTENT_DARK_LISTENER_SRC = "../static/js/content-dark-listener.js"


def ensure_full_document(document: str, title: str) -> str:
    """Wrap a bare HTML fragment into a full <html><head><body> document."""
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


def rewrite_relative_links(
    soup: BeautifulSoup,
    source_relpath: str,
    doc_map: dict[str, str],
) -> None:
    """Rewrite relative document links to point to generated pages and handle external links."""
    source_dir = posixpath.dirname(source_relpath)

    for a_tag in soup.find_all("a", href=True):
        href_raw = a_tag.get("href")
        if not isinstance(href_raw, str):
            continue
        href = href_raw.strip()
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue

        parsed = urlparse(href)
        if parsed.scheme or parsed.netloc:
            # External link: open in new tab
            a_tag["target"] = "_blank"
            a_tag["rel"] = "noopener noreferrer"
            continue

        url_path, frag = urldefrag(href)
        if not url_path:
            continue

        target_norm = posixpath.normpath(posixpath.join(source_dir, url_path))
        if target_norm.startswith("../"):
            continue

        target_fid = doc_map.get(target_norm)
        if not target_fid:
            # Check alternative extensions (e.g. link wrote .html but source is .md)
            norm_stem = posixpath.splitext(target_norm)[0]
            for ext in (".md", ".markdown", ".html", ".htm"):
                cand = norm_stem + ext
                if cand in doc_map:
                    target_fid = doc_map[cand]
                    break

        if target_fid:
            new_href = f"{target_fid}.html"
            if frag:
                new_href += f"#{frag}"
            a_tag["href"] = new_href


def normalize_html_content(
    raw_html: str,
    fallback_title: str,
    source_relpath: str = "",
    doc_map: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Parse HTML, slugify headings, link stylesheets/scripts, and rewrite links."""
    full_html = ensure_full_document(raw_html, title=fallback_title)
    soup = BeautifulSoup(full_html, "html.parser")

    html_tag = soup.html
    if html_tag is None:
        soup = BeautifulSoup(
            ensure_full_document(str(soup), fallback_title), "html.parser"
        )
        html_tag = soup.html
    if html_tag is None:
        raise ValueError(
            f"could not construct a valid <html> root for {fallback_title}"
        )

    head_tag = soup.head
    if head_tag is None:
        head_tag = soup.new_tag("head")
        html_tag.insert(0, head_tag)

    body_tag = soup.body
    if body_tag is None:
        body_tag = soup.new_tag("body")
        html_tag.append(body_tag)

    title = fallback_title
    if (
        soup.title
        and soup.title.string
        and soup.title.string.strip()
        and soup.title.string.strip() != fallback_title
    ):
        title = soup.title.string.strip()
    else:
        h1 = soup.find("h1")
        if h1 and h1.get_text(strip=True):
            title = h1.get_text(strip=True)
            if soup.title:
                soup.title.string = title

    # Rewrite links if doc_map provided
    if doc_map and source_relpath:
        rewrite_relative_links(soup, source_relpath, doc_map)

    # Process headings
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


class HtmlProcessor(DocumentProcessor):
    """Processes .html and .htm files into readers."""

    @property
    def file_type(self) -> str:
        return "html"

    @property
    def supported_suffixes(self) -> tuple[str, ...]:
        return (".html", ".htm")

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
        raw = path.read_text(encoding="utf-8", errors="replace")
        relpath = path.relative_to(root).as_posix()
        norm = normalize_html_content(
            raw_html=raw,
            fallback_title=path.stem,
            source_relpath=relpath,
            doc_map=doc_map,
        )

        out_path = pages_dir / f"{fid}.html"
        out_path.write_text(norm["html"], encoding="utf-8")

        return ProcessorOutput(
            title=norm["title"],
            headings=norm["headings"],
            text=norm["text"],
            src=f"pages/{out_path.name}",
        )
