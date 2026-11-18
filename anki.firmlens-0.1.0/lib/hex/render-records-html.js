/**
 * @fileoverview Intel HEX record grid HTML fragment.
 */

/**
 * @param {string} s
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {import('./hex-view-model').HexViewModel} model
 */
function renderRecordsHtml(model) {
  const sections = model.sections || [];
  if (sections.length === 0) {
    return '<p class="empty">No Intel HEX records parsed.</p>';
  }
  /** @type {string[]} */
  const parts = [];
  for (const section of sections) {
    const rows = section.rows || [];
    parts.push(`
    <details class="block" open>
      <summary>${escapeHtml(section.title)}<span class="sub"> · ${rows.length} record(s)</span></summary>
      <div class="wrap">
        <table class="grid records-grid">
          <thead><tr>
            <th>Ln</th><th>LL</th><th>ADDR</th><th>TYP</th><th>LOAD</th><th>DATA</th><th>CHK</th>
          </tr></thead>
          <tbody>`);
    for (const row of rows) {
      /** @type {string[]} */
      const bytes = [];
      for (const cell of row.dataCells || []) {
        bytes.push(
          `<span class="byte ${escapeHtml(cell.style || 'default')}">${escapeHtml(cell.text)}</span>`,
        );
      }
      parts.push(`
            <tr class="${row.isData ? 'data-row' : ''}">
              <td class="ln">${row.lineNo}</td>
              <td>${escapeHtml(row.ll)}</td>
              <td>${escapeHtml(row.addr)}</td>
              <td>${escapeHtml(row.typ)}<span class="typ-hint">${escapeHtml(row.typLabel)}</span></td>
              <td>${escapeHtml(row.loadAddr || '—')}</td>
              <td class="data">${bytes.join('')}</td>
              <td class="chk ${row.chkOk ? '' : 'bad'}">${escapeHtml(row.chk)}</td>
            </tr>`);
    }
    parts.push(`
          </tbody>
        </table>
      </div>
    </details>`);
  }
  return parts.join('\n');
}

module.exports = {
  renderRecordsHtml,
};