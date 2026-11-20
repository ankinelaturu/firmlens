/**
 * @fileoverview Read pointer storage from snapshot memory for symbol navigation.
 */

/**
 * @typedef {import('./hex-memory').HexMemory} HexMemory
 */

/**
 * @param {string} typeLabel
 */
function isPointerTypeLabel(typeLabel) {
  const t = String(typeLabel || '').trim();
  return t.endsWith('*') || t.endsWith(' *');
}

/**
 * @param {Uint8Array} bytes
 * @param {number} size
 */
function readPtrLe(bytes, size) {
  let v = 0;
  for (let i = 0; i < size; i += 1) {
    v |= bytes[i] << (8 * i);
  }
  return v >>> 0;
}

/**
 * @param {HexMemory} memory
 * @param {number} start
 * @param {number} end
 * @param {string} typeLabel
 * @returns {number | null} target address or null
 */
function readPointerTarget(memory, start, end, typeLabel) {
  if (!isPointerTypeLabel(typeLabel)) return null;
  const size = end - start;
  if (size !== 4 && size !== 8) return null;
  const r = memory.read(start, size);
  if (!r.available.every(Boolean)) return null;
  const ptr = size === 8 ? Number(readPtrLe(r.bytes, 8) & 0xffffffffn) : readPtrLe(r.bytes, 4);
  if (ptr === 0) return null;
  const probe = memory.read(ptr, 1);
  if (!probe.available[0]) return null;
  return ptr;
}

/**
 * @param {number} addr
 */
function formatGotoAddress(addr) {
  return `0x${(addr >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

module.exports = {
  isPointerTypeLabel,
  readPointerTarget,
  formatGotoAddress,
};