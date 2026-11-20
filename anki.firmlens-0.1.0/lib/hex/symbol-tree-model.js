/**
 * @fileoverview Tree-table rows for the Symbols hex viewer tab.
 */

const { buildAllIntervals, isPaddingInterval } = require('./symbol-intervals');

const DISPLAY_HEX_CAP = 64;
const BYTES_PER_TOOLTIP_LINE = 16;

/**
 * @typedef {import('./hex-memory').HexMemory} HexMemory
 * @typedef {import('../dwarf/dwarf-index').DwarfIndex} DwarfIndex
 * @typedef {import('./symbol-intervals').SymbolInterval} SymbolInterval
 */

/**
 * @typedef {object} SymbolTreeNode
 * @property {string} id
 * @property {string} label
 * @property {number} depth
 * @property {string | null} parentId
 * @property {boolean} container
 * @property {boolean} unknown
 * @property {number} start
 * @property {number} end
 * @property {number} length
 * @property {string} fullHex
 * @property {string} displayHex
 * @property {string} tooltipHex
 * @property {string} [typeLabel]
 */

/**
 * @param {number} n
 */
function formatLenHex(n) {
  const v = Math.max(0, n) & 0xffff;
  return `0x${v.toString(16).toUpperCase().padStart(4, '0')}`;
}

/**
 * @param {number} n
 */
function lenTooltip(n) {
  return `${n} byte${n === 1 ? '' : 's'}`;
}

/**
 * @param {string} id
 */
