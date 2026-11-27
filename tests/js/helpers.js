const MiniSearch = require("../../src/docs_site/static/js/minisearch.min.js");

function loadShell() {
  global.MiniSearch = MiniSearch;
  return require("../../src/docs_site/static/js/shell.js");
}

function loadListener() {
  return require("../../src/docs_site/static/js/content-dark-listener.js");
}

function decodeHtmlAttr(attrsHtml, name) {
  const m = attrsHtml.match(new RegExp(`${name}="([^"]*)"`));
  return m
    ? m[1]
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
    : "";
}

function makeSubEl(initial) {
  const listeners = {};
  return {
    textContent: initial,
    innerHTML: initial,
    addEventListener: (ev, fn) => {
      listeners[ev] = listeners[ev] || [];
      listeners[ev].push(fn);
    },
    dispatch: (ev, eventObj = {}) => {
      for (const fn of listeners[ev] || []) fn(eventObj);
    },
  };
}

function makeMockResultEl(attrsHtml, bodyHtml) {
  const listeners = {};
  const hasPager = bodyHtml.includes("sr-pager");
  const countMatch = bodyHtml.match(/<span class="sr-count">([^<]*)<\/span>/);
  const titleMatch = bodyHtml.match(
    /<span class="sr-title-text">([\s\S]*?)<\/span>/,
  );
  const pathMatch = bodyHtml.match(/<span class="sr-path">([\s\S]*?)<\/span>/);
  const snippetMatch = bodyHtml.match(
    /<span class="sr-snippet">([\s\S]*?)<\/span>/,
  );

  const prevBtn = hasPager ? makeSubEl("‹") : null;
  const nextBtn = hasPager ? makeSubEl("›") : null;
  const countEl = hasPager ? makeSubEl(countMatch ? countMatch[1] : "") : null;
  const titleEl = makeSubEl(titleMatch ? titleMatch[1] : "");
  const pathEl = makeSubEl(pathMatch ? pathMatch[1] : "");
  const snippetEl = makeSubEl(snippetMatch ? snippetMatch[1] : "");

  return {
    dataset: {
      id: decodeHtmlAttr(attrsHtml, "data-id"),
      terms: decodeHtmlAttr(attrsHtml, "data-terms"),
      hl: decodeHtmlAttr(attrsHtml, "data-hl"),
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
      if (sel === ".sr-title-text") return titleEl;
      if (sel === ".sr-path") return pathEl;
      if (sel === ".sr-snippet") return snippetEl;
      return null;
    },
    dispatch: (ev, eventObj = {}) => {
      for (const fn of listeners[ev] || []) fn(eventObj);
    },
  };
}

function createMockSearchResults() {
  let parsedResults = [];
  let html = "";
  const classes = new Set();

  return {
    classes,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
    set innerHTML(val) {
      html = val;
      parsedResults = [];
      const re = /<div class="search-result"([^>]*)>([\s\S]*?)<\/div>/g;
      let m = re.exec(val);
      while (m !== null) {
        parsedResults.push(makeMockResultEl(m[1], m[2]));
        m = re.exec(val);
      }
    },
    get innerHTML() {
      return html;
    },
    get results() {
      return parsedResults;
    },
    querySelectorAll: (sel) => (sel === ".search-result" ? parsedResults : []),
    querySelector: (sel) =>
      sel === ".search-result" ? parsedResults[0] || null : null,
  };
}

module.exports = {
  loadShell,
  loadListener,
  createMockSearchResults,
};
