(function () {
  /** @typedef {typeof window & { FirmLens?: { selectSymbolRow?: (row: HTMLTableRowElement | null) => void; selectRecordsRow?: (row: HTMLTableRowElement | null, byte?: Element | null) => void } }} Win */

  function clearSymbolSelection() {
    document.querySelectorAll('tr.sym-tree-row.fl-row-selected').forEach((r) => {
      r.classList.remove('fl-row-selected');
      r.removeAttribute('aria-selected');
    });
  }

  function clearRecordsSelection() {
    document.querySelectorAll('tr.records-data.fl-row-selected').forEach((r) => {
      r.classList.remove('fl-row-selected');
      r.removeAttribute('aria-selected');
    });
    document.querySelectorAll('td.data .byte.fl-byte-selected').forEach((b) => {
      b.classList.remove('fl-byte-selected');
    });
  }

  /**
   * @param {HTMLTableRowElement | null} row
   */
  function selectSymbolRow(row) {
    clearSymbolSelection();
    clearRecordsSelection();
    if (!row) return;
    row.classList.add('fl-row-selected');
    row.setAttribute('aria-selected', 'true');
  }

  /**
   * @param {HTMLTableRowElement | null} row
   * @param {Element | null | undefined} byte
   */
  function selectRecordsRow(row, byte) {
    clearRecordsSelection();
    clearSymbolSelection();
    if (!row) return;
    row.classList.add('fl-row-selected');
    row.setAttribute('aria-selected', 'true');
    if (byte instanceof Element) byte.classList.add('fl-byte-selected');
  }

  const win = /** @type {Win} */ (window);
  win.FirmLens = win.FirmLens || {};
  win.FirmLens.selectSymbolRow = selectSymbolRow;
  win.FirmLens.selectRecordsRow = selectRecordsRow;

  const symTable = document.getElementById('symbols-tree');
  if (symTable) {
    symTable.addEventListener('click', (ev) => {
      if (!(ev.target instanceof Element)) return;
      if (ev.target.closest('button.sym-tree-toggle, .sym-goto-src, .sym-goto-mem, .sym-goto-sym')) return;
      const row = ev.target.closest('tr.sym-tree-row');
      if (!(row instanceof HTMLTableRowElement)) return;
      selectSymbolRow(row);
    });
  }

  const recordsGrid = document.querySelector('table.records-grid');
  if (recordsGrid) {
    recordsGrid.addEventListener('click', (ev) => {
      if (!(ev.target instanceof Element)) return;
      const row = ev.target.closest('tr.records-data.data-row');
      if (!(row instanceof HTMLTableRowElement)) return;
      const byte = ev.target.closest('td.data .byte');
      selectRecordsRow(row, byte);
    });
  }
})();