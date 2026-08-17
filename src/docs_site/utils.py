"""Small string helpers shared across processors."""

import re


def slugify(text: str, used_ids: set) -> str:
    """Turn heading text into a unique, URL-safe anchor id."""
    base = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "section"
    slug = base
    i = 2
    while slug in used_ids:
        slug = f"{base}-{i}"
        i += 1
    used_ids.add(slug)
    return slug


def safe_id(text: str, used_ids: set) -> str:
    """Turn a relative file path into a unique identifier usable in HTML ids / filenames."""
    base = re.sub(r"[^a-zA-Z0-9]+", "_", text).strip("_") or "file"
    fid = base
    i = 2
    while fid in used_ids:
        fid = f"{base}_{i}"
        i += 1
    used_ids.add(fid)
    return fid
