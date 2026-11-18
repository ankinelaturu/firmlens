/**
 * @fileoverview Resolve struct member hover via base variable + DWARF layout.
 */

const { decodeAt } = require('../decode/decode-value');
const { readPointerAt } = require('../decode/pointer');

/**
 * @param {import('../hex/hex-memory').HexMemory} memory
 * @param {import('../dwarf/dwarf-index').DwarfVariable} variable
 * @param {string} memberName
 * @param {boolean} littleEndian
 * @param {32|64} addressSize
 */
function resolveStructType(variable, op) {
  const t = variable.type;
  if (op === '.' && t.kind === 'struct') return t;
  if (op === '->' && t.kind === 'pointer' && t.pointee?.kind === 'struct') return t.pointee;
  return null;
}

/**
 * @param {import('../hex/hex-memory').HexMemory} memory
 * @param {import('../dwarf/dwarf-index').DwarfVariable} variable
 * @param {string} memberName
 * @param {boolean} littleEndian
 * @param {32|64} addressSize
 * @param {{ maxStructFields: number, maxReadBytes: number }} limits
 * @returns {{ address: number, memberType: import('../dwarf/dwarf-index').TypeRef, structAddr: number } | { reason: string }}
 */
function resolveMember(memory, variable, memberName, op, littleEndian, addressSize, limits) {
  const st = resolveStructType(variable, op);
  if (!st || !st.members) {
    return { reason: 'Member access requires a struct or pointer-to-struct base.' };
  }
  const member = st.members.find((m) => m.name === memberName);
  if (!member) {
    return { reason: `No struct member "${memberName}" in debug info.` };
  }

  let structAddr = variable.address;
  if (op === '->') {
    if (variable.type.kind !== 'pointer') {
      return { reason: '-> used on non-pointer.' };
    }
    const ptr = readPointerAt(memory, variable.address, addressSize, littleEndian);
    if (ptr == null) {
      return { reason: 'Pointer bytes unavailable.' };
    }
    if (ptr === 0) {
      return { reason: 'NULL pointer — no pointee field.' };
    }
    structAddr = ptr;
  }

  return {
    address: structAddr + member.offset,
    memberType: member.type,
    structAddr,
  };
}

/**
 * @param {import('../hex/hex-memory').HexMemory} memory
 * @param {number} address
 * @param {import('../dwarf/dwarf-index').TypeRef} type
 * @param {boolean} littleEndian
 * @param {{ maxStructFields: number, maxReadBytes: number }} limits
 */
function decodeMemberValue(memory, address, type, littleEndian, limits) {
  return decodeAt(memory, address, type, littleEndian, limits);
}

module.exports = {
  resolveMember,
  decodeMemberValue,
};