const test = require("node:test");
const assert = require("node:assert");
const { loadShell, createMockSearchResults } = require("./helpers");

const shell = loadShell();

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

test("Apostrophes and contractions are not treated as quote delimiters", () => {
  const contraction = shell.parseSearchQuery("don't");
  assert.deepStrictEqual(contraction.exactPhrases, []);
  assert.deepStrictEqual(contraction.unquotedTokens, ["don", "t"]);
  assert.strictEqual(contraction.copyText, "don't");

  const multiApostrophe = shell.parseSearchQuery("user's guide isn't ready");
  assert.deepStrictEqual(multiApostrophe.exactPhrases, []);
  assert.deepStrictEqual(multiApostrophe.unquotedTokens, [
    "user",
    "s",
    "guide",
    "isn",
    "t",
    "ready",
  ]);

  const quotedApostrophe = shell.parseSearchQuery('"user\'s guide"');
  assert.deepStrictEqual(quotedApostrophe.exactPhrases, ["user's guide"]);
  assert.strictEqual(quotedApostrophe.copyText, "user's guide");

  const files = [
    {
      id: "doc-apostrophe",
      title: "Permissions",
      headings: [],
      text: "Follow the user's guide carefully before editing settings.",
    },
    {
      id: "doc-other",
      title: "Other",
      headings: [],
      text: "A user may read a guide on another topic.",
    },
  ];
  shell.setManifest({ files });
  shell.initMiniSearch(files);

  const hits = shell.searchDocuments('"user\'s guide"');
  assert.strictEqual(hits.length, 1);
  assert.strictEqual(hits[0].id, "doc-apostrophe");
});

test("Search indexes filenames and relative paths", () => {
  const files = [
    {
      id: "doc-france",
      title: "Geography of Europe",
      relpath: "europe/france.md",
      headings: [],
      text: "Cities, regions, and rivers.",
    },
    {
      id: "doc-config",
      title: "Settings Reference",
      relpath: "deploy/config.yaml.md",
      headings: [],
      text: "Environment variables and port numbers.",
    },
  ];

  shell.setManifest({ files });
  shell.initMiniSearch(files);

  const byFilename = shell.searchDocuments("france.md");
  assert.strictEqual(byFilename.length, 1);
  assert.strictEqual(byFilename[0].id, "doc-france");

  const byStem = shell.searchDocuments("france");
  assert.strictEqual(byStem.length, 1);
  assert.strictEqual(byStem[0].id, "doc-france");

  const byPath = shell.searchDocuments("europe/france");
  assert.strictEqual(byPath.length, 1);
  assert.strictEqual(byPath[0].id, "doc-france");

  const quotedFilename = shell.searchDocuments('"france.md"');
  assert.strictEqual(quotedFilename.length, 1);
  assert.strictEqual(quotedFilename[0].id, "doc-france");

  const byConfig = shell.searchDocuments("config.yaml");
  assert.strictEqual(byConfig.length, 1);
  assert.strictEqual(byConfig[0].id, "doc-config");
});

