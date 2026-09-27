(() => {
  try {
    const params = new URLSearchParams(location.search);
    if (params.get("dark") === "1") {
      document.documentElement.classList.add("reader-dark");
    }
  } catch (_e) {
    /* URLSearchParams unsupported — ignore, page just starts in light mode */
  }

  window.addEventListener("message", (ev) => {
    const d = ev?.data;
    if (d && d.type === "reader-set-dark") {
      document.documentElement.classList.toggle("reader-dark", !!d.value);
    }
  });
})();
