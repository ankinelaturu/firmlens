/**
 * @fileoverview Scan DWARF compile-unit versions in .debug_info (no full index).
 */

/**
 * @param {Buffer} info
 * @returns {number[]}
 */
function scanDwarfCompileUnitVersions(info) {
  /** @type {number[]} */
  const versions = [];
  let cuOff = 0;
  let guard = 0;
  while (cuOff + 11 <= info.length && guard < 512) {
    guard += 1;
    const unitLength = info.readUInt32LE(cuOff);
    if (unitLength === 0) {
      break;
    }
    if (cuOff + 4 + unitLength > info.length) {
      break;
    }
    const version = info.readUInt16LE(cuOff + 4);
    versions.push(version);
    cuOff += 4 + unitLength;
  }
  return versions;
}

/**
 * @param {number[]} versions
 */
function summarizeDwarfVersions(versions) {
  /** @type {Map<number, number>} */
  const counts = new Map();
  for (const v of versions) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  const parts = [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([v, n]) => (n > 1 ? `DWARF ${v} (×${n})` : `DWARF ${v}`));
  return {
    compileUnitCount: versions.length,
    versionCounts: Object.fromEntries(counts),
    label: parts.join(', ') || 'none',
  };
}

module.exports = {
  scanDwarfCompileUnitVersions,
  summarizeDwarfVersions,
};