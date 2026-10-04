"""Command-line entry point: `docs-site /path/to/folder`."""

import argparse
import sys
import tempfile
import webbrowser
from collections import Counter
from pathlib import Path
from typing import Any

from .site_builder import build_site


def _find_matching_entry(
    files: list[dict[str, Any]], target: str
) -> dict[str, Any] | None:
    norm_target = target.strip().replace("\\", "/").lstrip("/")
    # 1. Exact relative path match
    for f in files:
        rel = f.get("relpath", "").replace("\\", "/").lstrip("/")
        if rel == norm_target:
            return f
    # 2. Path suffix match (e.g. "sub/doc.md")
    for f in files:
        rel = f.get("relpath", "").replace("\\", "/").lstrip("/")
        if rel.endswith("/" + norm_target):
            return f
    # 3. Filename match (e.g. "doc.md")
    for f in files:
        rel = f.get("relpath", "").replace("\\", "/")
        if Path(rel).name == norm_target:
            return f
    return None


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="docs-site",
        description="Build a searchable local doc site from a folder of documentation files.",
    )
    parser.add_argument(
        "folder",
        type=Path,
        help="Folder or file to scan for documentation (.md, .html, .pdf, etc.)",
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
    parser.add_argument(
        "--dump",
        action="store_true",
        help="Dump clean Markdown to stdout (for piping to LLMs/tools) instead of building a site",
    )
    parser.add_argument(
        "--file",
        type=str,
        default=None,
        help="Specific relative file path or name to dump when using --dump (default: entire corpus)",
    )
    args = parser.parse_args(argv)

    target_path = args.folder.resolve()
    target_file = args.file

    if target_path.is_file():
        root = target_path.parent
        if not target_file:
            target_file = target_path.name
    elif target_path.is_dir():
        root = target_path
    else:
        print(f"error: not a folder or file: {target_path}", file=sys.stderr)
        return 1

    if args.dump:
        with tempfile.TemporaryDirectory() as tmp_dir_str:
            tmp_output = Path(tmp_dir_str)
            manifest = build_site(
                root=root,
                output_dir=tmp_output,
                site_title=root.name,
                generate_llms=True,
            )

            if target_file:
                matched = _find_matching_entry(manifest["files"], target_file)
                if not matched:
                    print(
                        f"error: file '{target_file}' not found in {root}",
                        file=sys.stderr,
                    )
                    return 1

                doc_src = matched.get("md_src") or matched.get("raw_src")
                content = ""
                if doc_src:
                    p = tmp_output / doc_src
                    if p.is_file():
                        content = p.read_text(encoding="utf-8", errors="replace")
                if not content:
                    content = matched.get("text", "")

                sys.stdout.write(content)
                if not content.endswith("\n"):
                    sys.stdout.write("\n")
                return 0

            llms_full = tmp_output / "llms-full.txt"
            if llms_full.is_file():
                sys.stdout.write(llms_full.read_text(encoding="utf-8"))
            return 0

    output_dir = (args.output or root / "_site").resolve()

    manifest = build_site(
        root=root,
        output_dir=output_dir,
        site_title=root.name,
        generate_llms=not args.no_llms_txt,
    )

    type_counts = Counter(f.get("type", "unknown") for f in manifest["files"])
    counts_desc = ", ".join(
        f"{count} {ftype}" for ftype, count in sorted(type_counts.items())
    )
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