function safeId(id) {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * @param {HexMemory} memory
 * @param {number} start
 * @param {number} end
 */
function readHexRange(memory, start, end) {
  const len = end - start;
  if (len <= 0) return '';
  const r = memory.read(start, len);
  const parts = [];
  for (let i = 0; i < len; i += 1) {
    const b = r.bytes[i];
    parts.push(b !== undefined && r.available[i] ? b.toString(16).padStart(2, '0') : '??');
  }
  return parts.join(' ').toUpperCase();
}

/**
 * @param {string} fullHex
 */
function truncateHex(fullHex) {
  const pairs = fullHex.split(' ').filter(Boolean);
  if (pairs.length <= DISPLAY_HEX_CAP) return { display: fullHex, truncated: false };
  return {
    display: `${pairs.slice(0, DISPLAY_HEX_CAP).join(' ')} …`,
    truncated: true,
  };
}

/**
 * @param {string} fullHex
 */
function formatTooltipHex(fullHex) {
  const pairs = fullHex.split(' ').filter(Boolean);
  /** @type {string[]} */
  const lines = [];
  for (let i = 0; i < pairs.length; i += BYTES_PER_TOOLTIP_LINE) {
    lines.push(pairs.slice(i, i + BYTES_PER_TOOLTIP_LINE).join(' '));
  }
  return lines.join('\n');
}

/**
 * @param {{ start: number; end: number }[]} ranges
 */
function mergeRanges(ranges) {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  /** @type {{ start: number; end: number }[]} */
  const out = [];
  for (const r of sorted) {
    if (r.end <= r.start) continue;
    const last = out[out.length - 1];
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else out.push({ start: r.start, end: r.end });
  }
  return out;
}

/**
 * @param {HexMemory} memory
 * @param {{ start: number; end: number }[]} covered
 * @returns {{ start: number; end: number }[]}
 */
function unknownGapsInCapture(memory, covered) {
  const addrs = memory.definedAddresses();
  if (!addrs.length) return [];
  /** @type {{ start: number; end: number }[]} */
  const runs = [];
  let runStart = addrs[0];
  let prev = addrs[0];
  for (let i = 1; i < addrs.length; i += 1) {
    if (addrs[i] === prev + 1) {
      prev = addrs[i];
    } else {
      runs.push({ start: runStart, end: prev + 1 });
      runStart = addrs[i];
      prev = addrs[i];
    }
  }
  runs.push({ start: runStart, end: prev + 1 });

  const merged = mergeRanges(covered);
  /** @type {{ start: number; end: number }[]} */
  const gaps = [];
  for (const run of runs) {
    let cursor = run.start;
    for (const c of merged) {
      if (c.end <= cursor || c.start >= run.end) continue;
      if (c.start > cursor) gaps.push({ start: cursor, end: c.start });
      cursor = Math.max(cursor, c.end);
    }
    if (cursor < run.end) gaps.push({ start: cursor, end: run.end });
  }
  return gaps;
}

/**
 * @param {SymbolInterval} sym
 */
function childLabel(sym) {
  if (isPaddingInterval(sym)) return '(padding)';
  const dot = sym.name.indexOf('.');
  return dot >= 0 ? sym.name.slice(dot + 1) : sym.name;
}

/**
 * @param {string | undefined} typeLabel
 * @param {boolean} unknown
 * @param {string} label
 */
function typePillLabel(typeLabel, unknown, label) {
  if (unknown || !typeLabel || typeLabel === 'unknown') return '';
  if (label === '(padding)' && typeLabel === 'padding') return '';
  return typeLabel;
}

/**
 * @param {HexMemory} memory
 * @param {DwarfIndex | null} dwarf
 * @returns {SymbolTreeNode[]}
 */
function buildSymbolTreeModel(memory, dwarf) {
  if (!dwarf?.variables?.length) return [];

  const intervals = buildAllIntervals(dwarf);
  const globals = intervals.filter((s) => !s.name.includes('.'));
  const children = intervals.filter((s) => s.name.includes('.'));

  /** @type {{ start: number; end: number }[]} */
  const covered = [];
  for (const g of globals) {
    const hasKids = children.some((c) => c.name.startsWith(`${g.name}.`));
    if (!hasKids) covered.push({ start: g.start, end: g.end });
  }
  for (const c of children) covered.push({ start: c.start, end: c.end });

  const gaps = unknownGapsInCapture(memory, covered);

  /** @type {SymbolTreeNode[]} */
  const nodes = [];

  /**
   * @param {SymbolInterval | { name: string; start: number; end: number; unknown?: boolean }} slot
   * @param {{ depth: number; parentId: string | null; container: boolean; unknown?: boolean; label?: string }} meta
   */
  const pushLeaf = (slot, meta) => {
    const fullHex = meta.unknown ? '' : readHexRange(memory, slot.start, slot.end);
    const { display } = truncateHex(fullHex);
    const len = slot.end - slot.start;
    const id = meta.unknown ? `unknown-${slot.start}` : safeId(slot.name);
    const label =
      meta.label || ('name' in slot ? childLabel(/** @type {SymbolInterval} */ (slot)) : slot.name);
    const intervalType =
      'typeLabel' in slot && !meta.unknown ? /** @type {SymbolInterval} */ (slot).typeLabel : '';
    const pill = typePillLabel(intervalType, Boolean(meta.unknown), label);
    nodes.push({
      id,
      label,
      depth: meta.depth,
      parentId: meta.parentId,
      container: false,
      unknown: Boolean(meta.unknown),
      start: slot.start,
      end: slot.end,
      length: len,
      fullHex,
      displayHex: meta.unknown ? '' : display,
      tooltipHex: fullHex ? formatTooltipHex(fullHex) : '',
      typeLabel: pill || undefined,
    });
  };

  /** @type {{ kind: 'global'; g: SymbolInterval } | { kind: 'unknown'; start: number; end: number }}[]} */
  const roots = [];
  for (const g of globals) roots.push({ kind: 'global', g });
  for (const u of gaps) roots.push({ kind: 'unknown', start: u.start, end: u.end });
  roots.sort((a, b) => {
    const sa = a.kind === 'global' ? a.g.start : a.start;
    const sb = b.kind === 'global' ? b.g.start : b.start;
    return sa - sb;
  });

  for (const root of roots) {
    if (root.kind === 'unknown') {
      pushLeaf(
        { name: '<unknown>', start: root.start, end: root.end },
        { depth: 0, parentId: null, container: false, unknown: true, label: '<unknown>' },
      );
      continue;
    }
    const g = root.g;
    const kids = children
      .filter((c) => c.name.startsWith(`${g.name}.`))
      .sort((a, b) => a.start - b.start || a.name.localeCompare(b.name));

    if (kids.length === 0) {
      pushLeaf(g, { depth: 0, parentId: null, container: false, label: g.name });
      continue;
    }

    const parentId = safeId(g.name);
    const aggParts = [];
    for (const k of kids) {
      const h = readHexRange(memory, k.start, k.end);
      if (h) aggParts.push(h);
    }
    const fullHex = aggParts.join(' ');
    const { display } = truncateHex(fullHex);
    const len = g.end - g.start;

    const parentType = typePillLabel(g.typeLabel, false, g.name);
    nodes.push({
      id: parentId,
      label: g.name,
      depth: 0,
      parentId: null,
      container: true,
      unknown: false,
      start: g.start,
      end: g.end,
      length: len,
      fullHex,
      displayHex: display,
      tooltipHex: fullHex ? formatTooltipHex(fullHex) : '',
      typeLabel: parentType || undefined,
    });

    for (const k of kids) {
      pushLeaf(k, { depth: 1, parentId, container: false, label: childLabel(k) });
    }
  }

  return nodes;
}

module.exports = {
  buildSymbolTreeModel,
  formatLenHex,
  lenTooltip,
  readHexRange,
  truncateHex,
  unknownGapsInCapture,
  DISPLAY_HEX_CAP,
};