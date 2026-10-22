(() => {
  const doc = typeof document !== "undefined" ? document : null;
  const win = typeof window !== "undefined" ? window : null;

  let params = null;
  if (win?.location) {
    try {
      params = new URLSearchParams(win.location.search);
      if (params.get("dark") === "1" && doc) {
        doc.documentElement.classList.add("reader-dark");
      }
    } catch (_e) {
      /* URLSearchParams unsupported — ignore */
    }
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
    if (!text || !cleanTerms || cleanTerms.length === 0) return [];
    const { norm, map } = normalizeWithMap(text);
    if (!norm || map.length === 0) return [];

    const ranges = [];
    for (const term of cleanTerms) {
      if (!term) continue;
      const cleanTerm = term
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
      if (!cleanTerm) continue;

      if (/\s/.test(cleanTerm)) {
        const tokens = cleanTerm.split(/\s+/).filter(Boolean);
        const escaped = tokens.map((t) =>
          t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        );
        const re = new RegExp(
          `(?<![\\p{L}\\p{N}])${escaped.join("\\s+")}(?![\\p{L}\\p{N}])`,
          "gu",
        );
        let m = re.exec(norm);
        while (m !== null) {
          const normStart = m.index;
          const normEnd = m.index + m[0].length;
          const origStart = map[normStart];
          const origEnd = map[normEnd - 1] + 1;
          ranges.push([origStart, origEnd]);
          m = re.exec(norm);
        }
      } else {
        let pos = 0;
        while (true) {
          pos = norm.indexOf(cleanTerm, pos);
          if (pos === -1) break;
          const atStart = pos === 0 || !isWordChar(norm[pos - 1]);
          const atEnd =
            pos + cleanTerm.length >= norm.length ||
            !isWordChar(norm[pos + cleanTerm.length]);
          if (atStart && atEnd) {
            const normStart = pos;
            const normEnd = pos + cleanTerm.length;
            const origStart = map[normStart];
            const origEnd = map[normEnd - 1] + 1;
            ranges.push([origStart, origEnd]);
            pos += cleanTerm.length;
          } else {
            pos += 1;
          }
        }
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
    if (!doc) return;
    const hits = doc.querySelectorAll("mark.search-hit");
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

  function parseHighlightQuery(input) {
    if (!input) return { phrases: [], tokens: [], exactOnly: false };

    let rawStr = "";
    if (Array.isArray(input)) {
      const hasPhrases = input.some((item) => /\s/.test(item.trim()));
      if (hasPhrases) {
        const phrases = [];
        const tokens = [];
        for (const item of input) {
          const trimmed = item.trim();
          if (!trimmed) continue;
          if (/\s/.test(trimmed)) {
            phrases.push(trimmed);
            tokens.push(...trimmed.split(/\s+/).filter(Boolean));
          } else {
            tokens.push(trimmed);
          }
        }
        return {
          phrases: Array.from(new Set(phrases)),
          tokens: Array.from(new Set(tokens)),
          exactOnly: false,
        };
      }
      rawStr = input.join(" ");
    } else {
      rawStr = String(input);
    }

    const trimmed = rawStr.trim();
    if (!trimmed) return { phrases: [], tokens: [], exactOnly: false };

    const exactPhrases = [];
    const phraseRegex = /"([^"]+)"|'([^']+)'/g;
    let remaining = trimmed.replace(phraseRegex, (_match, p1, p2) => {
      const phrase = (p1 || p2).trim();
      if (phrase) exactPhrases.push(phrase);
      return " ";
    });

    const unclosedMatch = remaining.match(/["']([^"']+)$/);
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
      const t = ph
        .split(/[\s\p{P}]+/u)
        .map((x) => x.trim())
        .filter(Boolean);
      phraseTokens.push(...t);
    }

    const allTokens = Array.from(new Set([...unquotedTokens, ...phraseTokens]));

    if (exactPhrases.length > 0) {
      return {
        phrases: exactPhrases,
        tokens: allTokens,
        exactOnly: unquotedTokens.length === 0,
      };
    }

    const phrases = unquotedTokens.length > 1 ? [unquotedTokens.join(" ")] : [];
    return {
      phrases,
      tokens: allTokens,
      exactOnly: false,
    };
  }

  function highlightMatches(input) {
    if (!doc) return;
    clearHighlights();
    const { phrases, tokens, exactOnly } = parseHighlightQuery(input);
    if (phrases.length === 0 && tokens.length === 0) return;

    const MAX_MARKS = 300;
    let totalMarks = 0;
    const markElements = [];

    function collectTextNodes() {
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
          if (!node.nodeValue?.trim()) return NodeFilter.FILTER_SKIP;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const nodes = [];
      let curr = walker.nextNode();
      while (curr) {
        nodes.push(curr);
        curr = walker.nextNode();
      }
      return nodes;
    }

    function applyMatchesToNodes(nodes, searchTerms) {
      for (const node of nodes) {
        if (totalMarks >= MAX_MARKS) break;
        if (!node.parentNode || shouldSkipNode(node)) continue;
        const text = node.nodeValue;
        const matches = findMatchesInText(text, searchTerms);
        if (matches.length === 0) continue;

        const nodeMarks = [];
        for (let i = matches.length - 1; i >= 0; i--) {
          if (totalMarks >= MAX_MARKS) break;
          const [start, end] = matches[i];
          if (start >= end) continue;

          const _afterMatch = node.splitText(end);
          const matchNode = node.splitText(start);

          const mark = doc.createElement("mark");
          mark.className = "search-hit";
          matchNode.parentNode.replaceChild(mark, matchNode);
          mark.appendChild(matchNode);

          nodeMarks.unshift(mark);
          totalMarks++;
        }
        markElements.push(...nodeMarks);
      }
    }

    // Pass 1: Phrase-first highlighting
    if (phrases.length > 0) {
      const nodes = collectTextNodes();
      applyMatchesToNodes(nodes, phrases);
    }

    // Pass 2: Token highlighting for non-exact searches if marks budget remains
    if (!exactOnly && tokens.length > 0 && totalMarks < MAX_MARKS) {
      const nodes = collectTextNodes();
      applyMatchesToNodes(nodes, tokens);
    }

    if (markElements.length > 0) {
      const first = markElements[0];
      first.classList.add("search-hit-active");
      const prefersReducedMotion =
        win?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
      first.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "center",
      });
    }
  }

  if (params) {
    const hlParam = params.get("hl");
    if (hlParam) {
      highlightMatches(hlParam);
    }
  }

  doc?.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      clearHighlights();
    }
  });

  win?.addEventListener("message", (ev) => {
    if (ev.source !== win?.parent) return;
    const d = ev?.data;
    if (d && d.type === "reader-set-dark" && doc) {
      doc.documentElement.classList.toggle("reader-dark", !!d.value);
    } else if (d && d.type === "clear-highlights") {
      clearHighlights();
    }
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      isWordChar,
      normalizeWithMap,
      findMatchesInText,
      highlightMatches,
      parseHighlightQuery,
      clearHighlights,
    };
  }
})();
