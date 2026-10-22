const test = require("node:test");
const assert = require("node:assert");

global.MiniSearch = require("../src/docs_site/static/js/minisearch.min.js");
const shell = require("../src/docs_site/static/js/shell.js");
const listener = require("../src/docs_site/static/js/content-dark-listener.js");

test("Strict word boundary validation in shell.js", () => {
  const text = "often of offset and roof of the world.";
  const ranges = shell.findWordRanges(text, ["of"]);

  // 'often' (0..5), 'offset' (9..15), and 'roof' (20..24) must NOT match 'of'
  // Only the two standalone 'of' occurrences at 6..8 and 25..27 should match
  assert.strictEqual(ranges.length, 2);
  assert.deepStrictEqual(ranges[0], [6, 8]);
  assert.strictEqual(text.slice(ranges[0][0], ranges[0][1]), "of");
  assert.deepStrictEqual(ranges[1], [25, 27]);
  assert.strictEqual(text.slice(ranges[1][0], ranges[1][1]), "of");

  // Highlighting text must only highlight standalone 'of'
  const highlighted = shell.highlightTerms(text, ["of"]);
  assert.strictEqual(
    highlighted,
    "often <mark>of</mark> offset and roof <mark>of</mark> the world.",
  );
});

test("Strict word boundary validation in content-dark-listener.js", () => {
  const text = "often of offset and roof of the world.";
  const matches = listener.findMatchesInText(text, ["of"]);

  assert.strictEqual(matches.length, 2);
  assert.deepStrictEqual(matches[0], [6, 8]);
  assert.deepStrictEqual(matches[1], [25, 27]);
});

test("Phrase-first highlighting creates unified mark tags without fragmentation", () => {
  const text = "Welcome to the Map of France document.";
  const terms = ["Map of France", "Map", "of", "France"];
  const highlighted = shell.highlightTerms(text, terms);

  // The contiguous phrase must be wrapped in a single <mark> tag
  assert.strictEqual(
    highlighted,
    "Welcome to the <mark>Map of France</mark> document.",
  );

  // Content listener matching on multi-word phrase
  const listenerMatches = listener.findMatchesInText(text, ["Map of France"]);
  assert.strictEqual(listenerMatches.length, 1);
  assert.strictEqual(
    text.slice(listenerMatches[0][0], listenerMatches[0][1]),
    "Map of France",
  );
});

test("Multi-word queries strictly require all terms (no partial OR matches)", () => {
  const files = [
    {
      id: "doc-full",
      title: "Geography",
      headings: [],
      text: "This article contains a Map of France with cities.",
    },
    {
      id: "doc-partial-map-of",
      title: "Cartography",
      headings: [],
      text: "A map of something else without the other country.",
    },
    {
      id: "doc-filler-only",
      title: "History of Time",
      headings: [],
      text: "The story of great events and of kings.",
    },
  ];

  shell.setManifest({ files });
  shell.initMiniSearch(files);

  // Searching 'Map of France' must only return 'doc-full'
  const hits = shell.searchDocuments("Map of France");
  assert.strictEqual(hits.length, 1);
  assert.strictEqual(hits[0].id, "doc-full");

  // Query with a term not present in any document must return 0 hits (no silent OR fallback)
  const zeroHits = shell.searchDocuments("Map of Atlantis");
  assert.strictEqual(zeroHits.length, 0);

  // Empty state check for multi-word queries
  const parsed = shell.parseSearchQuery("Map of Atlantis");
  assert.ok(parsed.allTerms.length > 1);
});

test("Contiguous phrase matches rank at the top of search results", () => {
  const files = [
    {
      id: "doc-scattered",
      title: "Scattered Document",
      headings: [],
      text: "Here is a map showing regions. All of these belong to France.",
    },
    {
      id: "doc-contiguous-body",
      title: "Contiguous Body Document",
      headings: [],
      text: "Here is the official Map of France for tourists.",
    },
    {
      id: "doc-contiguous-title",
      title: "Map of France Overview",
      headings: [],
      text: "Detailed guide for exploring cities.",
    },
  ];

  shell.setManifest({ files });
  shell.initMiniSearch(files);

  const hits = shell.searchDocuments("Map of France");
  assert.strictEqual(hits.length, 3);

  // Contiguous phrase in title ranks first, then contiguous phrase in body, then scattered
  assert.strictEqual(hits[0].id, "doc-contiguous-title");
  assert.strictEqual(hits[1].id, "doc-contiguous-body");
  assert.strictEqual(hits[2].id, "doc-scattered");
});

test("Exact phrase search with quotes matches only consecutive terms", () => {
  const files = [
    {
      id: "doc-consecutive",
      title: "Installation Guide",
      headings: [],
      text: "Follow this installation guide step by step.",
    },
    {
      id: "doc-non-consecutive",
      title: "General Guide",
      headings: [],
      text: "This guide covers software installation and configuration.",
    },
  ];

  shell.setManifest({ files });
  shell.initMiniSearch(files);

  // Unquoted: both documents match because both contain both terms
  const unquotedHits = shell.searchDocuments("installation guide");
  assert.strictEqual(unquotedHits.length, 2);
  assert.strictEqual(unquotedHits[0].id, "doc-consecutive");

  // Quoted exact phrase: only consecutive terms document matches
  const quotedHits = shell.searchDocuments('"installation guide"');
  assert.strictEqual(quotedHits.length, 1);
  assert.strictEqual(quotedHits[0].id, "doc-consecutive");
});

test("Highlight query parsing in content-dark-listener.js", () => {
  // Quoted query marks exactOnly: true
  const quotedParsed = listener.parseHighlightQuery('"installation guide"');
  assert.deepStrictEqual(quotedParsed.phrases, ["installation guide"]);
  assert.deepStrictEqual(quotedParsed.tokens, ["installation", "guide"]);
  assert.strictEqual(quotedParsed.exactOnly, true);

  // Unquoted multi-word creates candidate contiguous phrase and tokens
  const unquotedParsed = listener.parseHighlightQuery("Map of France");
  assert.deepStrictEqual(unquotedParsed.phrases, ["Map of France"]);
  assert.deepStrictEqual(unquotedParsed.tokens, ["Map", "of", "France"]);
  assert.strictEqual(unquotedParsed.exactOnly, false);

  // Single word has no phrase
  const singleParsed = listener.parseHighlightQuery("installation");
  assert.deepStrictEqual(singleParsed.phrases, []);
  assert.deepStrictEqual(singleParsed.tokens, ["installation"]);
  assert.strictEqual(singleParsed.exactOnly, false);
});
