"""Scan a folder for supported files and build the JSON manifest the frontend reads."""

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, TypedDict

from .processors import ProcessorRegistry, get_default_registry
from .types import Heading
from .utils import safe_id

DEFAULT_REGISTRY = get_default_registry()
INDEXABLE_SUFFIXES = DEFAULT_REGISTRY.all_suffixes()

# Per-file cap on indexed text so the manifest can't explode on huge docs.
MAX_INDEXED_CHARS = 400_000


@dataclass
class ManifestEntry:
    """One indexed file, in the shape the frontend's JS expects (see
    static/js/shell.js). `page_count` is only meaningful for PDFs but is
    always present so the JSON shape is uniform across entries.
    """

    id: str
    type: str
    title: str
    relpath: str
    src: str
    headings: list[Heading] = field(default_factory=list)
    text: str = ""
    raw_src: str | None = None
    md_src: str | None = None
    page_count: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class Manifest(TypedDict):
    files: list[dict[str, Any]]


def scan_folder(
    root: Path,
    output_dir: Path,
    registry: ProcessorRegistry | None = None,
) -> list[Path]:
    """Recursively find all indexable files under root, skipping the output dir itself."""
    active_suffixes = registry.all_suffixes() if registry else INDEXABLE_SUFFIXES
    files = []
    for p in sorted(root.rglob("*")):
        if not p.is_file():
            continue
        try:
            p.relative_to(output_dir)
            continue  # already inside the generated site — don't re-index it
        except ValueError:
            pass
        if p.suffix.lower() in active_suffixes:
            files.append(p)
    return files


def build_manifest(
    root: Path,
    files: list[Path],
    pages_dir: Path,
    registry: ProcessorRegistry | None = None,
) -> Manifest:
    """Process every file, write out HTML content pages, and return the site manifest."""
    active_registry = registry or DEFAULT_REGISTRY
    manifest_entries: list[ManifestEntry] = []
    used_ids: set[str] = set()

    # Pre-map all relative paths to deterministic IDs so processors can resolve relative links
    doc_map: dict[str, str] = {}
    path_to_fid: dict[Path, str] = {}
    for path in files:
        relpath = path.relative_to(root).as_posix()
        fid = safe_id(relpath, used_ids)
        doc_map[relpath] = fid
        path_to_fid[path] = fid

    for path in files:
        relpath = path.relative_to(root).as_posix()
        fid = path_to_fid[path]
        processor = active_registry.get_processor_for_path(path)
        if not processor:
            continue

        try:
            output = processor.process(
                path=path,
                root=root,
                pages_dir=pages_dir,
                fid=fid,
                doc_map=doc_map,
            )
        except Exception as exc:  # noqa: BLE001 - keep building the rest of the site
            print(f"warning: skipping {relpath} ({exc})")
            continue

        entry = ManifestEntry(
            id=fid,
            type=processor.file_type,
            title=output.title,
            relpath=relpath,
            src=output.src,
            headings=output.headings,
            text=output.text[:MAX_INDEXED_CHARS],
            raw_src=output.raw_src,
            md_src=output.md_src,
            page_count=output.page_count,
        )
        manifest_entries.append(entry)

    manifest_entries.sort(key=lambda e: e.relpath.lower())
    return {"files": [e.to_dict() for e in manifest_entries]}