test("Specialized search operators: OR, trailing wildcard *, negation -, and field/type qualifiers", () => {
  const files = [
    {
      id: "doc-docker",
      title: "Docker Containers Guide",
      relpath: "guides/docker.md",
      src: "pages/doc-docker.html",
      type: "markdown",
      headings: [{ level: 2, id: "cfg", text: "Configuration" }],
      text: "Configuring docker containers with compose. Supports legacy mode or modern mode.",
    },
    {
      id: "doc-podman",
      title: "Podman Runtime",
      relpath: "guides/podman.html",
      src: "pages/doc-podman.html",
      type: "html",
      headings: [],
      text: "Podman runs rootless containers without a daemon. Reconfigure settings cleanly.",
    },
    {
      id: "doc-pdf-france",
      title: "European Atlas",
      relpath: "maps/france-atlas.pdf",
      src: "maps/france-atlas.pdf",
      type: "pdf",
      headings: [],
      text: "The Map of France shows major rivers. Deprecated draft note inside.",
    },
    {
      id: "doc-md-france",
      title: "Travel Notes",
      relpath: "notes/europe.md",
      src: "pages/doc-md-france.html",
      type: "markdown",
      headings: [],
      text: "Visiting Germany and reading a map of regions.",
    },
  ];

  shell.setManifest({ files });
  shell.initMiniSearch(files);

  // 1. Trailing wildcard (*) in non-final position matches prefix words, not mid-word substrings
  const wildcardHits = shell.searchDocuments("config* containers");
  assert.strictEqual(wildcardHits.length, 1);
  assert.strictEqual(wildcardHits[0].id, "doc-docker");

  // 2. Negation (-word and -"phrase")
  const negWordHits = shell.searchDocuments("containers -daemon");
  assert.strictEqual(negWordHits.length, 1);
  assert.strictEqual(negWordHits[0].id, "doc-docker");

  const negPhraseHits = shell.searchDocuments('containers -"legacy mode"');
  assert.strictEqual(negPhraseHits.length, 1);
  assert.strictEqual(negPhraseHits[0].id, "doc-podman");

  assert.strictEqual(shell.searchDocuments("-daemon").length, 0);

  // 3. Boolean OR (uppercase OR) vs lowercase 'or'
  const orHits = shell.searchDocuments("docker OR podman");
  assert.strictEqual(orHits.length, 2);

  const lowerOrHits = shell.searchDocuments("docker or compose");
  assert.strictEqual(lowerOrHits.length, 1);
  assert.strictEqual(lowerOrHits[0].id, "doc-docker");

  const orPhraseHits = shell.searchDocuments('"Map of France" OR Germany');
  assert.strictEqual(orPhraseHits.length, 2);

  // 4. Field and type qualifiers (type:, title:, path:)
  const typePdfHits = shell.searchDocuments("type:pdf");
  assert.strictEqual(typePdfHits.length, 1);
  assert.strictEqual(typePdfHits[0].id, "doc-pdf-france");

  const typeMdNegHits = shell.searchDocuments("type:md -docker");
  assert.strictEqual(typeMdNegHits.length, 1);
  assert.strictEqual(typeMdNegHits[0].id, "doc-md-france");

  const titleOnlyHits = shell.searchDocuments("title:containers");
  assert.strictEqual(titleOnlyHits.length, 1);
  assert.strictEqual(titleOnlyHits[0].id, "doc-docker");

  const titlePhraseHits = shell.searchDocuments('title:"Docker Containers"');
  assert.strictEqual(titlePhraseHits.length, 1);
  assert.strictEqual(titlePhraseHits[0].id, "doc-docker");

  const pathHits = shell.searchDocuments("path:maps/france*");
  assert.strictEqual(pathHits.length, 1);
  assert.strictEqual(pathHits[0].id, "doc-pdf-france");

  // 5. copyText strips operators cleanly for Ctrl+F / PDF #search=
  assert.strictEqual(
    shell.parseSearchQuery("config* -daemon type:md").copyText,
    "config",
  );
  assert.strictEqual(
    shell.parseSearchQuery("docker OR podman").copyText,
    "docker",
  );
  assert.strictEqual(
    shell.parseSearchQuery('type:pdf "Map of France" -draft').copyText,
    "Map of France",
  );

  // 6. runSearch integrates OR branch highlighting & title-only scoping in DOM dropdown
  const searchResults = createMockSearchResults();
  shell._setEnv(
    { getElementById: (id) => (id === "search-results" ? searchResults : null) },
    {},
  );

  shell.runSearch("title:Guide containers -daemon");
  assert.strictEqual(searchResults.results.length, 1);
  assert.strictEqual(
    searchResults.results[0].querySelector(".sr-title-text").innerHTML,
    "Docker <mark>Containers</mark> <mark>Guide</mark>",
  );
  assert.ok(
    searchResults.results[0]
      .querySelector(".sr-snippet")
      .innerHTML.includes("<mark>containers</mark>"),
  );

  // OR query does not highlight non-matching branch terms or 'OR'
  shell.runSearch('"Map of France" OR Germany');
  assert.strictEqual(searchResults.results.length, 2);
  const mdEntry = searchResults.results.find(
    (r) => r.querySelector(".sr-title-text").innerHTML === "Travel Notes",
  );
  assert.ok(mdEntry);
  const mdSnippet = mdEntry.querySelector(".sr-snippet").innerHTML;
  assert.ok(mdSnippet.includes("<mark>Germany</mark>"));
  assert.ok(!mdSnippet.includes("<mark>map</mark>"));
  assert.ok(!mdSnippet.includes("<mark>of</mark>"));
});
