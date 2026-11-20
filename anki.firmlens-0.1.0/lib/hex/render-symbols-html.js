/**
 * @fileoverview Symbols tree-table tab for the hex viewer.
 */

const { buildSymbolTreeModel, formatLenHex, lenTooltip } = require('./symbol-tree-model');
const { buildAllIntervals } = require('./symbol-intervals');
const { formatViewerTooltip } = require('./viewer-decode');
const { formatGotoAddress } = require('./pointer-target');
const {
  symbolByteStyle,
  paddingByteStyle,
  hueKeyForSymbol,
  symbolRowHueVar,
} = require('./symbol-color');
const { isPaddingInterval } = require('./symbol-intervals');
const { DISPLAY_HEX_CAP } = require('./symbol-tree-model');

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
 * @param {string} typeLabel
 * @param {{ unknown?: boolean; label: string; container?: boolean }} n
 */
function typePillClass(typeLabel, n) {
  if (n.unknown) return 'sym-type-unknown';
  if (n.label === '(padding)' || typeLabel === 'padding') return 'sym-type-padding';
  if (typeLabel?.includes('*')) return 'sym-type-pointer';
  if (typeLabel?.includes('[')) return 'sym-type-array';
  if (n.container) return 'sym-type-struct';
  return 'sym-type-scalar';
}

/**
 * @param {string} fullHex
 * @param {string} displayHex
 * @param {string} dwarfName
 * @param {Map<string, number> | undefined} hueMap
 * @param {boolean} padding
 */
function renderColoredDataHex(fullHex, displayHex, dwarfName, hueMap, padding) {
  if (!fullHex) return '—';
  const pairs = fullHex.split(' ').filter(Boolean);
  const show = Math.min(pairs.length, DISPLAY_HEX_CAP);
  const hueName = hueKeyForSymbol(dwarfName) || dwarfName;
  const byteStyle = padding ? paddingByteStyle() : symbolByteStyle(hueName, hueMap);
  /** @type {string[]} */
  const chips = [];
  for (let i = 0; i < show; i += 1) {
    chips.push(
      `<span class="sym-data-byte" style="${escapeAttr(byteStyle)}">${escapeHtml(pairs[i])}</span>`,
    );
  }
  let tail = '';
  if (pairs.length > show || displayHex.includes('…')) {
    tail = ' <span class="sym-data-ellipsis">…</span>';
  }
  return chips.join(' ') + tail;
}

/**
 * @param {import('./resolve-hex-firmware').HexFirmwareContext | null | undefined} firmware
 * @param {{
 *   limits?: { maxStructFields: number; maxReadBytes: number };
 *   snippetCache?: ReturnType<typeof import('./source-snippet').createSourceSnippetCache> | null;
 *   hueMap?: Map<string, number>;
 * }} [opts]
 */
function renderSymbolsTabHtml(firmware, opts) {
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

  const limits = opts?.limits || { maxStructFields: 32, maxReadBytes: 256 };
  const snippetCache = opts?.snippetCache ?? null;
  const hueMap = opts?.hueMap;
  const axfPath = firmware.axfPath || '';
  const intervals = buildAllIntervals(firmware.dwarf);
  /** @type {Map<string, import('./symbol-intervals').SymbolInterval>} */
  const byName = new Map(intervals.map((s) => [s.name, s]));

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
    const interval = n.dwarfName ? byName.get(n.dwarfName) : null;
    const padding = interval ? isPaddingInterval(interval) : false;
    const dataText = n.unknown
      ? '—'
      : n.container
        ? escapeHtml(n.displayHex)
        : renderColoredDataHex(n.fullHex, n.displayHex, n.dwarfName || n.label, hueMap, padding);
    const memGotoBtn =
      n.gotoMemoryAddr != null
        ? `<button type="button" class="sym-goto-mem" data-goto-addr="${n.gotoMemoryAddr}" title="Go to address in HEX records" aria-label="Go to ${escapeAttr(
            formatGotoAddress(n.gotoMemoryAddr),
          )}"><span class="sym-goto-mem-lbl">Goto ${escapeHtml(formatGotoAddress(n.gotoMemoryAddr))}</span></button>`
        : '';
    const symGotoBtn =
      n.gotoMemorySymbol && n.gotoMemorySymbolId
        ? `<button type="button" class="sym-goto-sym" data-goto-node-id="${escapeAttr(
            n.gotoMemorySymbolId,
          )}" title="Go to symbol in this table" aria-label="Go to ${escapeAttr(n.gotoMemorySymbol)}"><span class="sym-goto-sym-lbl">Goto ${escapeHtml(
            n.gotoMemorySymbol,
          )}</span></button>`
        : '';
    const tipAttr =
      !n.unknown && n.tooltipHex
        ? ` data-fl-tip="${escapeAttr(n.tooltipHex)}" data-fl-tip-html="${escapeAttr(
            `<section class="fl-tip-hex-block">${escapeHtml(n.tooltipHex).replace(/\n/g, '<br/>')}</section>`,
          )}"`
        : '';
    const parentAttr = n.parentId ? ` data-parent-id="${escapeAttr(n.parentId)}"` : '';
    const rowAttr = n.container ? ' data-expanded="false"' : '';
    const pillCls = typePillClass(n.typeLabel || '', n);
    const typePill = n.typeLabel
      ? `<span class="sym-type-pill ${pillCls}">${escapeHtml(n.typeLabel)}</span>`
      : '';
    const hueStyle =
      !n.unknown && n.dwarfName && hueMap
        ? ` style="${escapeAttr(symbolRowHueVar(n.dwarfName, hueMap))}"`
        : '';
    const addrHueStyle = hueStyle;
    const gotoBtn =
      n.canGoto && n.dwarfName
        ? `<button type="button" class="sym-goto-src" aria-label="Go to source" title="Go to source" data-dwarf-name="${escapeAttr(
            n.dwarfName,
          )}" data-decl-line="${n.declLine || 0}" data-decl-file="${escapeAttr(n.declFile || '')}"><span class="sym-goto-ico" aria-hidden="true">↗</span></button>`
        : '';

    let nameTipAttr = '';
    if (!n.unknown && n.dwarfName) {
      const sym = byName.get(n.dwarfName);
      if (sym) {
        const tip = formatViewerTooltip(
          firmware.memory,
          firmware.dwarf,
          sym,
          sym.start,
          limits,
          axfPath,
          snippetCache,
        );
        if (tip.html) {
          nameTipAttr =
            ` data-fl-tip="${escapeAttr(tip.plain)}" data-fl-tip-html="${escapeAttr(tip.html)}"`;
        }
      }
    }

    rows.push(`      <tr class="sym-tree-row sym-hue-row${childRow}"${hiddenAttr}${hueStyle} data-node-id="${escapeAttr(
      n.id,
    )}"${parentAttr}${rowAttr}>
        <td class="sym-name-cell${indent}"><span class="sym-name-inner">${toggle}<span class="sym-tree-label"${nameTipAttr}>${escapeHtml(
          n.label,
        )}</span>${typePill}${gotoBtn}</span></td>
        <td class="sym-addr-cell sym-addr-hue"${addrHueStyle}>0x${n.start.toString(16).toUpperCase()}</td>
        <td class="${dataClass}"${tipAttr} data-full-hex="${escapeAttr(n.fullHex)}"><span class="sym-data-inner"><span class="sym-data-hex${
          n.unknown || n.container ? '' : ' sym-data-hex-chips'
        }">${dataText}</span><span class="sym-data-gotos">${memGotoBtn}${symGotoBtn}</span></span></td>
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