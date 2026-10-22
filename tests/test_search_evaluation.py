"""Tests for JavaScript search evaluation and word boundary matching."""

import shutil
import subprocess
from pathlib import Path

import pytest


def test_js_search_and_word_boundary():
    node_bin = shutil.which("node")
    if not node_bin:
        pytest.skip("Node.js is not installed on this system.")

    test_file = Path(__file__).parent / "search.test.js"
    assert test_file.exists(), "tests/search.test.js does not exist"

    result = subprocess.run(
        [node_bin, "--test", str(test_file)],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, (
        f"Node tests failed:\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
    )
