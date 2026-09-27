from docs_site.utils import safe_id, slugify


def test_slugify_basic() -> None:
    used: set[str] = set()
    assert slugify("Introduction to Python", used) == "introduction-to-python"
    assert "introduction-to-python" in used


def test_slugify_collision() -> None:
    used: set[str] = set()
    s1 = slugify("Overview", used)
    s2 = slugify("Overview", used)
    s3 = slugify("Overview", used)
    assert s1 == "overview"
    assert s2 == "overview-2"
    assert s3 == "overview-3"


def test_slugify_empty_or_special_chars() -> None:
    used: set[str] = set()
    assert slugify("!@#$%^", used) == "section"
    assert slugify("", used) == "section-2"


def test_safe_id_basic() -> None:
    used: set[str] = set()
    assert safe_id("notes/chapter1.html", used) == "notes_chapter1_html"
    assert "notes_chapter1_html" in used


def test_safe_id_collision() -> None:
    used: set[str] = set()
    f1 = safe_id("notes/intro", used)
    f2 = safe_id("notes/intro", used)
    assert f1 == "notes_intro"
    assert f2 == "notes_intro_2"


def test_safe_id_empty() -> None:
    used: set[str] = set()
    assert safe_id("///", used) == "file"
