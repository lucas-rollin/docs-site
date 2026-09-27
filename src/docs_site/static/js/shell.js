(() => {
  const MANIFEST = window.DOCS_MANIFEST || { files: [] };

  const contentFrame = document.getElementById("content-frame");
  const leftPanel = document.getElementById("left-panel");
  const tocBody = document.getElementById("toc-body");
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");
  const darkToggle = document.getElementById("dark-toggle");

  let currentFileId = null;
  let darkMode = false;
  let lastQuery = "";

  function fileById(id) {
    return MANIFEST.files.find((f) => f.id === id);
  }

  function iconFor(type) {
    return type === "pdf" ? "📕" : "📄";
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

  function contentUrl(file, hash) {
    let url = file.src;
    if (file.type === "html" && darkMode) url += "?dark=1";
    if (hash) url += hash;
    return url;
  }

  function selectFile(id, hash) {
    const file = fileById(id);
    if (!file) return;
    currentFileId = id;
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
  // Ctrl+F targets the document itself instead of the shell page.
  contentFrame.addEventListener("load", () => {
    try {
      contentFrame.contentWindow?.focus();
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

  // --- Search results list, keyboard-navigable -----------------------------

  function highlight(text, query) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(text);
    return (
      escapeHtml(text.slice(0, idx)) +
      "<mark>" +
      escapeHtml(text.slice(idx, idx + query.length)) +
      "</mark>" +
      escapeHtml(text.slice(idx + query.length))
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
    const q = query.toLowerCase();
    const scored = [];
    for (const f of MANIFEST.files) {
      const titleHit = f.title.toLowerCase().includes(q);
      const textLower = f.text.toLowerCase();
      let count = 0;
      let pos = 0;
      while (true) {
        pos = textLower.indexOf(q, pos);
        if (pos === -1) break;

        count++;
        pos += q.length;
      }
      if (!titleHit && count === 0) continue;
      const idx = textLower.indexOf(q);
      const start = Math.max(0, idx - 50);
      const snippet =
        idx === -1 ? f.text.slice(0, 140) : f.text.slice(start, start + 160);
      scored.push({ file: f, score: count + (titleHit ? 5 : 0), snippet });
    }
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 20);

    if (top.length === 0) {
      searchResults.innerHTML = '<div class="search-empty">No matches</div>';
    } else {
      searchResults.innerHTML = top
        .map(
          (r) => `
        <button type="button" class="search-result" data-id="${r.file.id}">
          <span class="sr-title">${iconFor(r.file.type)} ${escapeHtml(r.file.title)}</span>
          <span class="sr-snippet">${highlight(r.snippet, query)}</span>
        </button>
      `,
        )
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

  searchInput.addEventListener("input", (e) => runSearch(e.target.value));

  searchInput.addEventListener("keydown", (e) => {
    if (!searchResults.classList.contains("open")) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusResult(0);
    } else if (e.key === "Escape") {
      closeResults();
    } else if (e.key === "Enter") {
      const first = searchResults.querySelector(".search-result");
      if (first) {
        e.preventDefault();
        first.click();
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) closeResults();
  });

  // --- Dark mode -------------------------------------------------------------

  darkToggle.addEventListener("click", () => {
    darkMode = !darkMode;
    document.documentElement.classList.toggle("reader-dark", darkMode);
    darkToggle.textContent = darkMode ? "☀️ Light" : "🌙 Dark";
    try {
      localStorage.setItem("docs-site-dark", darkMode ? "1" : "0");
    } catch (_e) {
      /* ignore */
    }

    const file = fileById(currentFileId);
    if (file && file.type === "html" && contentFrame.contentWindow) {
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
      darkToggle.textContent = "☀️ Light";
    }
  })();

  renderFileList();
})();
