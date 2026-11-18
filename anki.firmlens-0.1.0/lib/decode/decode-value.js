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
 * @param {32|64} [addressSize]
 * @returns {DecodedValue}
 */
function decodeAt(memory, address, type, littleEndian, limits, addressSize = 32) {
  /** @type {string[]} */
  const lines = [];
  const summary = decodeType(memory, address, type, littleEndian, limits, lines, 0, addressSize);
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
function decodeType(memory, address, type, le, limits, lines, depth, addressSize = 32) {
  if (!type || type.kind === 'unknown') {
  const guess = type?.byteSize || 4;
  if (guess > 0 && guess <= 8) {
      const r = memory.read(address, guess);
      if (r.available.every(Boolean)) {
        const n = readInt(r.bytes, guess, le, false);
        return typeof n === 'bigint' ? `${n}n` : String(n);
      }
    }
    return 'unavailable (type)';
  }
  if (type.kind === 'int') {
    const size = type.byteSize || 4;
    const r = memory.read(address, size);
    if (!r.available.every(Boolean)) {
      return 'unavailable (bytes)';
    }
    const n = readInt(r.bytes, size, le, Boolean(type.signed));
    return typeof n === 'bigint' ? `${n}n` : String(n);
  }
  if (type.kind === 'bool') {
    const r = memory.read(address, 1);
    if (!r.available[0]) return 'unavailable';
    const v = r.bytes[0] !== 0;
    lines.push(`value: ${v}`);
    return String(v);
  }
  if (type.kind === 'pointer') {
    const size = type.byteSize || (addressSize === 64 ? 8 : 4);
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
    decodeStructOrScalar(memory, ptr, type.pointee, le, limits, lines, depth + 1, addressSize);
    return ptrHex;
  }
  if (type.kind === 'struct') {
    decodeStructOrScalar(memory, address, type, le, limits, lines, depth, addressSize);
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
function decodeStructOrScalar(memory, address, type, le, limits, lines, depth, addressSize = 32) {
  if (type.kind !== 'struct' || !type.members) {
    lines.push(decodeType(memory, address, type, le, limits, lines, depth, addressSize));
    return;
  }
  let count = 0;
  for (const m of type.members) {
    if (count >= limits.maxStructFields) {
      lines.push('…');
      break;
    }
    const fieldAddr = address + m.offset;
    const val = decodeType(memory, fieldAddr, m.type, le, limits, lines, depth + 1, addressSize);
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
  if (size === 8) {
    let v = 0n;
    if (le) {
      for (let i = 0; i < 8; i += 1) v |= BigInt(bytes[i]) << BigInt(8 * i);
    } else {
      for (let i = 0; i < 8; i += 1) v = (v << 8n) | BigInt(bytes[i]);
    }
    if (signed) return BigInt.asIntN(64, v);
    return v;
  }
  let v = 0;
  if (le) {
    for (let i = 0; i < size; i += 1) v |= bytes[i] << (8 * i);
  } else {
    for (let i = 0; i < size; i += 1) v = (v << 8) | bytes[i];
  }
  if (signed) {
    const top = 1 << (size * 8 - 1);
    if (v & top) v -= 1 << (size * 8);
  }
  return v >>> 0;
}

module.exports = {
  decodeAt,
};