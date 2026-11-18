/**
 * @fileoverview Read pointer-sized addresses from snapshot memory.
 */

/**
 * @param {import('../hex/hex-memory').HexMemory} memory
 * @param {number} address
 * @param {32|64} addressSize
 * @param {boolean} littleEndian
 * @returns {number | null}
 */
function readPointerAt(memory, address, addressSize, littleEndian) {
  const size = addressSize === 64 ? 8 : 4;
  const r = memory.read(address, size);
  if (!r.available.every(Boolean)) return null;
  let v = 0;
  if (littleEndian) {
    for (let i = 0; i < size; i += 1) v |= r.bytes[i] << (8 * i);
  } else {
    for (let i = 0; i < size; i += 1) v = (v << 8) | r.bytes[i];
  }
  return v >>> 0;
}

module.exports = {
  readPointerAt,
};