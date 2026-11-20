(function () {
  /** @param {number} addr */
  function expandSectionForRow(row) {
    const tbody = row.closest('tbody.records-section');
    if (!tbody || tbody.getAttribute('data-open') !== 'false') return;
    tbody.setAttribute('data-open', 'true');
    const toggle = document.querySelector(`.band-toggle[data-target="${CSS.escape(tbody.id)}"]`);
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'true');
      const chev = toggle.querySelector('.chev');
      if (chev) chev.textContent = '▼';
    }
  }

  /** @param {number} addr */
  function highlightAtAddress(addr) {
    document.querySelectorAll('.fl-addr-highlight, .fl-byte-highlight').forEach((el) => {
      el.classList.remove('fl-addr-highlight', 'fl-byte-highlight');
    });
    const rows = document.querySelectorAll('tr.records-data[data-fl-addr-start]');
    for (const row of rows) {
      if (!(row instanceof HTMLTableRowElement)) continue;
      const start = Number(row.getAttribute('data-fl-addr-start'));
      const end = Number(row.getAttribute('data-fl-addr-end'));
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      if (addr < start || addr >= end) continue;
      expandSectionForRow(row);
      row.classList.add('fl-addr-highlight');
      const offset = addr - start;
      const bytes = row.querySelectorAll('td.data .byte');
      const byte = bytes[offset];
      if (byte) byte.classList.add('fl-byte-highlight');
      row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      window.setTimeout(() => {
        row.classList.remove('fl-addr-highlight');
        if (byte) byte.classList.remove('fl-byte-highlight');
      }, 2400);
      return true;
    }
    return false;
  }

  document.addEventListener(
    'click',
    (ev) => {
      const btn = ev.target instanceof Element ? ev.target.closest('.sym-goto-mem') : null;
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      const addr = Number(btn.getAttribute('data-goto-addr') || '0');
      if (!addr) return;
      const tab = document.getElementById('tab-records');
      if (tab instanceof HTMLInputElement) tab.checked = true;
      if (!highlightAtAddress(addr)) {
        /* target not in any data row — still switched to records tab */
      }
    },
    true,
  );
})();