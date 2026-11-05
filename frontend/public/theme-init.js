(function () {
  var theme = null;
  try {
    theme = localStorage.getItem('theme');
  } catch (e) {
    /* storage unavailable (private mode, blocked) — fall back to system */
  }
  var dark = theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', dark);
})();
