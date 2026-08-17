"""Scan a folder for HTML/PDF files and build the JSON manifest the frontend reads."""

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Literal, TypedDict

from .html_processing import process_html_file
from .pdf_processing import process_pdf_file
from .types import Heading
from .utils import safe_id

INDEXABLE_SUFFIXES = (".html", ".htm", ".pdf")

# Per-file cap on indexed text so the manifest can't explode on huge PDFs.
MAX_INDEXED_CHARS = 400_000


@dataclass
class ManifestEntry:
    """One indexed file, in the shape the frontend's JS expects (see
    static/js/shell.js). `page_count` is only meaningful for PDFs but is
    always present so the JSON shape is uniform across entries.
    """

    id: str
    type: Literal["html", "pdf"]
    title: str
    relpath: str
    src: str
    headings: list[Heading] = field(default_factory=list)
    text: str = ""
    page_count: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class Manifest(TypedDict):
    files: list[dict[str, Any]]


def scan_folder(root: Path, output_dir: Path) -> list[Path]:
    """Recursively find all indexable files under root, skipping the output dir itself."""
    files = []
    for p in sorted(root.rglob("*")):
        if not p.is_file():
            continue
        try:
            p.relative_to(output_dir)
            continue  # already inside the generated site — don't re-index it
        except ValueError:
            pass
        if p.suffix.lower() in INDEXABLE_SUFFIXES:
            files.append(p)
    return files


def build_manifest(root: Path, files: list[Path], pages_dir: Path) -> Manifest:
    """Process every file, write out HTML content pages, and return the site manifest."""
    manifest_entries: list[ManifestEntry] = []
    used_ids: set[str] = set()

    for path in files:
        relpath = path.relative_to(root).as_posix()
        fid = safe_id(relpath, used_ids)
        suffix = path.suffix.lower()
        entry: ManifestEntry

        if suffix in (".html", ".htm"):
            try:
                html_result = process_html_file(path)
            except Exception as exc:  # noqa: BLE001 - keep building the rest of the site
                print(f"warning: skipping {relpath} ({exc})")
                continue
            out_path = pages_dir / f"{fid}.html"
            out_path.write_text(html_result["html"], encoding="utf-8")
            entry = ManifestEntry(
                id=fid,
                type="html",
                title=html_result["title"],
                relpath=relpath,
                src=f"pages/{out_path.name}",
                headings=html_result["headings"],
                text=html_result["text"][:MAX_INDEXED_CHARS],
            )

        elif suffix == ".pdf":
            try:
                pdf_result = process_pdf_file(path)
            except Exception as exc:  # noqa: BLE001
                print(f"warning: skipping {relpath} ({exc})")
                continue
            # Reference the original PDF in place rather than duplicating it.
            src = (Path("..") / path.relative_to(root)).as_posix()
            entry = ManifestEntry(
                id=fid,
                type="pdf",
                title=pdf_result["title"],
                relpath=relpath,
                src=src,
                headings=pdf_result["headings"],
                text=pdf_result["text"][:MAX_INDEXED_CHARS],
                page_count=pdf_result["page_count"],
            )
        else:
            continue

        manifest_entries.append(entry)

    manifest_entries.sort(key=lambda e: e.relpath.lower())
    return {"files": [e.to_dict() for e in manifest_entries]}
