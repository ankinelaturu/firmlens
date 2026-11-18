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
  const hits = symbolsOverlapping(intervals, address, 1);
  if (hits.length === 0) return null;
  return hits.sort((a, b) => b.start - a.start || a.name.localeCompare(b.name))[0];
}

/**
 * Gutter label for a 16-byte row.
 * @param {SymbolInterval[]} intervals
 * @param {number} rowStart
 */
function gutterLabel(intervals, rowStart) {
  const sym = primarySymbolAt(intervals, rowStart);
  if (!sym) return { text: '', kind: 'empty' };
  if (sym.start === rowStart) return { text: sym.name, kind: 'start' };
  return { text: `│ ${sym.name}`, kind: 'cont' };
}

module.exports = {
  buildGlobalIntervals,
  symbolsOverlapping,
  primarySymbolAt,
  gutterLabel,
  typeByteSize,
  formatTypeLabel,
};