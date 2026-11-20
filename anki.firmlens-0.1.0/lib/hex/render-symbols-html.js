/**
 * @fileoverview Symbols tree-table tab for the hex viewer.
 */

const { buildSymbolTreeModel, formatLenHex, lenTooltip } = require('./symbol-tree-model');

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
 * @param {import('./resolve-hex-firmware').HexFirmwareContext | null | undefined} firmware
 */
function renderSymbolsTabHtml(firmware) {
  if (!firmware?.dwarf || !firmware.memory) {
    return (
      '<div class="symbols-empty">' +
      '<p>Unable to list symbols. Load an AXF (<code>firmware.axf</code> / <code>project.axf</code>) ' +
      'or open this HEX via a FirmLens session with firmware linked.</p>' +
      '</div>'
    );
  }

  const nodes = buildSymbolTreeModel(firmware.memory, firmware.dwarf);
  if (!nodes.length) {
    return '<p class="symbols-empty">No globals with addresses in DWARF.</p>';
  }

  /** @type {string[]} */
  const rows = [];
  for (const n of nodes) {
    const indent = n.depth > 0 ? ` sym-tree-depth-${Math.min(n.depth, 4)}` : '';
    const childRow = n.parentId ? ' sym-tree-child' : '';
    const hiddenAttr = n.parentId ? ' hidden' : '';
    const toggle = n.container
      ? `<button type="button" class="sym-tree-toggle" aria-expanded="false" aria-label="Expand">▶</button>`
      : `<span class="sym-tree-leaf"></span>`;
    const dataClass = n.unknown
      ? 'sym-data-cell sym-data-unknown'
      : n.container
        ? 'sym-data-cell sym-data-parent'
        : 'sym-data-cell sym-data-leaf';
    const dataText = n.unknown ? '—' : escapeHtml(n.displayHex);
    const tipAttr =
      !n.unknown && n.tooltipHex
        ? ` data-fl-tip="${escapeAttr(n.tooltipHex)}" data-fl-tip-html="${escapeAttr(
            `<section class="fl-tip-hex-block">${escapeHtml(n.tooltipHex).replace(/\n/g, '<br/>')}</section>`,
          )}"`
        : '';
    const parentAttr = n.parentId ? ` data-parent-id="${escapeAttr(n.parentId)}"` : '';
    const rowAttr = n.container ? ' data-expanded="false"' : '';
    const typePill = n.typeLabel
      ? `<span class="sym-type-pill">${escapeHtml(n.typeLabel)}</span>`
      : '';
    const gotoBtn =
      n.canGoto && n.dwarfName
        ? `<button type="button" class="sym-goto-src" aria-label="Go to source" title="Go to source" data-dwarf-name="${escapeAttr(
            n.dwarfName,
          )}" data-decl-line="${n.declLine || 0}" data-decl-file="${escapeAttr(n.declFile || '')}"><span class="sym-goto-ico" aria-hidden="true">↗</span></button>`
        : '';

    rows.push(`      <tr class="sym-tree-row${childRow}"${hiddenAttr} data-node-id="${escapeAttr(
      n.id,
    )}"${parentAttr}${rowAttr}>
        <td class="sym-name-cell${indent}"><span class="sym-name-inner">${toggle}<span class="sym-tree-label">${escapeHtml(
          n.label,
        )}</span>${typePill}${gotoBtn}</span></td>
        <td class="sym-addr-cell">0x${n.start.toString(16).toUpperCase()}</td>
        <td class="${dataClass}"${tipAttr} data-full-hex="${escapeAttr(n.fullHex)}">${dataText}</td>
        <td class="sym-len-cell" title="${escapeAttr(lenTooltip(n.length))}">${escapeHtml(
          formatLenHex(n.length),
        )}</td>
      </tr>`);
  }

  return `
  <div class="symbols-wrap">
    <table class="grid symbols-grid" id="symbols-tree">
      <colgroup>
        <col class="col-sym-name" />
        <col class="col-sym-addr" />
        <col class="col-sym-data" />
        <col class="col-sym-len" />
      </colgroup>
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Address</th>
          <th>Data</th>
          <th class="sym-len-hdr">Len</th>
        </tr>
      </thead>
      <tbody>
${rows.join('\n')}
      </tbody>
    </table>
  </div>`;
}

module.exports = {
  renderSymbolsTabHtml,
};