/**
 * @fileoverview Intel HEX record grid — single table with collapsible section bands.
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
 * @param {import('./hex-view-model').HexViewSection} section
 */
function bandClass(section) {
  if (section.subtitle?.includes('End of file') || section.id === 'default:0') {
    return 'section-band band-eof';
  }
  if (section.id.startsWith('linear:')) return 'section-band band-linear';
  if (section.id.startsWith('segment:')) return 'section-band band-segment';
  return 'section-band';
}

/**
 * @param {import('./hex-view-model').HexViewRecordRow} row
 * @param {boolean} showSym
 * @param {import('./symbol-intervals').SymbolInterval[]} intervals
 */
function renderRecordRow(row, showSym, intervals) {
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
  return `
      <tr class="records-data${row.isData ? ' data-row' : ''}">
        <td class="ln">${row.lineNo}</td>
        <td>${escapeHtml(row.ll)}</td>
        <td>${escapeHtml(row.addr)}</td>
        <td>${escapeHtml(row.typ)}<span class="typ-hint">${escapeHtml(row.typLabel)}</span></td>
        <td>${escapeHtml(row.loadAddr || '—')}</td>
        ${showSym ? `<td class="sym-badge">${symCell}</td>` : ''}
        <td class="data">${bytes.join('')}</td>
        <td class="chk ${row.chkOk ? '' : 'bad'}">${escapeHtml(row.chk)}</td>
      </tr>`;
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
  const colCount = showSym ? 8 : 7;

  /** @type {string[]} */
  const bodies = [];
  for (const section of sections) {
    const rows = section.rows || [];
    const safeId = escapeHtml(section.id.replace(/[^a-zA-Z0-9_-]/g, '-'));
    const band = bandClass(section);
    bodies.push(`    <tbody class="records-section" id="records-${safeId}" data-open="true">
      <tr class="${band}">
        <td colspan="${colCount}">
          <button type="button" class="band-toggle" aria-expanded="true" data-target="records-${safeId}">
            <span class="chev">▼</span>
            <span class="band-title">${escapeHtml(section.title)}</span>
            <span class="sub"> · ${rows.length} record(s) · ${escapeHtml(section.subtitle || '')}</span>
          </button>
        </td>
      </tr>`);
    for (const row of rows) {
      bodies.push(renderRecordRow(row, showSym, intervals));
    }
    bodies.push('    </tbody>');
  }

  return `
  <div class="records-wrap">
    <table class="grid records-grid">
      <colgroup>
        <col class="col-ln" />
        <col class="col-ll" />
        <col class="col-addr" />
        <col class="col-typ" />
        <col class="col-load" />
        ${showSym ? '<col class="col-sym" />' : ''}
        <col class="col-data" />
        <col class="col-chk" />
      </colgroup>
      <thead>
        <tr>
          <th>Ln</th><th>LL</th><th>ADDR</th><th>TYP</th><th>LOAD</th>
          ${showSym ? '<th>Symbols</th>' : ''}
          <th>DATA</th><th>CHK</th>
        </tr>
      </thead>
${bodies.join('\n')}
    </table>
  </div>`;
}

module.exports = {
  renderRecordsHtml,
};