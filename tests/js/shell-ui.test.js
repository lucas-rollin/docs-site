const test = require("node:test");
const assert = require("node:assert");
const { loadShell } = require("./helpers");

const shell = loadShell();

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

  assert.ok(
    leftPanel.innerHTML.includes(
      '<span class="file-title">Getting Started</span>',
    ),
  );
  assert.ok(
    leftPanel.innerHTML.includes(
      '<span class="file-filename">getting-started.md</span>',
    ),
  );
  assert.ok(
    leftPanel.innerHTML.includes('<span class="file-title">README</span>'),
  );
  assert.ok(
    !leftPanel.innerHTML.includes(
      '<span class="file-filename">README.md</span>',
    ),
  );
});

test("Responsive drawer and TOC popover sync and close cleanly", () => {
  function makeClassList(initial = []) {
    const set = new Set(initial);
    return {
      add: (c) => set.add(c),
      remove: (c) => set.delete(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (set.has(c)) set.delete(c);
          else set.add(c);
        } else if (force) {
          set.add(c);
        } else {
          set.delete(c);
        }
      },
      contains: (c) => set.has(c),
    };
  }

  function makeToggleEl() {
    const attrs = {};
    const listeners = {};
    return {
      classList: makeClassList(),
      innerHTML: "",
      className: "",
      textContent: "",
      setAttribute: (k, v) => {
        attrs[k] = v;
      },
      getAttribute: (k) => attrs[k],
      querySelectorAll: () => [],
      addEventListener: (ev, fn) => {
        listeners[ev] = listeners[ev] || [];
        listeners[ev].push(fn);
      },
      dispatch: (ev, eventObj = {}) => {
        for (const fn of listeners[ev] || []) fn(eventObj);
      },
    };
  }

  const leftPanel = makeToggleEl();
  const drawerBackdrop = makeToggleEl();
  const navToggleBtn = makeToggleEl();
  const tocBody = makeToggleEl();
  const tocToggleBtn = makeToggleEl();
  const tocPopover = makeToggleEl();
  const tocPopoverBody = makeToggleEl();
  const contentFrame = { src: "" };
  const docListeners = {};

  const mockDocument = {
    getElementById: (id) => {
      if (id === "left-panel") return leftPanel;
      if (id === "drawer-backdrop") return drawerBackdrop;
      if (id === "nav-toggle-btn") return navToggleBtn;
      if (id === "toc-body") return tocBody;
      if (id === "toc-toggle-btn") return tocToggleBtn;
      if (id === "toc-popover") return tocPopover;
      if (id === "toc-popover-body") return tocPopoverBody;
      if (id === "content-frame") return contentFrame;
      return null;
    },
    addEventListener: (ev, fn) => {
      docListeners[ev] = docListeners[ev] || [];
      docListeners[ev].push(fn);
    },
  };

  const files = [
    {
      id: "doc-1",
      type: "markdown",
      title: "Guide",
      relpath: "guide.md",
      src: "pages/guide.html",
      headings: [
        { level: 2, id: "overview", text: "Overview" },
        { level: 3, id: "setup", text: "Setup" },
      ],
      text: "Guide content",
    },
  ];

  shell.setManifest({ files });
  shell._setEnv(mockDocument, {});
  shell.bindResponsiveListeners();

  shell.toggleTocPopover();
  assert.strictEqual(tocPopover.classList.contains("open"), true);
  assert.strictEqual(tocToggleBtn.getAttribute("aria-expanded"), "true");

  navToggleBtn.dispatch("click", { stopPropagation: () => {} });
  assert.strictEqual(leftPanel.classList.contains("open"), true);
  assert.strictEqual(drawerBackdrop.classList.contains("open"), true);
  assert.strictEqual(navToggleBtn.getAttribute("aria-expanded"), "true");
  assert.strictEqual(tocPopover.classList.contains("open"), false);
  assert.strictEqual(tocToggleBtn.getAttribute("aria-expanded"), "false");

  drawerBackdrop.dispatch("click");
  assert.strictEqual(leftPanel.classList.contains("open"), false);
  assert.strictEqual(drawerBackdrop.classList.contains("open"), false);
  assert.strictEqual(navToggleBtn.getAttribute("aria-expanded"), "false");

  shell.toggleNavDrawer();
  shell.selectFile("doc-1");
  assert.strictEqual(leftPanel.classList.contains("open"), false);
  assert.ok(tocBody.innerHTML.includes("Overview"));
  assert.ok(tocPopoverBody.innerHTML.includes("Overview"));
  assert.ok(tocPopoverBody.innerHTML.includes("Setup"));

  tocToggleBtn.dispatch("click", { stopPropagation: () => {} });
  assert.strictEqual(tocPopover.classList.contains("open"), true);
  for (const fn of docListeners.keydown || []) fn({ key: "Escape" });
  assert.strictEqual(tocPopover.classList.contains("open"), false);
});
