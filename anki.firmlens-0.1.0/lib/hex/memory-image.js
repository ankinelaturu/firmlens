/**
 * @fileoverview Contiguous 16-byte memory rows from HexMemory for the image tab.
 */

const { byteColorClass } = require('./record-decode');

const ROW_BYTES = 16;

/**
 * @typedef {import('./hex-memory').HexMemory} HexMemory
 * @typedef {object} ImageByteCell
 * @property {number} address
 * @property {string} text
 * @property {string} style
 * @property {boolean} available
 */

/**
 * @typedef {object} ImageRow
 * @property {number} address
 * @property {string} addressText
 * @property {ImageByteCell[]} bytes
 */

/**
 * @typedef {object} ImageRegion
 * @property {number} linearBase
 * @property {string} title
 * @property {number} minAddr
 * @property {number} maxAddr
 * @property {ImageRow[]} rows
 */

/**
 * @param {number} n
 */
function hexAddr32(n) {
  return `0x${n.toString(16).toUpperCase().padStart(8, '0')}`;
}

/**
 * @param {number} n
 */
function hexPad2(n) {
  return n.toString(16).toUpperCase().padStart(2, '0');
}

/**
 * @param {HexMemory} memory
 * @returns {ImageRegion[]}
 */
function buildMemoryImage(memory) {
  const addrs = memory.definedAddresses();
  if (addrs.length === 0) return [];

  /** @type {Map<number, { min: number, max: number }>} */
  const byPage = new Map();
  for (const a of addrs) {
    const page = (a >> 16) << 16;
    const bucket = byPage.get(page) || { min: a, max: a };
    bucket.min = Math.min(bucket.min, a);
    bucket.max = Math.max(bucket.max, a);
    byPage.set(page, bucket);
  }

  /** @type {ImageRegion[]} */
  const regions = [];
  for (const linearBase of [...byPage.keys()].sort((a, b) => a - b)) {
    const span = byPage.get(linearBase);
    if (!span) continue;
    const rowStart = span.min & ~0xf;
    const rowEnd = (span.max + 15) & ~0xf;
    /** @type {ImageRow[]} */
    const rows = [];
    for (let addr = rowStart; addr <= rowEnd; addr += ROW_BYTES) {
      const read = memory.read(addr, ROW_BYTES);
      /** @type {ImageByteCell[]} */
      const cells = [];
      for (let i = 0; i < ROW_BYTES; i += 1) {
        const a = addr + i;
        const av = read.available[i];
        const b = read.bytes[i];
        cells.push({
          address: a,
          text: av ? hexPad2(b) : '··',
          style: av ? byteColorClass(b) : 'gap',
          available: av,
        });
      }
      rows.push({
        address: addr,
        addressText: hexAddr32(addr),
        bytes: cells,
      });
    }
    regions.push({
      linearBase,
      title: `Linear address ${hexAddr32(linearBase)}`,
      minAddr: span.min,
      maxAddr: span.max,
      rows,
    });
  }
  return regions;
}

module.exports = {
  buildMemoryImage,
  ROW_BYTES,
};