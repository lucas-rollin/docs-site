(() => {
  let params = null;
  try {
    params = new URLSearchParams(location.search);
    if (params.get("dark") === "1") {
      document.documentElement.classList.add("reader-dark");
    }
  } catch (_e) {
    /* URLSearchParams unsupported — ignore */
  }

  // --- In-page search hit highlighting & auto-scroll ------------------------

  function isWordChar(ch) {
    return Boolean(ch && /[\p{L}\p{N}]/u.test(ch));
  }

  function normalizeWithMap(text) {
    let norm = "";
    const map = [];
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const decomposed = char
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      for (let j = 0; j < decomposed.length; j++) {
        norm += decomposed[j];
        map.push(i);
      }
    }
    return { norm, map };
  }

  function findMatchesInText(text, cleanTerms) {
    if (!text || cleanTerms.length === 0) return [];
    const { norm, map } = normalizeWithMap(text);
    if (!norm || map.length === 0) return [];

    const ranges = [];
    for (const term of cleanTerms) {
      let pos = 0;
      while (true) {
        pos = norm.indexOf(term, pos);
        if (pos === -1) break;
        const atWordStart = pos === 0 || !isWordChar(norm[pos - 1]);
        if (atWordStart) {
          const normStart = pos;
          const normEnd = pos + term.length;
          const origStart = map[normStart];
          const origEnd = map[normEnd - 1] + 1;
          ranges.push([origStart, origEnd]);
        }
        pos += term.length;
      }
    }

    if (ranges.length === 0) return [];

    ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    const merged = [ranges[0]];
    for (let i = 1; i < ranges.length; i++) {
      const prev = merged[merged.length - 1];
      const curr = ranges[i];
      if (curr[0] <= prev[1]) {
        prev[1] = Math.max(prev[1], curr[1]);
      } else {
        merged.push(curr);
      }
    }
    return merged;
  }

  function clearHighlights() {
    const hits = document.querySelectorAll("mark.search-hit");
    for (const hit of hits) {
      const parent = hit.parentNode;
      if (!parent) continue;
      while (hit.firstChild) {
        parent.insertBefore(hit.firstChild, hit);
      }
      parent.removeChild(hit);
      parent.normalize();
    }
  }

  function shouldSkipNode(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    const tag = parent.tagName.toUpperCase();
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return true;
    if (parent.closest(".search-hit")) return true;
    return false;
  }

  function highlightMatches(terms) {
    clearHighlights();
    if (!terms || terms.length === 0) return;

    const cleanTerms = terms
      .map((t) =>
        t
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim(),
      )
      .filter(Boolean);

    if (cleanTerms.length === 0) return;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
          if (!node.nodeValue?.trim()) return NodeFilter.FILTER_SKIP;
          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );

    const textNodes = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
      textNodes.push(currentNode);
      currentNode = walker.nextNode();
    }

    const MAX_MARKS = 300;
    let totalMarks = 0;
    const markElements = [];

    for (const node of textNodes) {
      if (totalMarks >= MAX_MARKS) break;
      const text = node.nodeValue;
      const matches = findMatchesInText(text, cleanTerms);
      if (matches.length === 0) continue;

      for (let i = matches.length - 1; i >= 0; i--) {
        if (totalMarks >= MAX_MARKS) break;
        const [start, end] = matches[i];
        if (start >= end) continue;

        const _afterMatch = node.splitText(end);
        const matchNode = node.splitText(start);

        const mark = document.createElement("mark");
        mark.className = "search-hit";
        matchNode.parentNode.replaceChild(mark, matchNode);
        mark.appendChild(matchNode);

        markElements.unshift(mark);
        totalMarks++;
      }
    }

    if (markElements.length > 0) {
      const first = markElements[0];
      first.classList.add("search-hit-active");
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      first.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "center",
      });
    }
  }

  if (params) {
    const hlParam = params.get("hl");
    if (hlParam) {
      const terms = hlParam
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean);
      highlightMatches(terms);
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      clearHighlights();
    }
  });

  window.addEventListener("message", (ev) => {
    if (ev.source !== window.parent) return;
    const d = ev?.data;
    if (d && d.type === "reader-set-dark") {
      document.documentElement.classList.toggle("reader-dark", !!d.value);
    } else if (d && d.type === "clear-highlights") {
      clearHighlights();
    }
  });
})();
