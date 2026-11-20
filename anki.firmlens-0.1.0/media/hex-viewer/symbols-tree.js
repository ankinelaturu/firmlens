(function () {
  const table = document.getElementById('symbols-tree');
  if (!table) return;

  /**
   * @param {HTMLTableRowElement} row
   * @param {boolean} expanded
   */
  function setContainerExpanded(row, expanded) {
    const id = row.getAttribute('data-node-id');
    if (!id) return;
    row.setAttribute('data-expanded', expanded ? 'true' : 'false');
    const btn = row.querySelector('.sym-tree-toggle');
    if (btn) {
      btn.textContent = expanded ? '▼' : '▶';
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      btn.setAttribute('aria-label', expanded ? 'Collapse' : 'Expand');
    }
    const dataCell = row.querySelector('.sym-data-parent');
    if (dataCell) {
      dataCell.classList.toggle('sym-data-suppressed', expanded);
    }
    table.querySelectorAll(`tr.sym-tree-child[data-parent-id="${CSS.escape(id)}"]`).forEach((child) => {
      if (expanded) child.removeAttribute('hidden');
      else child.setAttribute('hidden', 'hidden');
    });
  }

  table.querySelectorAll('tr.sym-tree-row[data-expanded]').forEach((row) => {
    setContainerExpanded(/** @type {HTMLTableRowElement} */ (row), false);
  });

  table.addEventListener('click', (ev) => {
    const btn = ev.target instanceof Element ? ev.target.closest('.sym-tree-toggle') : null;
    if (!btn) return;
    const row = btn.closest('tr.sym-tree-row');
    if (!(row instanceof HTMLTableRowElement)) return;
    const expanded = row.getAttribute('data-expanded') === 'true';
    setContainerExpanded(row, !expanded);
  });
})();