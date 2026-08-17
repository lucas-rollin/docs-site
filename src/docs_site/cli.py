"""Command-line entry point: `docs-site /path/to/folder`."""

import argparse
import sys
import webbrowser
from pathlib import Path

from .site_builder import build_site


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="docs-site",
        description="Build a searchable local doc site from a folder of HTML + PDF files.",
    )
    parser.add_argument(
        "folder",
        type=Path,
        help="Folder to scan (recursively) for .html/.htm/.pdf files",
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
    args = parser.parse_args(argv)

    root = args.folder.resolve()
    if not root.is_dir():
        print(f"error: not a folder: {root}", file=sys.stderr)
        return 1

    output_dir = (args.output or root / "_site").resolve()

    manifest = build_site(root, output_dir, site_title=root.name)

    n_html = sum(1 for f in manifest["files"] if f["type"] == "html")
    n_pdf = sum(1 for f in manifest["files"] if f["type"] == "pdf")
    print(f"Indexed {n_html} HTML file(s) and {n_pdf} PDF file(s).")
    print(f"Site written to: {output_dir}")

    if not manifest["files"]:
        print(f"(No .html/.htm/.pdf files found under {root})")

    if not args.no_open:
        webbrowser.open((output_dir / "index.html").as_uri())

    return 0


if __name__ == "__main__":
    sys.exit(main())
