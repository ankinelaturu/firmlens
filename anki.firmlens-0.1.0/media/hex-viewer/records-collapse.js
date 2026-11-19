(function () {
  document.querySelectorAll('.band-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-target');
      const tbody = id && document.getElementById(id);
      if (!tbody) return;
      const open = tbody.getAttribute('data-open') === 'true';
      const next = !open;
      tbody.setAttribute('data-open', next ? 'true' : 'false');
      btn.setAttribute('aria-expanded', next ? 'true' : 'false');
      const chev = btn.querySelector('.chev');
      if (chev) chev.textContent = next ? '▼' : '▶';
    });
  });
})();