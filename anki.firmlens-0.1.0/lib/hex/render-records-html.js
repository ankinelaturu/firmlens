/**
 * @fileoverview Intel HEX record grid HTML fragment.
 */

const { symbolsOverlapping } = require('./symbol-intervals');

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
 * @param {string | null} loadAddr
 */
function parseLoadAddr(loadAddr) {
  if (!loadAddr) return null;
  const n = parseInt(String(loadAddr).replace(/^0x/i, ''), 16);
  return Number.isNaN(n) ? null : n;
}

/**
 * @param {import('./hex-view-model').HexViewModel} model
 * @param {import('./symbol-intervals').SymbolInterval[]} [intervals]
 */
function renderRecordsHtml(model, intervals = []) {
  const sections = model.sections || [];
  if (sections.length === 0) {
    return '<p class="empty">No Intel HEX records parsed.</p>';
  }
  const showSym = intervals.length > 0;
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
            <th>Ln</th><th>LL</th><th>ADDR</th><th>TYP</th><th>LOAD</th>
            ${showSym ? '<th>Symbols</th>' : ''}
            <th>DATA</th><th>CHK</th>
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
      let symCell = '';
      if (showSym && row.isData) {
        const load = parseLoadAddr(row.loadAddr);
        const len = row.dataCells?.length || 0;
        if (load != null && len > 0) {
          const hits = symbolsOverlapping(intervals, load, len);
          symCell = hits.length
            ? hits.map((h) => escapeHtml(h.name)).join('<br/>')
            : '<span class="sym-none">—</span>';
        } else {
          symCell = '<span class="sym-none">—</span>';
        }
      } else if (showSym) {
        symCell = '<span class="sym-none">—</span>';
      }
      parts.push(`
            <tr class="${row.isData ? 'data-row' : ''}">
              <td class="ln">${row.lineNo}</td>
              <td>${escapeHtml(row.ll)}</td>
              <td>${escapeHtml(row.addr)}</td>
              <td>${escapeHtml(row.typ)}<span class="typ-hint">${escapeHtml(row.typLabel)}</span></td>
              <td>${escapeHtml(row.loadAddr || '—')}</td>
              ${showSym ? `<td class="sym-badge">${symCell}</td>` : ''}
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