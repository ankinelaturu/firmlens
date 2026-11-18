/**
 * @fileoverview Memory image tab with symbol gutter (16-byte rows).
 */

const { gutterLabel } = require('./symbol-intervals');
const { symbolByteStyle, symbolGutterStyle } = require('./symbol-color');
const { symbolAtAddress, tooltipForByte } = require('./viewer-decode');
const { byteColorClass } = require('./record-decode');

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
  const seen = new Set();
  /** @type {string[]} */
  const items = [];
  for (const sym of intervals) {
    if (sym.name.includes('.')) continue;
    if (seen.has(sym.start)) continue;
    seen.add(sym.start);
    const href = `#${anchorId(sym.start)}`;
    const style = symbolGutterStyle(sym.name);
    items.push(
      `<li style="${escapeAttr(style)}"><a class="sym-link" href="${href}">` +
        `<span class="sym-name">${escapeHtml(sym.name)}</span>` +
        `<span class="sym-addr">0x${sym.start.toString(16).toUpperCase()}</span>` +
        `<span class="sym-type">${escapeHtml(sym.typeLabel)}</span></a></li>`,
    );
  }
  const memberItems = intervals
    .filter((s) => s.name.includes('.'))
    .map((sym) => {
      const href = `#${anchorId(sym.start)}`;
      return (
        `<li><a class="sym-link" href="${href}">` +
        `<span class="sym-name">${escapeHtml(sym.name)}</span>` +
        `<span class="sym-addr">0x${sym.start.toString(16).toUpperCase()}</span></a></li>`
      );
    });

  return (
    `<aside class="sym-index">` +
    `<h2>Globals</h2><ol class="sym-list">${items.join('')}</ol>` +
    (memberItems.length
      ? `<h2 class="sym-sub">Members</h2><ol class="sym-list sym-members">${memberItems.join('')}</ol>`
      : '') +
    `</aside>`
  );
}

/**
 * @param {import('./memory-image').ImageRegion[]} regions
 * @param {import('./symbol-intervals').SymbolInterval[]} intervals
 * @param {{
 *   firmware?: import('./resolve-hex-firmware').HexFirmwareContext | null;
 *   limits: { maxStructFields: number; maxReadBytes: number };
 * }} ctx
 */
function renderImageMap(regions, intervals, ctx) {
  if (!regions.length) {
    return '<p class="empty">No captured bytes in snapshot.</p>';
  }
  const fw = ctx.firmware;
  const axfPath = fw?.axfPath || '';
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
      const anchor = gut.kind === 'start' ? ` id="${anchorId(row.address)}"` : '';
      const gutterClass =
        gut.kind === 'start' ? 'gutter sym-start' : gut.kind === 'cont' ? 'gutter sym-cont' : 'gutter';
      const gutterStyle = gut.kind !== 'empty' && gut.text ? symbolGutterStyle(gut.text.replace(/^│\s*/, '')) : '';
      /** @type {string[]} */
      const cells = [];
      for (const b of row.bytes) {
        const sym = b.available ? symbolAtAddress(intervals, b.address) : null;
        let cls = b.available ? `byte ${byteColorClass(parseInt(b.text, 16))}` : 'byte gap';
        let extraStyle = '';
        let tip = '';
        if (sym && b.available) {
          cls = 'byte sym-mapped';
          extraStyle = symbolByteStyle(sym.name);
          if (fw?.memory && fw?.dwarf && axfPath) {
            tip = tooltipForByte(fw.memory, fw.dwarf, sym, b.address, ctx.limits, axfPath);
          } else {
            tip = sym.name;
          }
        }
        const tipAttr = tip ? ` title="${escapeAttr(tip)}"` : '';
        cells.push(
          `<td class="byte-cell"><span class="${cls}" style="${escapeAttr(extraStyle)}"${tipAttr}>${escapeHtml(b.text)}</span></td>`,
        );
      }
      parts.push(`
            <tr class="image-row"${anchor}>
              <td class="${gutterClass}" style="${escapeAttr(gutterStyle)}">${escapeHtml(gut.text)}</td>
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
 * @param {object} ctx
 */
function renderImageTabHtml(regions, intervals, ctx) {
  return `
  <div class="image-layout">
    ${renderSymbolIndex(intervals)}
    <div class="image-map">
      ${renderImageMap(regions, intervals, ctx)}
    </div>
  </div>`;
}

module.exports = {
  renderImageTabHtml,
  anchorId,
};