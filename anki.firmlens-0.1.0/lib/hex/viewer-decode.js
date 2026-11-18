/**
 * @fileoverview Decode strings for hex viewer tooltips.
 */

const { decodeAt } = require('../decode/decode-value');
const { sniffElf } = require('../format/sniff');

/**
 * @typedef {import('./hex-memory').HexMemory} HexMemory
 * @typedef {import('../dwarf/dwarf-index').DwarfIndex} DwarfIndex
 * @typedef {import('./symbol-intervals').SymbolInterval} SymbolInterval
 */

/**
 * @param {DwarfIndex} dwarf
 * @param {string} name
 * @param {number} address
 */
function findVariable(dwarf, name, address) {
  return dwarf.variables.find((v) => v.name === name.split('.')[0] && v.address === address) || null;
}

/**
 * @param {HexMemory} memory
 * @param {DwarfIndex} dwarf
 * @param {SymbolInterval} sym
 * @param {number} byteAddress
 * @param {{ maxStructFields: number, maxReadBytes: number }} limits
 * @param {string} axfPath
 * @returns {string}
 */
function tooltipForByte(memory, dwarf, sym, byteAddress, limits, axfPath) {
  const offset = byteAddress - sym.start;
  if (offset < 0 || byteAddress >= sym.end) return '';
  const baseName = sym.name.split('.')[0];
  const global = dwarf.variables.find((v) => v.name === baseName);
  if (!global) return sym.name;

  if (sym.name.includes('.') && global.type?.kind === 'struct') {
    const member = sym.name.slice(baseName.length + 1);
    const m = global.type.members?.find((x) => x.name === member);
    if (m && sym.start === byteAddress) {
      try {
        const d = decodeAt(memory, sym.start, m.type, true, limits, /** @type {32} */ (32));
        return `${sym.name} (${sym.typeLabel})\n${d.summary}`;
      } catch {
        return `${sym.name}+0x${offset.toString(16)}`;
      }
    }
    return `${sym.name}+0x${offset.toString(16)}`;
  }

  if (sym.start === byteAddress) {
    let addressSize = /** @type {32|64} */ (32);
    try {
      const head = require('fs').readFileSync(axfPath).subarray(0, 64);
      const sniff = sniffElf(head);
      if (sniff && typeof sniff === 'object' && sniff.wordSize) {
        addressSize = /** @type {32|64} */ (sniff.wordSize === 64 ? 64 : 32);
      }
    } catch {
      /* ignore */
    }
    try {
      const d = decodeAt(memory, sym.start, global.type, true, limits, addressSize);
      const lines = d.lines.length ? `\n${d.lines.slice(0, 6).join('\n')}` : '';
      return `${sym.name} (${sym.typeLabel})\n${d.summary}${lines}`;
    } catch (err) {
      return `${sym.name}: decode error`;
    }
  }
  return `${sym.name}+0x${offset.toString(16)}`;
}

/**
 * @param {HexMemory} memory
 * @param {DwarfIndex} dwarf
 * @param {SymbolInterval[]} intervals
 * @param {number} address
 * @param {{ maxStructFields: number, maxReadBytes: number }} limits
 * @param {string} axfPath
 */
function symbolAtAddress(intervals, address) {
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

module.exports = {
  tooltipForByte,
  symbolAtAddress,
  findVariable,
};