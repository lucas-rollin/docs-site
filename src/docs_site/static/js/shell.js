(() => {
  const isNode = typeof window === "undefined";
  const MANIFEST =
    !isNode && window.DOCS_MANIFEST ? window.DOCS_MANIFEST : { files: [] };

  let doc = typeof document !== "undefined" ? document : null;
  let win = typeof window !== "undefined" ? window : null;
  let contentFrame = doc?.getElementById("content-frame");
  let leftPanel = doc?.getElementById("left-panel");
  let drawerBackdrop = doc?.getElementById("drawer-backdrop");
  let navToggleBtn = doc?.getElementById("nav-toggle-btn");
  let tocBody = doc?.getElementById("toc-body");
  let tocToggleBtn = doc?.getElementById("toc-toggle-btn");
  let tocPopover = doc?.getElementById("toc-popover");
  let tocPopoverBody = doc?.getElementById("toc-popover-body");
  let searchInput = doc?.getElementById("search-input");
  let searchResults = doc?.getElementById("search-results");
  let darkToggle = doc?.getElementById("dark-toggle");
  let copyPageBtn = doc?.getElementById("copy-page-btn");
  let copyToast = doc?.getElementById("copy-toast");

  let currentFileId = null;
  let darkMode = false;
  let lastQuery = "";
  let toastTimer = null;

  function showToast(html) {
    if (!copyToast) return;
    copyToast.innerHTML = html;
    copyToast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      copyToast?.classList.remove("show");
    }, 2200);
  }

  function fileById(id) {
    return MANIFEST.files.find((f) => f.id === id);
  }

  function filenameOf(file) {
    const rel = file?.relpath || "";
    const idx = rel.lastIndexOf("/");
    return idx === -1 ? rel : rel.slice(idx + 1);
  }

  function stemOf(filename) {
    const dot = filename.lastIndexOf(".");
    return dot > 0 ? filename.slice(0, dot) : filename;
  }

  const ICONS = {
    html: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    pdf: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 12h4"/><path d="M10 16h4"/></svg>',
    markdown:
      '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15V9l2.5 3 2.5-3v6"/><path d="M17 9v6m-2-2l2 2 2-2"/></svg>',
    moon: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    sun: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  };

  function iconFor(type) {
    return ICONS[type] || ICONS.html;
  }

  function escapeHtml(s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }

  // --- File list (left sidebar) -------------------------------------------

  function renderFileList() {
    if (!leftPanel) return;
    const groups = {};
    for (const f of MANIFEST.files) {
      const dir = f.relpath.includes("/")
        ? f.relpath.slice(0, f.relpath.lastIndexOf("/"))
        : "";
      groups[dir] = groups[dir] || [];
      groups[dir].push(f);
    }
    const dirs = Object.keys(groups).sort();
    let html = "";
    for (const dir of dirs) {
      html += `<div class="panel-heading">${dir ? escapeHtml(dir) : "Root"}</div><ul class="file-list">`;
      for (const f of groups[dir]) {
        const filename = filenameOf(f);
        const stem = stemOf(filename);
        const showFilename =
          Boolean(filename) &&
          (f.title || "").trim().toLowerCase() !== stem.toLowerCase();
        const subHtml = showFilename
          ? `<span class="file-filename">${escapeHtml(filename)}</span>`
          : "";
        html +=
          `<li class="file-item"><a href="#" data-id="${f.id}" title="${escapeHtml(filename || f.title)}" class="${f.id === currentFileId ? "active" : ""}">` +
          `<span class="type-icon">${iconFor(f.type)}</span>` +
          `<span class="file-label"><span class="file-title">${escapeHtml(f.title)}</span>${subHtml}</span>` +
          `</a></li>`;
      }
      html += "</ul>";
    }
    leftPanel.innerHTML =
      html || '<div class="toc-empty">No documents found.</div>';
    leftPanel.querySelectorAll(".file-item a").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        selectFile(a.dataset.id);
      });
    });
  }

  // --- Responsive drawer & TOC popover ------------------------------------

  function setNavDrawerOpen(open) {
    const isOpen = Boolean(open);
    leftPanel?.classList.toggle("open", isOpen);
    drawerBackdrop?.classList.toggle("open", isOpen);
    navToggleBtn?.setAttribute("aria-expanded", String(isOpen));
  }

  function closeNavDrawer() {
    setNavDrawerOpen(false);
  }

  function toggleNavDrawer() {
    const isOpen = Boolean(leftPanel?.classList.contains("open"));
    if (!isOpen) closeTocPopover();
    setNavDrawerOpen(!isOpen);
  }

  function setTocPopoverOpen(open) {
    const isOpen = Boolean(open);
    tocPopover?.classList.toggle("open", isOpen);
    tocToggleBtn?.setAttribute("aria-expanded", String(isOpen));
  }

  function closeTocPopover() {
    setTocPopoverOpen(false);
  }

  function toggleTocPopover() {
    const isOpen = Boolean(tocPopover?.classList.contains("open"));
    if (!isOpen) closeNavDrawer();
    setTocPopoverOpen(!isOpen);
  }

  // --- Table of contents (right sidebar & responsive popover) -------------

  function renderTocInto(container, file, onSelect) {
    if (!container) return;
    if (!file?.headings || file.headings.length === 0) {
      container.className = "toc-empty";
      container.textContent =
        file && file.type === "pdf"
          ? "No bookmarks in this PDF."
          : "No headings found.";
      return;
    }
    const minLevel = Math.min(...file.headings.map((h) => h.level));
    let html = '<ul class="toc-list">';
    for (const h of file.headings) {
      const indent = (h.level - minLevel) * 12;
      const target = file.type === "pdf" ? `#page=${h.page}` : `#${h.id}`;
      html += `<li class="toc-item" style="--indent:${indent}px"><a href="#" data-target="${escapeHtml(target)}">${escapeHtml(h.text)}</a></li>`;
    }
    html += "</ul>";
    container.className = "";
    container.innerHTML = html;
    container.querySelectorAll(".toc-item a").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        jumpTo(a.dataset.target);
        onSelect?.();
      });
    });
  }

  function renderToc(file) {
    renderTocInto(tocBody, file);
    renderTocInto(tocPopoverBody, file, closeTocPopover);
  }

  // --- Content frame navigation --------------------------------------------

  function isHtmlPage(file) {
    return file && file.type !== "pdf";
  }

  let activeHighlight = [];
  let activeHighlightQuery = "";

  function contentUrl(file, hash) {
    let url = file.src;
    const highlightParam =
      activeHighlightQuery ||
      (activeHighlight && activeHighlight.length > 0
        ? activeHighlight.join(" ")
        : "");
    if (isHtmlPage(file)) {
      const params = new URLSearchParams();
      if (darkMode) params.set("dark", "1");
      if (highlightParam) {
        params.set("hl", highlightParam);
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
      if (hash) url += hash.startsWith("#") ? hash : `#${hash}`;
    } else if (file.type === "pdf") {
      let combinedHash = hash || "";
      if (highlightParam) {
        const parsedPdf = parseSearchQuery(highlightParam);
        const pdfQuery = parsedPdf.copyText || highlightParam;
        const phraseFlag =
          parsedPdf.exactPhrases.length > 0 ? "&phrase=true" : "";
        const searchParam = `search=${encodeURIComponent(pdfQuery)}${phraseFlag}`;
        if (combinedHash) {
          const stripped = combinedHash.startsWith("#")
            ? combinedHash.slice(1)
            : combinedHash;
          combinedHash = `#${stripped}&${searchParam}`;
        } else {
          combinedHash = `#${searchParam}`;
        }
      }
      if (combinedHash) {
        url += combinedHash.startsWith("#") ? combinedHash : `#${combinedHash}`;
      }
    } else if (hash) {
      url += hash.startsWith("#") ? hash : `#${hash}`;
    }
    return url;
  }

  function selectFile(id, hash, terms, hlQuery) {
    const file = fileById(id);
    if (!file) return;
    if (terms !== undefined) {
      activeHighlight = terms || [];
      activeHighlightQuery = hlQuery || "";
    } else if (id !== currentFileId) {
      activeHighlight = [];
      activeHighlightQuery = "";
    }
    currentFileId = id;
    if (copyPageBtn) {
      copyPageBtn.disabled = false;
    }
    if (contentFrame) {
      contentFrame.src = contentUrl(file, hash);
    }
    renderFileList();
    renderToc(file);
    closeNavDrawer();
    closeTocPopover();
  }

  function jumpTo(hash) {
    const file = fileById(currentFileId);
    if (!file || !contentFrame) return;
    contentFrame.src = contentUrl(file, hash);
  }

  // Once the frame finishes loading, hand it keyboard focus so the very next
  // Ctrl+F targets the document itself instead of the shell page, and synchronize dark mode.
  contentFrame?.addEventListener("load", () => {
    try {
      contentFrame.contentWindow?.focus();
      const file = fileById(currentFileId);
      if ((!file || isHtmlPage(file)) && contentFrame.contentWindow) {
        contentFrame.contentWindow.postMessage(
          { type: "reader-set-dark", value: darkMode },
          "*",
        );
      }
    } catch (_e) {
      /* cross-origin or blocked — nothing we can do, ignore */
    }
  });

  // --- Clipboard-assisted search -------------------------------------------

  function legacyCopy(text) {
    try {
      const documentObj =
        doc || (typeof document !== "undefined" ? document : null);
      if (!documentObj) return false;
      const ta = documentObj.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      documentObj.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = documentObj.execCommand("copy");
      documentObj.body.removeChild(ta);
      return ok;
    } catch (_e) {
      return false;
    }
  }

  function getNavigator() {
    return (
      win?.navigator || (typeof navigator !== "undefined" ? navigator : null)
    );
  }

  function copyToClipboard(text) {
    const nav = getNavigator();
    if (nav?.clipboard?.writeText) {
      return nav.clipboard
        .writeText(text)
        .then(() => true)
        .catch(() => legacyCopy(text));
    }
    return Promise.resolve(legacyCopy(text));
  }

  function activateResult(id, terms, hlQuery) {
    selectFile(id, null, terms, hlQuery);
    searchResults?.classList.remove("open");
    if (searchInput) searchInput.value = "";
    const parsedCopy = hlQuery ? parseSearchQuery(hlQuery).copyText : "";
    const queryToCopy =
      parsedCopy || (terms && terms.length > 0 ? terms.join(" ") : "");
    if (queryToCopy) {
      copyToClipboard(queryToCopy).then(() => {
        const nav = getNavigator();
        const isMac = /mac/i.test(nav?.platform || "");
        const shortcut = isMac ? "⌘F" : "Ctrl+F";
        showToast(
          `Copied "<strong>${escapeHtml(queryToCopy)}</strong>" to clipboard — press <kbd>${shortcut}</kbd> to find in page`,
        );
      });
    }
  }

  // --- Search indexing (MiniSearch) ----------------------------------------

  const SEARCH_BOOST = {
    title: 5,
    filename: 3,
    relpath: 3,
    headings: 2,
    text: 1,
  };

  let miniSearch = null;

  function initMiniSearch(files) {
    if (typeof MiniSearch !== "undefined") {
      miniSearch = new MiniSearch({
        fields: ["title", "filename", "relpath", "headings", "text"],
        storeFields: ["id"],
        searchOptions: {
          boost: SEARCH_BOOST,
        },
        processTerm: (term) =>
          term
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase(),
      });
      miniSearch.addAll(
        (files || MANIFEST.files).map((f) => ({
          id: f.id,
          title: f.title || "",
          filename: filenameOf(f),
          relpath: f.relpath || "",
          headings: (f.headings || []).map((h) => h.text).join(" "),
          text: f.text || "",
        })),
      );
    }
  }

  initMiniSearch();

  // --- Search results list, keyboard-navigable -----------------------------

  function normalizeText(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function isWordChar(ch) {
    return Boolean(ch && /[\p{L}\p{N}]/u.test(ch));
  }

  function makePhraseRegex(phrase) {
    const tokens = normalizeText(phrase)
      .split(/[\s\p{P}]+/u)
      .filter(Boolean);
    if (tokens.length === 0) return null;
    const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return new RegExp(
      `(?<![\\p{L}\\p{N}])${escaped.join("[\\s\\p{P}]+")}(?![\\p{L}\\p{N}])`,
      "u",
    );
  }

  function hasExactPhrase(file, phrase) {
    if (!file || !phrase) return false;
    const re = makePhraseRegex(phrase);
    if (!re) return false;
    if (file.title && re.test(normalizeText(file.title))) return true;
    if (file.relpath && re.test(normalizeText(file.relpath))) return true;
    if (file.headings?.some((h) => h.text && re.test(normalizeText(h.text)))) {
      return true;
    }
    if (file.text && re.test(normalizeText(file.text))) return true;
    return false;
  }

  function scorePhraseMatch(file, phrase) {
    if (!file || !phrase) return 0;
    const re = makePhraseRegex(phrase);
    if (!re) return 0;
    let boost = 0;
    if (file.title && re.test(normalizeText(file.title))) {
      boost += 100;
    }
    if (file.relpath && re.test(normalizeText(file.relpath))) {
      boost += 60;
    }
    if (file.headings?.some((h) => h.text && re.test(normalizeText(h.text)))) {
      boost += 50;
    }
    if (file.text && re.test(normalizeText(file.text))) {
      boost += 25;
    }
    return boost;
  }

  function findSingleTokenMatches(norm, token, termLabel, matches) {
    let pos = 0;
    while (true) {
      pos = norm.indexOf(token, pos);
      if (pos === -1) break;
      const atStart = pos === 0 || !isWordChar(norm[pos - 1]);
      const atEnd =
        pos + token.length >= norm.length ||
        !isWordChar(norm[pos + token.length]);
      if (atStart && atEnd) {
        matches.push({
          start: pos,
          end: pos + token.length,
          term: termLabel,
          isPhrase: false,
        });
        pos += token.length;
      } else {
        pos += 1;
      }
    }
  }

  function collectTermMatches(text, terms) {
    if (!text || !terms || terms.length === 0) return [];
    const norm = normalizeText(text);
    const matches = [];

    for (const term of terms) {
      if (!term) continue;
      const cleanTerm = normalizeText(term).trim();
      if (!cleanTerm) continue;

      if (/[\s\p{P}]/u.test(cleanTerm)) {
        const tokens = cleanTerm.split(/[\s\p{P}]+/u).filter(Boolean);
        if (tokens.length === 0) continue;
        if (tokens.length > 1) {
          const escaped = tokens.map((t) =>
            t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          );
          const re = new RegExp(
            `(?<![\\p{L}\\p{N}])${escaped.join("[\\s\\p{P}]+")}(?![\\p{L}\\p{N}])`,
            "gu",
          );
          let m = re.exec(norm);
          while (m !== null) {
            matches.push({
              start: m.index,
              end: m.index + m[0].length,
              term: cleanTerm,
              isPhrase: true,
            });
            m = re.exec(norm);
          }
        } else {
          findSingleTokenMatches(norm, tokens[0], cleanTerm, matches);
        }
      } else {
        findSingleTokenMatches(norm, cleanTerm, cleanTerm, matches);
      }
    }
    return matches;
  }

  function findWordRanges(text, terms) {
    return collectTermMatches(text, terms).map((m) => [m.start, m.end]);
  }

  function highlightTerms(text, terms) {
    if (!text) return "";
    const ranges = findWordRanges(text, terms);
    if (ranges.length === 0) return escapeHtml(text);

    ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);

    const merged = [];
    let curr = ranges[0];
    for (let i = 1; i < ranges.length; i++) {
      const next = ranges[i];
      if (next[0] <= curr[1]) {
        curr[1] = Math.max(curr[1], next[1]);
      } else {
        merged.push(curr);
        curr = next;
      }
    }
    merged.push(curr);

    let out = "";
    let lastIdx = 0;
    for (const [start, end] of merged) {
      if (start > lastIdx) {
        out += escapeHtml(text.slice(lastIdx, start));
      }
      out += `<mark>${escapeHtml(text.slice(start, end))}</mark>`;
      lastIdx = end;
    }
    if (lastIdx < text.length) {
      out += escapeHtml(text.slice(lastIdx));
    }
    return out;
  }

  const MAX_SNIPPET_WINDOWS = 25;

  function clipWindowAtWordBoundary(text, start, end, hasPrefix) {
    let s = start;
    let e = Math.min(text.length, end);
    let prefix = "";
    let suffix = "";

    if (hasPrefix && s > 0) {
      const spaceBefore = text.lastIndexOf(" ", s);
      if (spaceBefore !== -1 && s - spaceBefore <= 20) {
        s = spaceBefore + 1;
      } else {
        const spaceAfter = text.indexOf(" ", s);
        if (spaceAfter !== -1 && spaceAfter - s <= 20) {
          s = spaceAfter + 1;
        }
      }
      prefix = "…";
    }

    if (e < text.length) {
      const spaceBefore = text.lastIndexOf(" ", e);
      if (spaceBefore !== -1 && spaceBefore > s) {
        e = spaceBefore;
      }
      suffix = "…";
    }

    return {
      snippet: prefix + text.slice(s, e).trim() + suffix,
      start: s,
      end: e,
    };
  }

  function clipAtWordBoundary(text, start, end, hasPrefix) {
    return clipWindowAtWordBoundary(text, start, end, hasPrefix).snippet;
  }

  function extractSnippetWindows(
    file,
    terms,
    maxLength = 160,
    maxWindows = MAX_SNIPPET_WINDOWS,
  ) {
    const text = file.text || "";
    if (!text.trim()) {
      if (file.headings && file.headings.length > 0) {
        return [
          file.headings
            .map((h) => h.text)
            .slice(0, 3)
            .join(" • "),
        ];
      }
      return [file.title || ""];
    }

    const matches = collectTermMatches(text, terms);

    // Title/heading match or no body matches -> start of document text
    if (matches.length === 0) {
      return [clipAtWordBoundary(text, 0, maxLength, false)];
    }

    matches.sort((a, b) => a.start - b.start || b.end - a.end);

    // Score each match window by term diversity, hit count, and phrase presence
    const scored = [];
    for (let i = 0; i < matches.length; i++) {
      const winStart = matches[i].start;
      const winEnd = winStart + maxLength;
      const coveredTerms = new Set();
      let count = 0;
      let hasPhrase = false;
      for (let j = i; j < matches.length && matches[j].start < winEnd; j++) {
        coveredTerms.add(matches[j].term);
        count++;
        if (matches[j].isPhrase) hasPhrase = true;
      }
      const score = coveredTerms.size * 100 + count + (hasPhrase ? 500 : 0);
      scored.push({ idx: i, score });
    }

    scored.sort((a, b) => b.score - a.score || a.idx - b.idx);

    const windows = [];
    const seenSnippets = new Set();
    const coveredRanges = [];
    const isCovered = (m) =>
      coveredRanges.some(([rs, re]) => m.start >= rs && m.end <= re);

    for (const candidate of scored) {
      if (windows.length >= maxWindows) break;
      const targetMatch = matches[candidate.idx];
      if (isCovered(targetMatch)) continue;

      const targetStart = Math.max(0, targetMatch.start - 35);
      const clipped = clipWindowAtWordBoundary(
        text,
        targetStart,
        targetStart + maxLength,
        targetStart > 0,
      );
      coveredRanges.push([
        Math.min(clipped.start, targetMatch.start),
        Math.max(clipped.end, targetMatch.end),
      ]);

      if (!seenSnippets.has(clipped.snippet)) {
        seenSnippets.add(clipped.snippet);
        windows.push(clipped.snippet);
      }
    }

    return windows.length > 0
      ? windows
      : [clipAtWordBoundary(text, 0, maxLength, false)];
  }

  function extractSnippet(file, terms, maxLength = 160) {
    return extractSnippetWindows(file, terms, maxLength, 1)[0];
  }

  function resultButtons() {
    return Array.from(searchResults?.querySelectorAll(".search-result") || []);
  }

  function focusResult(index) {
    const buttons = resultButtons();
    if (!buttons.length) return;
    const clamped = Math.max(0, Math.min(index, buttons.length - 1));
    buttons[clamped].focus();
  }

  function closeResults() {
    searchResults?.classList.remove("open");
  }

  function parseSearchQuery(rawQuery) {
    const query = (rawQuery || "").replace(/[\u201c\u201d]/g, '"').trim();
    if (!query) {
      return {
        query: "",
        exactPhrases: [],
        unquotedTokens: [],
        allTerms: [],
        contiguousPhrases: [],
        copyText: "",
      };
    }

    const exactPhrases = [];
    const phraseRegex = /"([^"]+)"/g;
    let remaining = query.replace(phraseRegex, (_match, p1) => {
      const phrase = p1.trim();
      if (phrase) {
        exactPhrases.push(phrase);
      }
      return " ";
    });

    const unclosedMatch = remaining.match(/"([^"]+)$/);
    if (unclosedMatch?.[1].trim()) {
      exactPhrases.push(unclosedMatch[1].trim());
      remaining = remaining.slice(0, unclosedMatch.index);
    }

    const unquotedTokens = remaining
      .split(/[\s\p{P}]+/u)
      .map((t) => t.trim())
      .filter(Boolean);

    const phraseTokens = [];
    for (const ph of exactPhrases) {
      const tokens = ph
        .split(/[\s\p{P}]+/u)
        .map((t) => t.trim())
        .filter(Boolean);
      phraseTokens.push(...tokens);
    }

    const allTerms = Array.from(new Set([...unquotedTokens, ...phraseTokens]));

    const contiguousPhrases = [...exactPhrases];
    if (contiguousPhrases.length === 0 && unquotedTokens.length > 1) {
      contiguousPhrases.push(unquotedTokens.join(" "));
    }

    const copyText =
      exactPhrases.length > 0
        ? exactPhrases[0]
        : query.replace(/"/g, "").trim();

    return {
      query,
      exactPhrases,
      unquotedTokens,
      allTerms,
      contiguousPhrases,
      copyText,
    };
  }

  function searchDocuments(rawQuery) {
    const query = (rawQuery || "").trim();
    if (!query) return [];

    const parsed = parseSearchQuery(query);
    if (parsed.allTerms.length === 0) return [];

    let hits = [];
    if (miniSearch) {
      const searchOptions = {
        boost: SEARCH_BOOST,
        prefix: (_term, index, terms) => index === terms.length - 1,
        combineWith: "AND",
      };
      hits = miniSearch.search(parsed.allTerms.join(" "), searchOptions);

      if (parsed.exactPhrases.length > 0) {
        hits = hits.filter((h) => {
          const file = fileById(h.id);
          return parsed.exactPhrases.every((phrase) =>
            hasExactPhrase(file, phrase),
          );
        });
      }
    } else {
      for (const f of MANIFEST.files) {
        const titleNorm = normalizeText(f.title);
        const relpathNorm = normalizeText(f.relpath);
        const textNorm = normalizeText(f.text);
        const headingsNorm = (f.headings || [])
          .map((h) => normalizeText(h.text))
          .join(" ");
        const allDocNorm = `${titleNorm} ${relpathNorm} ${headingsNorm} ${textNorm}`;

        const allMatched = parsed.allTerms.every((term) => {
          const re = makePhraseRegex(term);
          return re ? re.test(allDocNorm) : false;
        });

        if (!allMatched) continue;

        if (parsed.exactPhrases.length > 0) {
          const exactMatched = parsed.exactPhrases.every((phrase) =>
            hasExactPhrase(f, phrase),
          );
          if (!exactMatched) continue;
        }

        let score = 1;
        for (const term of parsed.allTerms) {
          const re = makePhraseRegex(term);
          if (re?.test(titleNorm)) score += 5;
          else if (re?.test(relpathNorm)) score += 3;
          else if (re?.test(headingsNorm)) score += 2;
        }

        hits.push({ id: f.id, score, terms: parsed.allTerms });
      }
    }

    if (parsed.contiguousPhrases.length > 0) {
      for (const hit of hits) {
        const file = fileById(hit.id);
        if (!file) continue;
        for (const phrase of parsed.contiguousPhrases) {
          hit.score += scorePhraseMatch(file, phrase);
        }
      }
    }

    hits.sort((a, b) => b.score - a.score);
    return hits;
  }

  function buildMatchTerms(parsed, hit) {
    if (parsed.exactPhrases.length === 0) {
      return [
        ...parsed.contiguousPhrases,
        ...Array.from(new Set([...parsed.allTerms, ...(hit?.terms || [])])),
      ];
    }

    const unquotedNorms = parsed.unquotedTokens
      .map(normalizeText)
      .filter(Boolean);
    const seenNorms = new Set(unquotedNorms);
    const matchedUnquoted = [];
    if (unquotedNorms.length > 0 && hit?.terms) {
      const lastUnquoted = unquotedNorms[unquotedNorms.length - 1];
      const lastAllNorm = normalizeText(
        parsed.allTerms[parsed.allTerms.length - 1],
      );
      if (lastUnquoted && lastAllNorm === lastUnquoted) {
        for (const term of hit.terms) {
          const norm = normalizeText(term);
          if (seenNorms.has(norm)) continue;
          if (norm.startsWith(lastUnquoted)) {
            seenNorms.add(norm);
            matchedUnquoted.push(term);
          }
        }
      }
    }

    return Array.from(
      new Set([
        ...parsed.exactPhrases,
        ...parsed.unquotedTokens,
        ...matchedUnquoted,
      ]),
    );
  }

  function runSearch(rawQuery) {
    const query = rawQuery.trim();
    lastQuery = query;
    if (!query) {
      closeResults();
      if (searchResults) searchResults.innerHTML = "";
      return;
    }

    const parsed = parseSearchQuery(query);
    if (parsed.allTerms.length === 0) {
      closeResults();
      if (searchResults) searchResults.innerHTML = "";
      return;
    }

    const hits = searchDocuments(query);
    const top = hits.slice(0, 20);

    if (!searchResults) return;

    if (top.length === 0) {
      const emptyMsg =
        parsed.allTerms.length > 1 || parsed.exactPhrases.length > 0
          ? "No documents contain all terms"
          : "No matches";
      searchResults.innerHTML = `<div class="search-empty">${escapeHtml(emptyMsg)}</div>`;
    } else {
      const resultEntries = [];
      searchResults.innerHTML = top
        .map((r) => {
          const file = fileById(r.id);
          if (!file) return "";
          const matchTerms = buildMatchTerms(parsed, r);
          const windows = extractSnippetWindows(file, matchTerms);
          resultEntries.push({ windows, matchTerms });
          const pagerHtml =
            windows.length > 1
              ? `<span class="sr-pager">` +
                `<button type="button" class="sr-nav-btn sr-prev" tabindex="-1" aria-label="Previous match preview" title="Previous match (←)">&#8249;</button>` +
                `<span class="sr-count">1 / ${windows.length}</span>` +
                `<button type="button" class="sr-nav-btn sr-next" tabindex="-1" aria-label="Next match preview" title="Next match (→)">&#8250;</button>` +
                `</span>`
              : "";
          const pathHtml = file.relpath
            ? `<span class="sr-path">${highlightTerms(file.relpath, matchTerms)}</span>`
            : "";
          return `
        <div class="search-result" role="option" tabindex="0" data-id="${file.id}" data-terms="${escapeHtml(JSON.stringify(matchTerms))}" data-hl="${escapeHtml(query)}">
          <span class="sr-title"><span class="sr-title-main"><span class="type-icon">${iconFor(file.type)}</span><span class="sr-title-text">${highlightTerms(file.title, matchTerms)}</span></span>${pagerHtml}</span>
          ${pathHtml}
          <span class="sr-snippet">${highlightTerms(windows[0], matchTerms)}</span>
        </div>
      `;
        })
        .join("");

      const buttons = resultButtons();
      buttons.forEach((btn, index) => {
        const entry = resultEntries[index] || { windows: [], matchTerms: [] };
        let previewIdx = 0;

        function openResult() {
          let terms = [];
          try {
            terms = JSON.parse(btn.dataset.terms || "[]");
          } catch (_e) {
            terms = [];
          }
          activateResult(btn.dataset.id, terms, btn.dataset.hl);
        }

        function stepPreview(delta) {
          const total = entry.windows.length;
          if (total <= 1) return;
          previewIdx = (previewIdx + delta + total) % total;
          const snippetEl = btn.querySelector(".sr-snippet");
          const countEl = btn.querySelector(".sr-count");
          if (snippetEl) {
            snippetEl.innerHTML = highlightTerms(
              entry.windows[previewIdx],
              entry.matchTerms,
            );
          }
          if (countEl) {
            countEl.textContent = `${previewIdx + 1} / ${total}`;
          }
        }

        const prevBtn = btn.querySelector(".sr-prev");
        const nextBtn = btn.querySelector(".sr-next");
        prevBtn?.addEventListener("mousedown", (e) => e.preventDefault());
        nextBtn?.addEventListener("mousedown", (e) => e.preventDefault());
        prevBtn?.addEventListener("click", (e) => {
          e.stopPropagation();
          stepPreview(-1);
        });
        nextBtn?.addEventListener("click", (e) => {
          e.stopPropagation();
          stepPreview(1);
        });

        btn.addEventListener("click", (e) => {
          if (e?.target?.closest?.(".sr-nav-btn")) return;
          openResult();
        });
        btn.addEventListener("keydown", (e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            focusResult(index + 1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (index === 0) {
              searchInput?.focus();
            } else {
              focusResult(index - 1);
            }
          } else if (e.key === "ArrowRight") {
            if (entry.windows.length > 1) {
              e.preventDefault();
              stepPreview(1);
            }
          } else if (e.key === "ArrowLeft") {
            if (entry.windows.length > 1) {
              e.preventDefault();
              stepPreview(-1);
            }
          } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openResult();
          } else if (e.key === "Escape") {
            closeResults();
            searchInput?.focus();
          }
        });
      });
    }
    searchResults.classList.add("open");
  }

  let debounceTimer = null;
  function debounce(fn, delay = 120) {
    return (...args) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fn(...args), delay);
    };
  }

  const debouncedSearch = debounce((val) => runSearch(val), 120);

  searchInput?.addEventListener("input", (e) => {
    debouncedSearch(e.target.value);
  });

  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      clearTimeout(debounceTimer);
      if (searchInput.value.trim() !== lastQuery) {
        runSearch(searchInput.value);
      }
      const first = searchResults?.querySelector(".search-result");
      if (first) {
        e.preventDefault();
        first.click();
      }
      return;
    }
    if (!searchResults?.classList.contains("open")) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusResult(0);
    } else if (e.key === "Escape") {
      closeResults();
    }
  });

  function bindResponsiveListeners() {
    navToggleBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleNavDrawer();
    });
    drawerBackdrop?.addEventListener("click", () => {
      closeNavDrawer();
    });
    tocToggleBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleTocPopover();
    });
    doc?.addEventListener("click", (e) => {
      if (!e.target?.closest?.(".search-wrap")) closeResults();
      if (!e.target?.closest?.(".toc-dropdown-wrap")) closeTocPopover();
    });
    doc?.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeNavDrawer();
        closeTocPopover();
      }
    });
  }

  bindResponsiveListeners();

  // --- Dark mode -------------------------------------------------------------

  function updateDarkToggleUI() {
    if (!darkToggle) return;
    darkToggle.innerHTML = darkMode
      ? `${ICONS.sun}<span>Light</span>`
      : `${ICONS.moon}<span>Dark</span>`;
  }

  darkToggle?.addEventListener("click", () => {
    darkMode = !darkMode;
    doc?.documentElement.classList.toggle("reader-dark", darkMode);
    updateDarkToggleUI();
    try {
      localStorage.setItem("docs-site-dark", darkMode ? "1" : "0");
    } catch (_e) {
      /* ignore */
    }

    const file = fileById(currentFileId);
    if ((!file || isHtmlPage(file)) && contentFrame?.contentWindow) {
      try {
        contentFrame.contentWindow.postMessage(
          { type: "reader-set-dark", value: darkMode },
          "*",
        );
      } catch (_e) {
        /* ignore */
      }
    }
  });

  (function initDark() {
    let saved = null;
    try {
      saved = localStorage.getItem("docs-site-dark");
    } catch (_e) {
      /* ignore */
    }
    if (saved === "1") {
      darkMode = true;
      doc?.documentElement.classList.add("reader-dark");
      updateDarkToggleUI();
      if (
        !currentFileId &&
        contentFrame?.src &&
        !contentFrame.src.includes("?dark=1")
      ) {
        contentFrame.src += "?dark=1";
      }
    }
  })();

  copyPageBtn?.addEventListener("click", () => {
    const file = fileById(currentFileId);
    if (!file) {
      showToast("No page selected to copy");
      return;
    }
    const title = file.title || file.relpath;
    copyToClipboard(file.text || "").then(() => {
      showToast(`Copied <strong>${escapeHtml(title)}</strong> as Markdown`);
    });
  });

  if (leftPanel) renderFileList();

  function _setEnv(d, w) {
    clearTimeout(toastTimer);
    doc = d;
    win = w;
    contentFrame = doc?.getElementById("content-frame") || null;
    leftPanel = doc?.getElementById("left-panel") || null;
    drawerBackdrop = doc?.getElementById("drawer-backdrop") || null;
    navToggleBtn = doc?.getElementById("nav-toggle-btn") || null;
    tocBody = doc?.getElementById("toc-body") || null;
    tocToggleBtn = doc?.getElementById("toc-toggle-btn") || null;
    tocPopover = doc?.getElementById("toc-popover") || null;
    tocPopoverBody = doc?.getElementById("toc-popover-body") || null;
    searchInput = doc?.getElementById("search-input") || null;
    searchResults = doc?.getElementById("search-results") || null;
    darkToggle = doc?.getElementById("dark-toggle") || null;
    copyPageBtn = doc?.getElementById("copy-page-btn") || null;
    copyToast = doc?.getElementById("copy-toast") || null;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      isWordChar,
      normalizeText,
      makePhraseRegex,
      parseSearchQuery,
      findWordRanges,
      highlightTerms,
      extractSnippet,
      extractSnippetWindows,
      searchDocuments,
      runSearch,
      hasExactPhrase,
      scorePhraseMatch,
      initMiniSearch,
      renderFileList,
      renderToc,
      selectFile,
      toggleNavDrawer,
      closeNavDrawer,
      toggleTocPopover,
      closeTocPopover,
      bindResponsiveListeners,
      setManifest: (m) => {
        MANIFEST.files = m.files || [];
      },
      fileById,
      activateResult,
      copyToClipboard,
      _setEnv,
    };
  }
})();
