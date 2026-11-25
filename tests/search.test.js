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

test("Clipboard-assisted search transition in shell.js", async () => {
  let copiedText = "";
  const mockClipboard = {
    writeText: async (text) => {
      copiedText = text;
      return true;
    },
  };

  const mockWindow = {
    navigator: {
      clipboard: mockClipboard,
      platform: "Linux x86_64",
    },
  };

  const toast = {
    innerHTML: "",
    classList: {
      add: (c) => toast.classes.add(c),
      remove: (c) => toast.classes.delete(c),
    },
    classes: new Set(),
  };

  const searchResults = {
    classList: {
      add: (c) => searchResults.classes.add(c),
      remove: (c) => searchResults.classes.delete(c),
      contains: (c) => searchResults.classes.has(c),
    },
    classes: new Set(["open"]),
  };

  const searchInput = { value: "installation guide" };
  const contentFrame = { src: "" };

  const mockDocument = {
    getElementById: (id) => {
      if (id === "copy-toast") return toast;
      if (id === "search-results") return searchResults;
      if (id === "search-input") return searchInput;
      if (id === "content-frame") return contentFrame;
      return null;
    },
    createElement: () => ({ style: {}, focus: () => {}, select: () => {} }),
    body: { appendChild: () => {}, removeChild: () => {} },
  };

  const files = [
    {
      id: "doc-1",
      title: "Installation Guide",
      relpath: "install.html",
      src: "install.html",
      type: "html",
    },
    {
      id: "doc-pdf",
      title: "Manual",
      relpath: "manual.pdf",
      src: "manual.pdf",
      type: "pdf",
    },
  ];
  shell.setManifest({ files });
  shell._setEnv(mockDocument, mockWindow);

  // Activate result for HTML document
  shell.activateResult("doc-1", ["installation", "guide"], "installation guide");

  // Allow clipboard promise to resolve
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.strictEqual(copiedText, "installation guide");
  assert.strictEqual(searchInput.value, "");
  assert.strictEqual(searchResults.classes.has("open"), false);
  assert.ok(contentFrame.src.includes("install.html?hl=installation+guide"));
  assert.ok(toast.classes.has("show"));
  assert.ok(
    toast.innerHTML.includes(
      'Copied "<strong>installation guide</strong>" to clipboard',
    ),
  );
  assert.ok(toast.innerHTML.includes("<kbd>Ctrl+F</kbd>"));

  // Mac platform test for ⌘F shortcut
  mockWindow.navigator.platform = "MacIntel";
  shell.activateResult("doc-pdf", ["manual"], "manual");
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.strictEqual(copiedText, "manual");
  assert.ok(contentFrame.src.includes("manual.pdf#search=manual"));
  assert.ok(toast.innerHTML.includes("<kbd>⌘F</kbd>"));

  // Quoted phrase strips quotes for clipboard & PDF #search= while keeping ?hl= quoted
  shell.activateResult(
    "doc-1",
    ["installation guide", "installation", "guide"],
    '"installation guide"',
  );
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.strictEqual(copiedText, "installation guide");
  assert.ok(
    contentFrame.src.includes("install.html?hl=%22installation+guide%22"),
  );
  assert.ok(
    toast.innerHTML.includes(
      'Copied "<strong>installation guide</strong>" to clipboard',
    ),
  );

  // Mixed query copies only the exact phrase for browser Ctrl+F
  shell.activateResult(
    "doc-1",
    ["installation guide", "docker", "installation", "guide"],
    'docker "installation guide"',
  );
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.strictEqual(copiedText, "installation guide");

  // Quoted PDF query strips quotes from #search=
  shell.activateResult(
    "doc-pdf",
    ["installation guide", "installation", "guide"],
    '"installation guide"',
  );
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.strictEqual(copiedText, "installation guide");
  assert.ok(contentFrame.src.includes("manual.pdf#search=installation%20guide"));
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

  // Highlighting parser also preserves apostrophes
  const hlContraction = listener.parseHighlightQuery("don't");
  assert.strictEqual(hlContraction.exactOnly, false);
  assert.deepStrictEqual(hlContraction.tokens, ["don", "t"]);

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

  const hlMatches = listener.findMatchesInText(files[0].text, ["user's guide"]);
  assert.strictEqual(hlMatches.length, 1);
  assert.strictEqual(
    files[0].text.slice(hlMatches[0][0], hlMatches[0][1]),
    "user's guide",
  );
});

