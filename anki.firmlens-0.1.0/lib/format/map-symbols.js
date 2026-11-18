/**
 * @fileoverview Parse GNU ld map symbol addresses for optional corroboration.
 */

const fs = require('fs');

/**
 * @typedef {Map<string, number>} MapSymbolTable name -> address
 */

/**
 * @param {string} mapPath
 * @returns {MapSymbolTable}
 */
function loadGnuMapSymbols(mapPath) {
  const text = fs.readFileSync(mapPath, 'utf8');
  /** @type {MapSymbolTable} */
  const table = new Map();
  const lineRe = /^\s*(?:0x)?([0-9a-fA-F]+)\s+(?:0x)?[0-9a-fA-F]+\s+\S+\s+\S+\s+([A-Za-z_]\w*)\s*$/gm;
  const lineReSimple = /^\s*(0x[0-9a-fA-F]+)\s+([A-Za-z_]\w*)\s*$/gm;
  let m;
  while ((m = lineRe.exec(text))) {
    table.set(m[2], parseInt(m[1], 16));
  }
  while ((m = lineReSimple.exec(text))) {
    if (!table.has(m[2])) table.set(m[2], parseInt(m[1], 16));
  }
  return table;
}

/**
 * @param {import('../dwarf/dwarf-index').DwarfIndex} dwarf
 * @param {MapSymbolTable | null} mapSyms
 */
function mapCorroborationWarnings(dwarf, mapSyms) {
  /** @type {string[]} */
  const w = [];
  if (!mapSyms || mapSyms.size === 0) return w;
  const nameCounts = new Map();
  for (const v of dwarf.variables) {
    nameCounts.set(v.name, (nameCounts.get(v.name) || 0) + 1);
  }
  for (const v of dwarf.variables) {
    if ((nameCounts.get(v.name) || 0) > 1) continue;
    const mapAddr = mapSyms.get(v.name);
    if (mapAddr == null) continue;
    if (mapAddr !== v.address) {
      w.push(
        `MAP address for ${v.name} (0x${mapAddr.toString(16)}) differs from DWARF (0x${v.address.toString(16)}).`,
      );
    }
  }
  return w;
}

module.exports = {
  loadGnuMapSymbols,
  mapCorroborationWarnings,
};