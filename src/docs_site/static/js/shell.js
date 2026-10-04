(() => {
  const MANIFEST = window.DOCS_MANIFEST || { files: [] };

  const contentFrame = document.getElementById("content-frame");
  const leftPanel = document.getElementById("left-panel");
  const tocBody = document.getElementById("toc-body");
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");
  const darkToggle = document.getElementById("dark-toggle");
  const copyPageBtn = document.getElementById("copy-page-btn");
  const copyToast = document.getElementById("copy-toast");

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
      copyToast.classList.remove("show");
    }, 2200);
  }

  function fileById(id) {
    return MANIFEST.files.find((f) => f.id === id);
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
    const groups = {};
    for (const f of MANIFEST.files) {
      const dir = f.relpath.includes("/")
        ? f.relpath.slice(0, f.relpath.lastIndexOf("/"))
        : "";
      file = groups[dir] = groups[dir] || [];
      file.push(f);
    }
    const dirs = Object.keys(groups).sort();
    let html = "";
    for (const dir of dirs) {
      html += `<div class="panel-heading">${dir ? escapeHtml(dir) : "Root"}</div><ul class="file-list">`;
      for (const f of groups[dir]) {
        html +=
          `<li class="file-item"><a href="#" data-id="${f.id}" class="${f.id === currentFileId ? "active" : ""}">` +
          `<span class="type-icon">${iconFor(f.type)}</span>${escapeHtml(f.title)}</a></li>`;
      }
      html += "</ul>";
    }
    leftPanel.innerHTML =
      html || '<div class="toc-empty">No HTML or PDF files found.</div>';
    leftPanel.querySelectorAll(".file-item a").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        selectFile(a.dataset.id);
      });
    });
  }

  // --- Table of contents (right sidebar) ----------------------------------

  function renderToc(file) {
    if (!file?.headings || file.headings.length === 0) {
      tocBody.className = "toc-empty";
      tocBody.textContent =
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
      html += `<li class="toc-item" style="--indent:${indent}px"><a href="#" data-target="${target}">${escapeHtml(h.text)}</a></li>`;
    }
    html += "</ul>";
    tocBody.className = "";
    tocBody.innerHTML = html;
    tocBody.querySelectorAll(".toc-item a").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        jumpTo(a.dataset.target);
      });
    });
  }

  // --- Content frame navigation --------------------------------------------

  function isHtmlPage(file) {
    return file && file.type !== "pdf";
  }

  function contentUrl(file, hash) {
    let url = file.src;
    if (isHtmlPage(file) && darkMode) url += "?dark=1";
    if (hash) url += hash;
    return url;
  }

  function selectFile(id, hash) {
    const file = fileById(id);
    if (!file) return;
    currentFileId = id;
    if (copyPageBtn) {
      copyPageBtn.disabled = false;
    }
    contentFrame.src = contentUrl(file, hash);
    renderFileList();
    renderToc(file);
  }

  function jumpTo(hash) {
    const file = fileById(currentFileId);
    if (!file) return;
    contentFrame.src = contentUrl(file, hash);
  }

  // Once the frame finishes loading, hand it keyboard focus so the very next
  // Ctrl+F targets the document itself instead of the shell page, and synchronize dark mode.
  contentFrame.addEventListener("load", () => {
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
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (_e) {
      return false;
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard
        .writeText(text)
        .then(() => true)
        .catch(() => legacyCopy(text));
    }
    return Promise.resolve(legacyCopy(text));
  }

  function activateResult(id) {
    const query = lastQuery;
    selectFile(id);
    searchResults.classList.remove("open");
    searchInput.value = "";
    if (query) {
      copyToClipboard(query);
    }
  }

  // --- Search indexing (MiniSearch) ----------------------------------------

  let miniSearch = null;
  if (typeof MiniSearch !== "undefined") {
    miniSearch = new MiniSearch({
      fields: ["title", "headings", "text"],
      storeFields: ["id"],
      searchOptions: {
        boost: { title: 5, headings: 2, text: 1 },
      },
      processTerm: (term) =>
        term
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase(),
    });
    miniSearch.addAll(
      MANIFEST.files.map((f) => ({
        id: f.id,
        title: f.title || "",
        headings: (f.headings || []).map((h) => h.text).join(" "),
        text: f.text || "",
      })),
    );
  }

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

  function findWordRanges(text, terms) {
    if (!text || !terms || terms.length === 0) return [];
    const norm = normalizeText(text);
    const ranges = [];

    for (const term of terms) {
      if (!term) continue;
      const cleanTerm = normalizeText(term).trim();
      if (!cleanTerm) continue;

      let pos = 0;
      while (true) {
        pos = norm.indexOf(cleanTerm, pos);
        if (pos === -1) break;
        const atWordStart = pos === 0 || !isWordChar(norm[pos - 1]);
        if (atWordStart) {
          ranges.push([pos, pos + cleanTerm.length]);
        }
        pos += cleanTerm.length;
      }
    }
    return ranges;
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

  function clipAtWordBoundary(text, start, end, hasPrefix) {
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

    return prefix + text.slice(s, e).trim() + suffix;
  }

  function extractSnippet(file, terms, maxLength = 160) {
    const text = file.text || "";
    if (!text.trim()) {
      if (file.headings && file.headings.length > 0) {
        return file.headings
          .map((h) => h.text)
          .slice(0, 3)
          .join(" • ");
      }
      return file.title || "";
    }

    const norm = normalizeText(text);
    const matches = [];

    for (const term of terms) {
      if (!term) continue;
      const cleanTerm = normalizeText(term).trim();
      if (!cleanTerm) continue;

      let pos = 0;
      while (true) {
        pos = norm.indexOf(cleanTerm, pos);
        if (pos === -1) break;
        const atWordStart = pos === 0 || !isWordChar(norm[pos - 1]);
        if (atWordStart) {
          matches.push({
            start: pos,
            end: pos + cleanTerm.length,
            term: cleanTerm,
          });
        }
        pos += cleanTerm.length;
      }
    }

    // Title/heading match or no body matches -> start of document text
    if (matches.length === 0) {
      return clipAtWordBoundary(text, 0, maxLength, false);
    }

    matches.sort((a, b) => a.start - b.start);

    // Best-occurrence selection: find window with highest term diversity & count
    let bestScore = -1;
    let bestMatchIdx = 0;

    for (let i = 0; i < matches.length; i++) {
      const winStart = matches[i].start;
      const winEnd = winStart + maxLength;
      const coveredTerms = new Set();
      let count = 0;
      for (let j = i; j < matches.length && matches[j].start < winEnd; j++) {
        coveredTerms.add(matches[j].term);
        count++;
      }
      const score = coveredTerms.size * 100 + count;
      if (score > bestScore) {
        bestScore = score;
        bestMatchIdx = i;
      }
    }

    const targetMatch = matches[bestMatchIdx];
    const targetStart = Math.max(0, targetMatch.start - 35);
    return clipAtWordBoundary(
      text,
      targetStart,
      targetStart + maxLength,
      targetStart > 0,
    );
  }

  function resultButtons() {
    return Array.from(searchResults.querySelectorAll(".search-result"));
  }

  function focusResult(index) {
    const buttons = resultButtons();
    if (!buttons.length) return;
    const clamped = Math.max(0, Math.min(index, buttons.length - 1));
    buttons[clamped].focus();
  }

  function closeResults() {
    searchResults.classList.remove("open");
  }

  function runSearch(rawQuery) {
    const query = rawQuery.trim();
    lastQuery = query;
    if (!query) {
      closeResults();
      searchResults.innerHTML = "";
      return;
    }

    const queryTokens = query.split(/[\s\p{P}]+/u).filter((t) => t.length > 0);

    let hits = [];
    if (miniSearch) {
      const searchOptions = {
        boost: { title: 5, headings: 2, text: 1 },
        prefix: (_term, index, terms) => index === terms.length - 1,
        combineWith: "AND",
      };
      hits = miniSearch.search(query, searchOptions);
      if (hits.length === 0) {
        hits = miniSearch.search(query, {
          ...searchOptions,
          combineWith: "OR",
        });
      }
    } else {
      const q = query.toLowerCase();
      for (const f of MANIFEST.files) {
        const titleHit = f.title.toLowerCase().includes(q);
        const textHit = f.text.toLowerCase().includes(q);
        if (titleHit || textHit) {
          hits.push({ id: f.id, score: titleHit ? 5 : 1, terms: [q] });
        }
      }
      hits.sort((a, b) => b.score - a.score);
    }

    const top = hits.slice(0, 20);

    if (top.length === 0) {
      searchResults.innerHTML = '<div class="search-empty">No matches</div>';
    } else {
      searchResults.innerHTML = top
        .map((r) => {
          const file = fileById(r.id);
          if (!file) return "";
          const matchTerms = Array.from(
            new Set([...queryTokens, ...(r.terms || [])]),
          );
          const snippet = extractSnippet(file, matchTerms);
          return `
        <button type="button" class="search-result" data-id="${file.id}">
          <span class="sr-title"><span class="type-icon">${iconFor(file.type)}</span>${highlightTerms(file.title, matchTerms)}</span>
          <span class="sr-snippet">${highlightTerms(snippet, matchTerms)}</span>
        </button>
      `;
        })
        .join("");

      const buttons = resultButtons();
      buttons.forEach((btn, index) => {
        btn.addEventListener("click", () => activateResult(btn.dataset.id));
        btn.addEventListener("keydown", (e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            focusResult(index + 1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (index === 0) {
              searchInput.focus();
            } else {
              focusResult(index - 1);
            }
          } else if (e.key === "Escape") {
            closeResults();
            searchInput.focus();
          }
          // Enter / Space fall through to the native <button> click.
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

  searchInput.addEventListener("input", (e) => {
    debouncedSearch(e.target.value);
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      clearTimeout(debounceTimer);
      if (searchInput.value.trim() !== lastQuery) {
        runSearch(searchInput.value);
      }
      const first = searchResults.querySelector(".search-result");
      if (first) {
        e.preventDefault();
        first.click();
      }
      return;
    }
    if (!searchResults.classList.contains("open")) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusResult(0);
    } else if (e.key === "Escape") {
      closeResults();
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) closeResults();
  });

  // --- Dark mode -------------------------------------------------------------

  function updateDarkToggleUI() {
    darkToggle.innerHTML = darkMode
      ? `${ICONS.sun}<span>Light</span>`
      : `${ICONS.moon}<span>Dark</span>`;
  }

  darkToggle.addEventListener("click", () => {
    darkMode = !darkMode;
    document.documentElement.classList.toggle("reader-dark", darkMode);
    updateDarkToggleUI();
    try {
      localStorage.setItem("docs-site-dark", darkMode ? "1" : "0");
    } catch (_e) {
      /* ignore */
    }

    const file = fileById(currentFileId);
    if ((!file || isHtmlPage(file)) && contentFrame.contentWindow) {
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
      document.documentElement.classList.add("reader-dark");
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

  if (copyPageBtn) {
    copyPageBtn.addEventListener("click", () => {
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
  }

  renderFileList();
})();
