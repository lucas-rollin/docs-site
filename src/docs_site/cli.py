"""Command-line entry point: `docs-site /path/to/folder`."""

import argparse
import sys
import webbrowser
from collections import Counter
from pathlib import Path

from .site_builder import build_site


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="docs-site",
        description="Build a searchable local doc site from a folder of documentation files.",
    )
    parser.add_argument(
        "folder",
        type=Path,
        help="Folder to scan (recursively) for documentation files (.md, .html, .pdf, etc.)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="Output directory (default: <folder>/_site)",
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Don't open the site in a browser after building",
    )
    parser.add_argument(
        "--no-llms-txt",
        action="store_true",
        help="Don't generate llms.txt and llms-full.txt files",
    )
    args = parser.parse_args(argv)

    root = args.folder.resolve()
    if not root.is_dir():
        print(f"error: not a folder: {root}", file=sys.stderr)
        return 1

    output_dir = (args.output or root / "_site").resolve()

    manifest = build_site(
        root=root,
        output_dir=output_dir,
        site_title=root.name,
        generate_llms=not args.no_llms_txt,
    )

    type_counts = Counter(f.get("type", "unknown") for f in manifest["files"])
    counts_desc = ", ".join(f"{count} {ftype}" for ftype, count in sorted(type_counts.items()))
    if counts_desc:
        print(f"Indexed {len(manifest['files'])} file(s) ({counts_desc}).")
    else:
        print(f"Indexed 0 files under {root}.")

    print(f"Site written to: {output_dir}")

    if not args.no_open:
        webbrowser.open((output_dir / "index.html").as_uri())

    return 0


if __name__ == "__main__":
    sys.exit(main())
