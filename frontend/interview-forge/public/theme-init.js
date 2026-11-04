// Applies the saved theme before first paint. Kept as a same-origin file because the CSP forbids inline scripts.
(function () {
  try {
    var t = localStorage.getItem('if-theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch (e) { /* storage unavailable */ }
})();
