/**
 * @fileoverview Decode snapshot bytes using DWARF type description.
 */

/**
 * @typedef {import('../dwarf/dwarf-index').TypeRef} TypeRef
 * @typedef {import('../hex/hex-memory').HexMemory} HexMemory
 */

/**
 * @typedef {object} DecodedValue
 * @property {string} summary
 * @property {string[]} lines
 */

/**
 * @param {HexMemory} memory
 * @param {number} address
 * @param {TypeRef} type
 * @param {boolean} littleEndian
 * @param {{ maxStructFields: number, maxReadBytes: number }} limits
 * @returns {DecodedValue}
 */
function decodeAt(memory, address, type, littleEndian, limits) {
  /** @type {string[]} */
  const lines = [];
  const summary = decodeType(memory, address, type, littleEndian, limits, lines, 0);
  return { summary, lines };
}

/**
 * @param {HexMemory} memory
 * @param {number} address
 * @param {TypeRef} type
 * @param {boolean} le
 * @param {{ maxStructFields: number }} limits
 * @param {string[]} lines
 * @param {number} depth
 */
function decodeType(memory, address, type, le, limits, lines, depth) {
  if (!type || type.kind === 'unknown') {
    return 'unavailable (type)';
  }
  if (type.kind === 'int') {
    const size = type.byteSize || 4;
    const r = memory.read(address, size);
    if (!r.available.every(Boolean)) {
      return 'unavailable (bytes)';
    }
    const n = readInt(r.bytes, size, le, Boolean(type.signed));
    return String(n);
  }
  if (type.kind === 'bool') {
    const r = memory.read(address, 1);
    if (!r.available[0]) return 'unavailable';
    const v = r.bytes[0] !== 0;
    lines.push(`value: ${v}`);
    return String(v);
  }
  if (type.kind === 'pointer') {
    const size = type.byteSize || 4;
    const r = memory.read(address, size);
    if (!r.available.every(Boolean)) {
      return 'unavailable (bytes)';
    }
    const ptr = readInt(r.bytes, size, le, false);
    if (ptr === 0) {
      return 'NULL';
    }
    const ptrHex = `0x${ptr.toString(16)}`;
    if (depth >= 1 || !type.pointee) {
      return ptrHex;
    }
    lines.push(`address: ${ptrHex}`);
    lines.push('pointee:');
    decodeStructOrScalar(memory, ptr, type.pointee, le, limits, lines, depth + 1);
    return ptrHex;
  }
  if (type.kind === 'struct') {
    decodeStructOrScalar(memory, address, type, le, limits, lines, depth);
    return type.typeName || 'struct';
  }
  return '?';
}

/**
 * @param {HexMemory} memory
 * @param {number} address
 * @param {TypeRef} type
 * @param {boolean} le
 * @param {{ maxStructFields: number }} limits
 * @param {string[]} lines
 * @param {number} depth
 */
function decodeStructOrScalar(memory, address, type, le, limits, lines, depth) {
  if (type.kind !== 'struct' || !type.members) {
    lines.push(decodeType(memory, address, type, le, limits, lines, depth));
    return;
  }
  let count = 0;
  for (const m of type.members) {
    if (count >= limits.maxStructFields) {
      lines.push('…');
      break;
    }
    const fieldAddr = address + m.offset;
    const val = decodeType(memory, fieldAddr, m.type, le, limits, lines, depth + 1);
    if (val === 'unavailable (bytes)') {
      lines.push(`${m.name}: unavailable`);
    } else {
      lines.push(`${m.name}: ${val}`);
    }
    count += 1;
  }
}

/**
 * @param {Uint8Array} bytes
 * @param {number} size
 * @param {boolean} le
 * @param {boolean} signed
 */
function readInt(bytes, size, le, signed) {
  let v = 0;
  if (le) {
    for (let i = 0; i < size; i += 1) v |= bytes[i] << (8 * i);
  } else {
    for (let i = 0; i < size; i += 1) v = (v << 8) | bytes[i];
  }
  if (signed && size <= 4) {
    const top = 1 << (size * 8 - 1);
    if (v & top) v -= 1 << (size * 8);
  }
  if (size === 8 && signed) {
    return BigInt.asIntN(64, BigInt(v));
  }
  return v >>> 0 === v ? v : v;
}

module.exports = {
  decodeAt,
};