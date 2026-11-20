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
  /** @type {((row: HTMLTableRowElement | null, byte?: Element | null) => void) | undefined} */
  const selectRecordsRow = window.FirmLens?.selectRecordsRow;

  /** @param {number} addr */
  function highlightAtAddress(addr) {
    const rows = document.querySelectorAll('tr.records-data[data-fl-addr-start]');
    for (const row of rows) {
      if (!(row instanceof HTMLTableRowElement)) continue;
      const start = Number(row.getAttribute('data-fl-addr-start'));
      const end = Number(row.getAttribute('data-fl-addr-end'));
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      if (addr < start || addr >= end) continue;
      expandSectionForRow(row);
      const offset = addr - start;
      const bytes = row.querySelectorAll('td.data .byte');
      const byte = bytes[offset];
      if (selectRecordsRow) selectRecordsRow(row, byte instanceof Element ? byte : null);
      else row.classList.add('fl-row-selected');
      row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return true;
    }
    return false;
  }

  const symbolsTable = document.getElementById('symbols-tree');

  /**
   * @param {HTMLTableRowElement} row
   * @param {boolean} expanded
   */
  function setContainerExpanded(row, expanded) {
    const id = row.getAttribute('data-node-id');
    if (!id || !symbolsTable) return;
    row.setAttribute('data-expanded', expanded ? 'true' : 'false');
    const btn = row.querySelector('.sym-tree-toggle');
    if (btn) {
      btn.textContent = expanded ? '▼' : '▶';
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      btn.setAttribute('aria-label', expanded ? 'Collapse' : 'Expand');
    }
    const dataCell = row.querySelector('.sym-data-parent');
    if (dataCell) dataCell.classList.toggle('sym-data-suppressed', expanded);
    symbolsTable.querySelectorAll(`tr.sym-tree-child[data-parent-id="${CSS.escape(id)}"]`).forEach((child) => {
      if (expanded) child.removeAttribute('hidden');
      else child.setAttribute('hidden', 'hidden');
    });
  }

  /**
   * @param {string} nodeId
   */
  function revealSymbolRow(nodeId) {
    if (!symbolsTable) return false;
    const tab = document.getElementById('tab-symbols');
    if (tab instanceof HTMLInputElement) tab.checked = true;
    const esc = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(nodeId) : nodeId.replace(/"/g, '\\"');
    const row = symbolsTable.querySelector(`tr.sym-tree-row[data-node-id="${esc}"]`);
    if (!(row instanceof HTMLTableRowElement)) return false;

    /** @type {string | null} */
    let parentId = row.getAttribute('data-parent-id');
    /** @type {HTMLTableRowElement[]} */
    const chain = [];
    while (parentId) {
      const parent = symbolsTable.querySelector(`tr.sym-tree-row[data-node-id="${CSS.escape(parentId)}"]`);
      if (!(parent instanceof HTMLTableRowElement)) break;
      chain.unshift(parent);
      parentId = parent.getAttribute('data-parent-id');
    }
    for (const parent of chain) {
      if (parent.getAttribute('data-expanded') === 'false') setContainerExpanded(parent, true);
    }

    const selectSymbolRow = window.FirmLens?.selectSymbolRow;
    if (selectSymbolRow) selectSymbolRow(row);
    else row.classList.add('fl-row-selected');
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return true;
  }

  document.addEventListener(
    'click',
    (ev) => {
      const memBtn = ev.target instanceof Element ? ev.target.closest('.sym-goto-mem') : null;
      const symBtn = ev.target instanceof Element ? ev.target.closest('.sym-goto-sym') : null;
      if (!memBtn && !symBtn) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (symBtn) {
        const nodeId = symBtn.getAttribute('data-goto-node-id') || '';
        if (nodeId) revealSymbolRow(nodeId);
        return;
      }
      const addr = Number(memBtn.getAttribute('data-goto-addr') || '0');
      if (!addr) return;
      const tab = document.getElementById('tab-records');
      if (tab instanceof HTMLInputElement) tab.checked = true;
      highlightAtAddress(addr);
    },
    true,
  );
})();