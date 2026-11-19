/**
 * @fileoverview Intel HEX record grid — single table with collapsible section bands.
 */

const { symbolAtAddress, tooltipForByte } = require('./viewer-decode');
const { symbolByteStyle } = require('./symbol-color');

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
 * @param {string} s
 */
function escapeAttr(s) {
  return escapeHtml(s).replace(/\r?\n/g, '&#10;');
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
 * @typedef {object} RecordsRenderCtx
 * @property {import('./symbol-intervals').SymbolInterval[]} intervals
 * @property {import('./resolve-hex-firmware').HexFirmwareContext | null} [firmware]
 * @property {{ maxStructFields: number; maxReadBytes: number }} limits
 * @property {Map<string, number>} [hueMap]
 */

/**
 * @param {import('./hex-view-model').HexViewRecordRow} row
 * @param {RecordsRenderCtx} ctx
 */
function renderDataBytes(row, ctx) {
  const load = parseLoadAddr(row.loadAddr);
  const { intervals, firmware, limits, hueMap } = ctx;
  const axfPath = firmware?.axfPath || '';
  const canDecode = Boolean(firmware?.memory && firmware?.dwarf && axfPath && intervals.length);

  /** @type {string[]} */
  const parts = [];
  const cells = row.dataCells || [];
  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i];
    const addr = load != null ? load + i : null;
    let cls = `byte ${escapeHtml(cell.style || 'default')}`;
    let style = '';
    let title = '';
    if (canDecode && addr != null) {
      const sym = symbolAtAddress(intervals, addr);
      if (sym) {
        cls = 'byte sym-mapped';
        style = symbolByteStyle(sym.name, hueMap);
        title = tooltipForByte(firmware.memory, firmware.dwarf, sym, addr, limits, axfPath);
      }
    }
    const tip = title ? ` data-fl-tip="${escapeAttr(title)}"` : '';
    const styleAttr = style ? ` style="${escapeAttr(style)}"` : '';
    parts.push(`<span class="${cls}"${styleAttr}${tip}>${escapeHtml(cell.text)}</span>`);
  }
  return parts.join('');
}

/**
 * @param {import('./hex-view-model').HexViewRecordRow} row
 * @param {RecordsRenderCtx} ctx
 */
function renderRecordRow(row, ctx) {
  const dataHtml = row.isData
    ? renderDataBytes(row, ctx)
    : (row.dataCells || [])
        .map(
          (cell) =>
            `<span class="byte ${escapeHtml(cell.style || 'default')}">${escapeHtml(cell.text)}</span>`,
        )
        .join('');

  return `
      <tr class="records-data${row.isData ? ' data-row' : ''}">
        <td class="ln">${row.lineNo}</td>
        <td>${escapeHtml(row.ll)}</td>
        <td>${escapeHtml(row.addr)}</td>
        <td>${escapeHtml(row.typ)}<span class="typ-hint">${escapeHtml(row.typLabel)}</span></td>
        <td>${escapeHtml(row.loadAddr || '—')}</td>
        <td class="data">${dataHtml}</td>
        <td class="chk ${row.chkOk ? '' : 'bad'}">${escapeHtml(row.chk)}</td>
      </tr>`;
}

/**
 * @param {import('./hex-view-model').HexViewModel} model
 * @param {RecordsRenderCtx} [ctx]
 */
function renderRecordsHtml(model, ctx) {
  const sections = model.sections || [];
  if (sections.length === 0) {
    return '<p class="empty">No Intel HEX records parsed.</p>';
  }
  const renderCtx = ctx || {
    intervals: [],
    firmware: null,
    limits: { maxStructFields: 32, maxReadBytes: 256 },
  };
  const colCount = 7;

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
      bodies.push(renderRecordRow(row, renderCtx));
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
        <col class="col-data" />
        <col class="col-chk" />
      </colgroup>
      <thead>
        <tr>
          <th>Ln</th><th>LL</th><th>ADDR</th><th>TYP</th><th>LOAD</th>
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