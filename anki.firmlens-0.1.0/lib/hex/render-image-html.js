/**
 * @fileoverview Memory image tab with symbol gutter (16-byte rows).
 */

const { gutterLabel } = require('./symbol-intervals');

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
 * @param {number} addr
 */
function anchorId(addr) {
  return `sym-${addr.toString(16)}`;
}

/**
 * @param {import('./symbol-intervals').SymbolInterval[]} intervals
 */
function renderSymbolIndex(intervals) {
  if (!intervals.length) {
    return '<p class="sym-empty">No DWARF globals (load firmware.axf or FirmLens session).</p>';
  }
  /** @type {string[]} */
  const items = [];
  for (const sym of intervals) {
    const href = `#${anchorId(sym.start)}`;
    items.push(
      `<li><a class="sym-link" href="${href}"><span class="sym-name">${escapeHtml(sym.name)}</span>` +
        `<span class="sym-addr">0x${sym.start.toString(16).toUpperCase()}</span>` +
        `<span class="sym-type">${escapeHtml(sym.typeLabel)}</span></a></li>`,
    );
  }
  return `<aside class="sym-index"><h2>Symbols</h2><ol class="sym-list">${items.join('')}</ol></aside>`;
}

/**
 * @param {import('./memory-image').ImageRegion[]} regions
 * @param {import('./symbol-intervals').SymbolInterval[]} intervals
 */
function renderImageMap(regions, intervals) {
  if (!regions.length) {
    return '<p class="empty">No captured bytes in snapshot.</p>';
  }
  /** @type {string[]} */
  const parts = [];
  for (const region of regions) {
    parts.push(`
      <details class="block" open>
        <summary>${escapeHtml(region.title)}<span class="sub"> · ${region.rows.length} row(s)</span></summary>
        <div class="wrap image-wrap">
          <table class="grid image-grid">
            <thead><tr>
              <th class="gutter-col">Symbol</th>
              <th class="addr-col">Address</th>
              <th colspan="16" class="data-hdr">Bytes</th>
            </tr></thead>
            <tbody>`);
    for (const row of region.rows) {
      const gut = gutterLabel(intervals, row.address);
      const anchor =
        gut.kind === 'start' ? ` id="${anchorId(row.address)}"` : '';
      const gutterClass =
        gut.kind === 'start' ? 'gutter sym-start' : gut.kind === 'cont' ? 'gutter sym-cont' : 'gutter';
      /** @type {string[]} */
      const cells = [];
      for (const b of row.bytes) {
        const cls = b.available ? `byte ${escapeHtml(b.style)}` : 'byte gap';
        cells.push(`<td class="byte-cell"><span class="${cls}">${escapeHtml(b.text)}</span></td>`);
      }
      parts.push(`
            <tr class="image-row"${anchor}>
              <td class="${gutterClass}">${escapeHtml(gut.text)}</td>
              <td class="addr-cell">${escapeHtml(row.addressText)}</td>
              ${cells.join('')}
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

/**
 * @param {import('./memory-image').ImageRegion[]} regions
 * @param {import('./symbol-intervals').SymbolInterval[]} intervals
 */
function renderImageTabHtml(regions, intervals) {
  return `
  <div class="image-layout">
    ${renderSymbolIndex(intervals)}
    <div class="image-map">
      ${renderImageMap(regions, intervals)}
    </div>
  </div>`;
}

module.exports = {
  renderImageTabHtml,
  anchorId,
};