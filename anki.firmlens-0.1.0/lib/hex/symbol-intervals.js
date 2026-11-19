/**
 * @fileoverview DWARF globals as address intervals for the hex image map.
 */

/**
 * @typedef {import('../dwarf/dwarf-index').DwarfIndex} DwarfIndex
 * @typedef {import('../dwarf/dwarf-index').TypeRef} TypeRef
 */

/**
 * @typedef {object} SymbolInterval
 * @property {string} name
 * @property {number} start
 * @property {number} end
 * @property {string} typeLabel
 * @property {number} declLine
 * @property {string} declFile
 */

/**
 * @param {TypeRef | undefined} type
 */
function typeByteSize(type) {
  if (!type) return 4;
  if (type.byteSize && type.byteSize > 0) return type.byteSize;
  if (type.kind === 'bool') return 1;
  if (type.kind === 'pointer') return type.byteSize || 4;
  if (type.kind === 'struct' && type.members?.length) {
    let maxEnd = 0;
    for (const m of type.members) {
      const sz = typeByteSize(m.type);
      maxEnd = Math.max(maxEnd, m.offset + sz);
    }
    return maxEnd || 4;
  }
  return 4;
}

/**
 * @param {import('../dwarf/dwarf-index').DwarfVariable} v
 * @returns {string}
 */
function formatTypeLabel(v) {
  const t = v.type;
  if (!t) return 'unknown';
  if (t.typeName) return t.typeName;
  if (t.kind === 'pointer' && t.pointee?.typeName) return `${t.pointee.typeName} *`;
  return t.kind;
}

/**
 * Build top-level global intervals (struct members in a later pass).
 * @param {DwarfIndex | null} dwarf
 * @returns {SymbolInterval[]}
 */
function buildGlobalIntervals(dwarf) {
  if (!dwarf?.variables?.length) return [];
  /** @type {SymbolInterval[]} */
  const out = [];
  for (const v of dwarf.variables) {
    const size = typeByteSize(v.type);
    out.push({
      name: v.name,
      start: v.address,
      end: v.address + size,
      typeLabel: formatTypeLabel(v),
      declLine: v.declLine,
      declFile: v.declFile,
    });
  }
  out.sort((a, b) => a.start - b.start || a.name.localeCompare(b.name));
  return out;
}

/**
 * Globals plus flattened struct members.
 * @param {DwarfIndex | null} dwarf
 * @returns {SymbolInterval[]}
 */
/**
 * @param {SymbolInterval} sym
 */
function isPaddingInterval(sym) {
  return sym.typeLabel === 'padding';
}

/**
 * @param {SymbolInterval} sym
 */
function paddingParentName(sym) {
  const mark = '.(padding)';
  const i = sym.name.indexOf(mark);
  if (i >= 0) return sym.name.slice(0, i);
  return sym.name.split('.')[0];
}

/**
 * Compiler layout gaps inside struct globals (tail + between members).
 * @param {DwarfIndex | null} dwarf
 * @returns {SymbolInterval[]}
 */
function buildStructPaddingIntervals(dwarf) {
  if (!dwarf?.variables?.length) return [];
  /** @type {SymbolInterval[]} */
  const out = [];
  for (const v of dwarf.variables) {
    if (v.type?.kind !== 'struct' || !v.type.byteSize) continue;
    const structSize = v.type.byteSize;
    const members = [...(v.type.members || [])].sort((a, b) => a.offset - b.offset);
    let cursor = 0;
    let gapIndex = 0;
    const pushGap = (lo, hi) => {
      if (hi <= lo) return;
      gapIndex += 1;
      const suffix = gapIndex > 1 ? String(gapIndex) : '';
      out.push({
        name: `${v.name}.(padding)${suffix}`,
        start: v.address + lo,
        end: v.address + hi,
        typeLabel: 'padding',
        declLine: v.declLine,
        declFile: v.declFile,
      });
    };
    for (const m of members) {
      const sz = typeByteSize(m.type);
      if (m.offset > cursor) pushGap(cursor, m.offset);
      cursor = Math.max(cursor, m.offset + sz);
    }
    if (cursor < structSize) pushGap(cursor, structSize);
  }
  return out;
}

function buildAllIntervals(dwarf) {
  if (!dwarf?.variables?.length) return [];
  const out = buildGlobalIntervals(dwarf);
  /** @type {SymbolInterval[]} */
  const members = [];
  for (const v of dwarf.variables) {
    if (v.type?.kind !== 'struct' || !v.type.members?.length) continue;
    for (const m of v.type.members) {
      const sz = typeByteSize(m.type);
      members.push({
        name: `${v.name}.${m.name}`,
        start: v.address + m.offset,
        end: v.address + m.offset + sz,
        typeLabel: m.type.typeName || m.type.kind,
        declLine: v.declLine,
        declFile: v.declFile,
      });
    }
  }
  const padding = buildStructPaddingIntervals(dwarf);
  return [...out, ...members, ...padding].sort((a, b) => a.start - b.start || a.name.localeCompare(b.name));
}

/**
 * Intervals that overlap [address, address+length).
 * @param {SymbolInterval[]} intervals
 * @param {number} address
 * @param {number} length
 */
function symbolsOverlapping(intervals, address, length = 1) {
  const end = address + length;
  /** @type {SymbolInterval[]} */
  const hits = [];
  for (const s of intervals) {
    if (s.end <= address) continue;
    if (s.start >= end) break;
    hits.push(s);
  }
  return hits;
}

/**
 * Primary symbol at exact address (start of row).
 * @param {SymbolInterval[]} intervals
 * @param {number} address
 */
function primarySymbolAt(intervals, address) {
  /** @type {SymbolInterval | null} */
  let best = null;
  let bestSize = Number.POSITIVE_INFINITY;
  for (const s of intervals) {
    if (address < s.start || address >= s.end) continue;
    const size = s.end - s.start;
    if (size <= bestSize) {
      best = s;
      bestSize = size;
    }
  }
  return best;
}

/**
 * Gutter label for a 16-byte row.
 * @param {SymbolInterval[]} intervals
 * @param {number} rowStart
 */
function gutterLabel(intervals, rowStart) {
  const sym = primarySymbolAt(intervals, rowStart);
  if (!sym) return { text: '', kind: 'empty' };
  const label = isPaddingInterval(sym) ? '(padding)' : sym.name;
  if (sym.start === rowStart) return { text: label, kind: 'start' };
  return { text: `│ ${label}`, kind: 'cont' };
}

module.exports = {
  buildGlobalIntervals,
  buildStructPaddingIntervals,
  buildAllIntervals,
  symbolsOverlapping,
  primarySymbolAt,
  gutterLabel,
  typeByteSize,
  formatTypeLabel,
  isPaddingInterval,
  paddingParentName,
};