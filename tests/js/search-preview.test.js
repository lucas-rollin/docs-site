const test = require("node:test");
const assert = require("node:assert");
const { loadShell, createMockSearchResults } = require("./helpers");

const shell = loadShell();

test("Strict word boundary validation in shell.js", () => {
  const text = "often of offset and roof of the world.";
  const ranges = shell.findWordRanges(text, ["of"]);

  // 'often' (0..5), 'offset' (9..15), and 'roof' (20..24) must NOT match 'of'
  assert.strictEqual(ranges.length, 2);
  assert.deepStrictEqual(ranges[0], [6, 8]);
  assert.strictEqual(text.slice(ranges[0][0], ranges[0][1]), "of");
  assert.deepStrictEqual(ranges[1], [25, 27]);
  assert.strictEqual(text.slice(ranges[1][0], ranges[1][1]), "of");

  const highlighted = shell.highlightTerms(text, ["of"]);
  assert.strictEqual(
    highlighted,
    "often <mark>of</mark> offset and roof <mark>of</mark> the world.",
  );

  // Trailing wildcard highlights full words only from word start
  assert.strictEqual(
    shell.highlightTerms("Configuring and Reconfigure config.", ["config*"]),
    "<mark>Configuring</mark> and Reconfigure <mark>config</mark>.",
  );
});

test("Phrase-first highlighting creates unified mark tags without fragmentation", () => {
  const text = "Welcome to the Map of France document.";
  const terms = ["Map of France", "Map", "of", "France"];
  const highlighted = shell.highlightTerms(text, terms);

  assert.strictEqual(
    highlighted,
    "Welcome to the <mark>Map of France</mark> document.",
  );
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

  // Quoted PDF query strips quotes from #search= and adds &phrase=true
  shell.activateResult(
    "doc-pdf",
    ["installation guide", "installation", "guide"],
    '"installation guide"',
  );
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.strictEqual(copiedText, "installation guide");
  assert.ok(
    contentFrame.src.includes(
      "manual.pdf#search=installation%20guide&phrase=true",
    ),
  );

  // Unquoted multi-word PDF query does not set &phrase=true
  shell.activateResult(
    "doc-pdf",
    ["installation", "guide"],
    "installation guide",
  );
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(contentFrame.src.endsWith("manual.pdf#search=installation%20guide"));
  assert.ok(!contentFrame.src.includes("phrase=true"));
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
  const searchInput = {
    value: "",
    focused: false,
    focus: () => {
      searchInput.focused = true;
    },
  };
  const toast = {
    innerHTML: "",
    classList: { add: () => {}, remove: () => {} },
  };
  const searchResults = createMockSearchResults();

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
  assert.strictEqual(searchResults.results.length, 2);

  const multiEl = searchResults.results[0];
  const singleEl = searchResults.results[1];
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

  multiEl.dispatch("keydown", { key: "ArrowRight", preventDefault: () => {} });
  assert.strictEqual(multiEl.querySelector(".sr-count").textContent, "1 / 3");

  multiEl.dispatch("keydown", { key: "ArrowLeft", preventDefault: () => {} });
  assert.strictEqual(multiEl.querySelector(".sr-count").textContent, "3 / 3");

  // Enter opens the document and copies the unquoted phrase
  multiEl.dispatch("keydown", { key: "Enter", preventDefault: () => {} });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(contentFrame.src.includes("multi.html?hl=%22exact+phrase%22"));
  assert.strictEqual(copiedText, "exact phrase");
});

test("Exact quoted search only highlights and counts exact phrases in dropdown previews", () => {
  const searchResults = createMockSearchResults();
  const mockDocument = {
    getElementById: (id) => (id === "search-results" ? searchResults : null),
  };

  const filler = "padding ".repeat(35);
  const files = [
    {
      id: "doc-two",
      title: "History of Europe",
      relpath: "europe/of-france.md",
      src: "pages/doc-two.html",
      type: "html",
      headings: [],
      text:
        `The geography of Europe features the Map of France here. ` +
        `${filler}` +
        `A middle section speaks of rivers of Europe and of France alone. ` +
        `${filler}` +
        `Another Map of France sits near the end of this guide.`,
    },
    {
      id: "doc-one",
      title: "Travel Notes of Interest",
      relpath: "notes/france.md",
      src: "pages/doc-one.html",
      type: "html",
      headings: [],
      text:
        `Only one Map of France appears here, ` +
        `${filler}` +
        `while plenty of references to France and map of regions follow.`,
    },
  ];

  shell.setManifest({ files });
  shell.initMiniSearch(files);
  shell._setEnv(mockDocument, {});

  shell.runSearch('"Map of France"');
  assert.strictEqual(searchResults.results.length, 2);

  const twoEl = searchResults.results[0];
  const oneEl = searchResults.results[1];

  assert.strictEqual(twoEl.querySelector(".sr-count").textContent, "1 / 2");
  assert.strictEqual(oneEl.querySelector(".sr-count"), null);

  assert.strictEqual(
    twoEl.querySelector(".sr-title-text").innerHTML,
    "History of Europe",
  );
  assert.strictEqual(
    twoEl.querySelector(".sr-path").innerHTML,
    "europe/of-france.md",
  );

  const firstSnippet = twoEl.querySelector(".sr-snippet").innerHTML;
  assert.ok(firstSnippet.includes("<mark>Map of France</mark>"));
  assert.ok(!firstSnippet.includes("<mark>of</mark>"));

  twoEl.dispatch("keydown", { key: "ArrowRight", preventDefault: () => {} });
  assert.strictEqual(twoEl.querySelector(".sr-count").textContent, "2 / 2");
  const secondSnippet = twoEl.querySelector(".sr-snippet").innerHTML;
  assert.ok(secondSnippet.includes("<mark>Map of France</mark>"));
  assert.ok(!secondSnippet.includes("<mark>of</mark>"));

  // Mixed query: exact phrase + unquoted token highlights exact phrase and unquoted token only
  shell.runSearch('rivers "Map of France"');
  assert.strictEqual(searchResults.results.length, 1);
  const mixedEl = searchResults.results[0];
  assert.strictEqual(mixedEl.querySelector(".sr-count").textContent, "1 / 3");
  assert.strictEqual(
    mixedEl.querySelector(".sr-title-text").innerHTML,
    "History of Europe",
  );

  // Unquoted query still highlights individual terms and finds fragmented matches
  shell.runSearch("Map of France");
  assert.strictEqual(
    searchResults.results[0].querySelector(".sr-count").textContent,
    "1 / 3",
  );
  assert.strictEqual(
    searchResults.results[0].querySelector(".sr-title-text").innerHTML,
    "History <mark>of</mark> Europe",
  );
});
