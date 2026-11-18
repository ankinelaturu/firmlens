/**
 * @fileoverview ULEB128 / SLEB128 readers.
 */

/**
 * @param {Buffer} buf
 * @param {number} off
 */
function readUleb128(buf, off) {
  let result = 0;
  let shift = 0;
  let pos = off;
  while (pos < buf.length) {
    const byte = buf[pos++];
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      return { value: result >>> 0, next: pos };
    }
    shift += 7;
    if (shift > 35) {
      throw new Error('ULEB128 too long');
    }
  }
  throw new Error('ULEB128 truncated');
}

/**
 * @param {Buffer} buf
 * @param {number} off
 */
function readSleb128(buf, off) {
  let result = 0;
  let shift = 0;
  let pos = off;
  let byte = 0;
  while (pos < buf.length) {
    byte = buf[pos++];
    result |= (byte & 0x7f) << shift;
    shift += 7;
    if ((byte & 0x80) === 0) {
      break;
    }
    if (shift > 35) {
      throw new Error('SLEB128 too long');
    }
  }
  if (shift < 32 && (byte & 0x40)) {
    result |= - (1 << shift);
  }
  return { value: result, next: pos };
}

module.exports = {
  readUleb128,
  readSleb128,
};