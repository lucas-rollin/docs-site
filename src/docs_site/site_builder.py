"""Ties scanning/processing (manifest.py) together with the frontend
templates/static assets to produce a finished, browsable site directory.

This is the only module that knows about output paths and templates,
manifest.py and the processors know nothing about how the result gets
rendered, and the templates/static/ files know nothing about Python.
"""

import json
import shutil
from importlib import resources
from importlib.resources.abc import Traversable
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from .llms_generator import generate_llms_files
from .manifest import Manifest, build_manifest, scan_folder


def _package_path(*parts: str) -> Traversable:
    return resources.files("docs_site").joinpath(*parts)


def _copy_static_assets(output_dir: Path) -> None:
    static_src = _package_path("static")
    with resources.as_file(static_src) as static_path:
        shutil.copytree(static_path, output_dir / "static", dirs_exist_ok=True)


def _jinja_env() -> Environment:
    templates_src = _package_path("templates")
    with resources.as_file(templates_src) as templates_path:
        # FileSystemLoader needs a real, stable directory; as_file guarantees
        # one exists for the lifetime of this call even from a zipped install.
        return Environment(
            loader=FileSystemLoader(str(templates_path)),
            autoescape=False,  # we control every template; manifest JSON must stay raw
        )


def build_site(
    root: Path,
    output_dir: Path,
    site_title: str,
    generate_llms: bool = True,
) -> Manifest:
    """Scan `root`, build the manifest, render the site into `output_dir`.

    Returns the manifest (handy for callers that want summary stats).
    """
    pages_dir = output_dir / "pages"
    if pages_dir.exists():
        shutil.rmtree(pages_dir)
    pages_dir.mkdir(parents=True, exist_ok=True)

    files = scan_folder(root, output_dir)
    manifest = build_manifest(root, files, pages_dir)

    _copy_static_assets(output_dir)

    env = _jinja_env()

    welcome_html = env.get_template("welcome.html.jinja").render(
        count_files=len(manifest["files"])
    )
    (pages_dir / "_welcome.html").write_text(welcome_html, encoding="utf-8")

    manifest_json = json.dumps(manifest, ensure_ascii=False).replace("</", "<\\/")
    shell_html = env.get_template("shell.html.jinja").render(
        site_title=site_title,
        welcome_file="_welcome.html",
        manifest_json=manifest_json,
    )
    (output_dir / "index.html").write_text(shell_html, encoding="utf-8")

    if generate_llms:
        generate_llms_files(manifest, output_dir, site_title)

    return manifest