test("extractSnippetWindows clusters distinct occurrences and avoids duplicates", () => {
  const fillerA = "alpha ".repeat(40);
  const fillerB = "beta ".repeat(40);
  const file = {
    id: "doc-multi",
    title: "Long Document",
    headings: [],
    text:
      `Intro text with widget near the start and another widget ten words later. ` +
      `${fillerA}` +
      `Middle section mentions widget alongside target phrase here. ` +
      `${fillerB}` +
      `Closing section has a final widget reference at the end.`,
  };

  const windows = shell.extractSnippetWindows(file, ["widget"], 120);
  assert.strictEqual(windows.length, 3);
  assert.strictEqual(new Set(windows).size, 3);
  assert.ok(windows[0].includes("widget"));
  assert.ok(windows.some((w) => w.includes("Middle section")));
  assert.ok(windows.some((w) => w.includes("Closing section")));

  // Nearby matches in a short text collapse to a single preview window
  const shortFile = {
    id: "doc-short",
    title: "Short Document",
    headings: [],
    text: "First widget and second widget sit in the same short sentence.",
  };
  const singleWindow = shell.extractSnippetWindows(shortFile, ["widget"], 160);
  assert.strictEqual(singleWindow.length, 1);
});

test("Search result arrows and keyboard navigation cycle previews without opening file", async () => {
  let copiedText = "";
  const contentFrame = { src: "" };
  const searchInput = { value: "", focused: false, focus: () => { searchInput.focused = true; } };
  const toast = { innerHTML: "", classList: { add: () => {}, remove: () => {} } };

  function makeMockResultEl(attrsHtml, bodyHtml) {
    const listeners = {};
    const decodeAttr = (name) => {
      const m = attrsHtml.match(new RegExp(`${name}="([^"]*)"`));
      return m
        ? m[1]
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
        : "";
    };
    const hasPager = bodyHtml.includes("sr-pager");
    const countMatch = bodyHtml.match(/<span class="sr-count">([^<]*)<\/span>/);
    const snippetMatch = bodyHtml.match(/<span class="sr-snippet">([\s\S]*?)<\/span>/);

    const makeSubEl = (initial) => {
      const subListeners = {};
      return {
        textContent: initial,
        innerHTML: initial,
        addEventListener: (ev, fn) => {
          subListeners[ev] = subListeners[ev] || [];
          subListeners[ev].push(fn);
        },
        dispatch: (ev, eventObj = {}) => {
          for (const fn of subListeners[ev] || []) fn(eventObj);
        },
      };
    };

    const prevBtn = hasPager ? makeSubEl("‹") : null;
    const nextBtn = hasPager ? makeSubEl("›") : null;
    const countEl = hasPager ? makeSubEl(countMatch ? countMatch[1] : "") : null;
    const snippetEl = makeSubEl(snippetMatch ? snippetMatch[1] : "");

    return {
      dataset: {
        id: decodeAttr("data-id"),
        terms: decodeAttr("data-terms"),
        hl: decodeAttr("data-hl"),
      },
      focused: false,
      focus() {
        this.focused = true;
      },
      addEventListener: (ev, fn) => {
        listeners[ev] = listeners[ev] || [];
        listeners[ev].push(fn);
      },
      querySelector: (sel) => {
        if (sel === ".sr-prev") return prevBtn;
        if (sel === ".sr-next") return nextBtn;
        if (sel === ".sr-count") return countEl;
        if (sel === ".sr-snippet") return snippetEl;
        return null;
      },
      dispatch: (ev, eventObj = {}) => {
        for (const fn of listeners[ev] || []) fn(eventObj);
      },
    };
  }

  let parsedResults = [];
  const searchResults = {
    _html: "",
    classes: new Set(),
    classList: {
      add: (c) => searchResults.classes.add(c),
      remove: (c) => searchResults.classes.delete(c),
      contains: (c) => searchResults.classes.has(c),
    },
    set innerHTML(val) {
      this._html = val;
      parsedResults = [];
      const re = /<div class="search-result"([^>]*)>([\s\S]*?)<\/div>/g;
      let m = re.exec(val);
      while (m !== null) {
        parsedResults.push(makeMockResultEl(m[1], m[2]));
        m = re.exec(val);
      }
    },
    get innerHTML() {
      return this._html;
    },
    querySelectorAll: (sel) => (sel === ".search-result" ? parsedResults : []),
    querySelector: (sel) => (sel === ".search-result" ? parsedResults[0] || null : null),
  };

  const mockDocument = {
    getElementById: (id) => {
      if (id === "search-results") return searchResults;
      if (id === "search-input") return searchInput;
      if (id === "content-frame") return contentFrame;
      if (id === "copy-toast") return toast;
      return null;
    },
    createElement: () => ({ style: {}, focus: () => {}, select: () => {} }),
    body: { appendChild: () => {}, removeChild: () => {} },
  };
  const mockWindow = {
    navigator: {
      clipboard: {
        writeText: async (text) => {
          copiedText = text;
          return true;
        },
      },
      platform: "Linux x86_64",
    },
  };

  const files = [
    {
      id: "doc-multi",
      title: "Multi Match",
      relpath: "multi.html",
      src: "multi.html",
      type: "html",
      headings: [],
      text:
        `First paragraph mentions exact phrase here. ` +
        `${"padding ".repeat(35)}` +
        `Second section also mentions exact phrase near the middle. ` +
        `${"padding ".repeat(35)}` +
        `Third section ends with exact phrase too.`,
    },
    {
      id: "doc-single",
      title: "Single Match",
      relpath: "single.html",
      src: "single.html",
      type: "html",
      headings: [],
      text: "Only one occurrence of exact phrase exists here.",
    },
  ];

  shell.setManifest({ files });
  shell.initMiniSearch(files);
  shell._setEnv(mockDocument, mockWindow);

  shell.runSearch('"exact phrase"');
  assert.strictEqual(parsedResults.length, 2);

  // Multi-match result has pager; single-match result does not
  const multiEl = parsedResults[0];
  const singleEl = parsedResults[1];
  assert.ok(multiEl.querySelector(".sr-prev") !== null);
  assert.ok(multiEl.querySelector(".sr-next") !== null);
  assert.strictEqual(multiEl.querySelector(".sr-count").textContent, "1 / 3");
  assert.strictEqual(singleEl.querySelector(".sr-count"), null);

  const initialSnippet = multiEl.querySelector(".sr-snippet").innerHTML;
  assert.ok(initialSnippet.includes("<mark>exact phrase</mark>"));

  // Clicking next button cycles preview without opening file
  let stopped = false;
  multiEl.querySelector(".sr-next").dispatch("click", {
    stopPropagation: () => {
      stopped = true;
    },
  });
  assert.strictEqual(stopped, true);
  assert.strictEqual(contentFrame.src, "");
  assert.strictEqual(multiEl.querySelector(".sr-count").textContent, "2 / 3");
  const secondSnippet = multiEl.querySelector(".sr-snippet").innerHTML;
  assert.notStrictEqual(secondSnippet, initialSnippet);

  // Keyboard ArrowRight advances to 3 / 3 and ArrowLeft wraps/steps back
  let prevented = false;
  multiEl.dispatch("keydown", {
    key: "ArrowRight",
    preventDefault: () => {
      prevented = true;
    },
  });
  assert.strictEqual(prevented, true);
  assert.strictEqual(multiEl.querySelector(".sr-count").textContent, "3 / 3");
  assert.strictEqual(contentFrame.src, "");

  // ArrowRight from 3 / 3 wraps to 1 / 3
  multiEl.dispatch("keydown", { key: "ArrowRight", preventDefault: () => {} });
  assert.strictEqual(multiEl.querySelector(".sr-count").textContent, "1 / 3");

  // ArrowLeft from 1 / 3 wraps to 3 / 3
  multiEl.dispatch("keydown", { key: "ArrowLeft", preventDefault: () => {} });
  assert.strictEqual(multiEl.querySelector(".sr-count").textContent, "3 / 3");

  // Enter opens the document and copies the unquoted phrase
  multiEl.dispatch("keydown", { key: "Enter", preventDefault: () => {} });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(contentFrame.src.includes("multi.html?hl=%22exact+phrase%22"));
  assert.strictEqual(copiedText, "exact phrase");
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

test("Sidebar file list shows muted filename when title differs from stem", () => {
  const leftPanel = {
    innerHTML: "",
    querySelectorAll: () => [],
  };
  const mockDocument = {
    getElementById: (id) => (id === "left-panel" ? leftPanel : null),
  };

  shell.setManifest({
    files: [
      {
        id: "f1",
        type: "markdown",
        title: "Getting Started",
        relpath: "guides/getting-started.md",
      },
      {
        id: "f2",
        type: "markdown",
        title: "README",
        relpath: "README.md",
      },
    ],
  });
  shell._setEnv(mockDocument, {});
  shell.renderFileList();

  assert.ok(leftPanel.innerHTML.includes('<span class="file-title">Getting Started</span>'));
  assert.ok(leftPanel.innerHTML.includes('<span class="file-filename">getting-started.md</span>'));
  assert.ok(leftPanel.innerHTML.includes('<span class="file-title">README</span>'));
  assert.ok(!leftPanel.innerHTML.includes('<span class="file-filename">README.md</span>'));
});

