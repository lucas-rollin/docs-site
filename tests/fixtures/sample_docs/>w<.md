# Markdown Fixture

This document serves as a fixture for testing table of contents (TOC) extraction, heading outline hierarchies, and CSS prose typography styling.

<address>Maintained by the <a href="https://example.com">Fixture Working Group</a></address>

<time datetime="2026-09-27">Last revised: 27 september 2026</time>

## Text Formatting & Inline Elements

Good documentation relies on clear typographic visual hierarchy. You can emphasize key points using **strong text** or *emphasized italics*, highlight <mark>important terms</mark>, and denote <del>deprecated methods</del> alongside <ins>new standards</ins>. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

Inlined code such as `render_page(context)` should stand out naturally from surrounding text. You may also encounter keyboard inputs like <kbd>Ctrl</kbd> + <kbd>C</kbd>, standard abbreviations like <abbr title="HyperText Markup Language">HTML</abbr>, or technical variables like <var>x</var> and <var>y</var>. Scientific notation exercises superscript and subscript: water is H<sub>2</sub>O, and the classic example is E&nbsp;=&nbsp;mc<sup>2</sup>.

## Heading Hierarchy & Navigation

This section verifies deep heading nesting for TOC generation and slugified anchor ID extraction.

### Core Concepts

Eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.

#### Primary Structures

Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.

#### Secondary Structures

Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse.

### Composition

At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.

##### Nested Detail Level

Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio.

###### Deepest Detail Level

Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est.

## Lists & Structured Content

Structured lists should maintain consistent margins, padding, and marker alignments.

### Unordered Feature List

- Automatic outline generation from headings
- Static asset handling with zero-rebuild previews
- Broad format support:
  - Rich text documents (full semantic parsing)
  - Portable documents (text & outline extraction)
- Zero-config local preview workflow

### Ordered Step-by-Step Guide

1. Clone the repository locally.
2. Install project dependencies.
3. Run the automated test suite.
4. Preview the build output against sample documents.

### Task List

- ☑ Draft the initial outline
- ☑ Review formatting against the style guide
- ☐ Collect feedback from reviewers
- ☐ Publish the final revision

### Definition Terms

<dl>
<dt>Manifest</dt>
<dd>A structured file containing the blueprint and metadata of a scanned document set.</dd>
<dt>Slug</dt>
<dd>A URL-friendly string generated from a heading for direct anchor linking.</dd>
<dt>Fixture</dt>
<dd>A fixed, known piece of sample data used repeatedly to test behavior under consistent conditions.</dd>
</dl>

## Code Blocks & Preformatted Text

Verify that code blocks preserve whitespace, handle line wrapping, and render monospace fonts accurately.

```python
def fibonacci(n: int) -> list[int]:
    """Return the first n numbers of the Fibonacci sequence."""
    sequence: list[int] = []
    a, b = 0, 1
    for _ in range(n):
        sequence.append(a)
        a, b = b, a + b
    return sequence


if __name__ == "__main__":
    print(fibonacci(10))
```

ASCII art and raw terminal output test standard preformatted rendering without inline code wrapping:

```
     .--.
    /    \
   | ()  () |
    \  ~~  /
     '----'
    /|    |\
   / |    | \
  *  |    |  *

  +-----------+     +-----------+     +-----------+
  |   INPUT   | --> |  PROCESS  | --> |   OUTPUT  |
  +-----------+     +-----------+     +-----------+
        |                 |                 |
        v                 v                 v
     parsed            transformed        rendered
```

## Quotes, Callouts & Disclosure

Blockquotes present cited quotes, highlights, or technical callout blocks.

> Simplicity is a prerequisite for reliability.
>
> — <cite>An Engineer's Notebook</cite>

Collapsible disclosure widgets are common in modern documentation:

<details>
<summary>Click to expand additional notes</summary>

Curabitur pretium tincidunt lacus, et sagittis nunc sagittis sit amet. Nulla facilisi. Donec pulvinar odio velit, vel malesuada arcu blandit quis. This content is hidden by default and only shown on interaction.

</details>

## Data Tables

Tables must render with clear borders and aligned headers.

| Format | Support Level | Notes | Status |
| --- | --- | --- | --- |
| Alpha | Full | Baseline reference format | Stable |
| Beta | Partial | Missing edge-case handling | In progress |
| Gamma | Planned | Design under review | Not started |

## Media & Figures

Figures pair a captioned block with descriptive text, commonly used for diagrams or illustrations.

<figure>
<pre>
   ___________
  |  FIXTURE  |
  |  SAMPLE   |
  |___________|
      |   |
      |   |
     _|   |_
</pre>
<figcaption>Figure 1: A placeholder diagram used purely for layout testing.</figcaption>
</figure>

---

## Closing Remarks

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.

---

<footer>
<small>© 2026 Fixture Document Suite. Special characters test: &amp;, &lt;, &gt;, &quot;, &apos;, &nbsp;, —.</small>
</footer>