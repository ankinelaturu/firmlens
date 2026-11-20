/**
 * @fileoverview Read DWARF attribute forms and skip DIEs.
 */

const { readUleb128, readSleb128 } = require('./leb128');
const C = require('./constants');

/**
 * @param {Buffer} buf
 * @param {number} off
 * @param {number} form
 * @param {number} addrSize
 * @param {Buffer|undefined} debugStr
 * @param {boolean} littleEndian
 */
function readAttribute(buf, off, form, addrSize, debugStr, littleEndian) {
  const u16 = littleEndian
    ? (o) => buf[o] | (buf[o + 1] << 8)
    : (o) => (buf[o] << 8) | buf[o + 1];
  const u32 = littleEndian
    ? (o) => (buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16) | (buf[o + 3] << 24)) >>> 0
    : (o) =>
        (((buf[o] << 24) | (buf[o + 1] << 16) | (buf[o + 2] << 8) | buf[o + 3]) >>> 0);

  let p = off;
  switch (form) {
    case C.DW_FORM_addr: {
      const size = addrSize;
      let val = 0;
      if (size === 4) val = u32(p);
      else {
        val = Number(u32(p)) + Number(u32(p + 4)) * 0x100000000;
      }
      return { value: val, next: p + size };
    }
    case 0x0b: // DW_FORM_data1
      return { value: buf[p], next: p + 1 };
    case 0x0c:
      return { value: buf[p] !== 0, next: p + 1 }; // DW_FORM_flag
    case C.DW_FORM_flag:
      return { value: buf[p] !== 0, next: p + 1 };
    case C.DW_FORM_data2:
      return { value: u16(p), next: p + 2 };
    case C.DW_FORM_data4:
      return { value: u32(p), next: p + 4 };
    case C.DW_FORM_data8:
      return { value: u32(p) + u32(p + 4) * 0x100000000, next: p + 8 };
    case C.DW_FORM_udata: {
      const r = readUleb128(buf, p);
      return { value: r.value, next: r.next };
    }
    case 0x10: {
      const size = addrSize;
      let val = 0;
      if (size === 4) val = u32(p);
      else {
        val = Number(u32(p)) + Number(u32(p + 4)) * 0x100000000;
      }
      return { value: val, next: p + size, isRef: true };
    }
    case 0x11:
      return { value: buf[p], next: p + 1, isRef: true };
    case 0x14:
      return { value: u32(p) + u32(p + 4) * 0x100000000, next: p + 8, isRef: true };
    case 0x15: {
      const r = readUleb128(buf, p);
      return { value: r.value, next: r.next, isRef: true };
    }
    case C.DW_FORM_ref4: {
      const ref = u32(p);
      return { value: ref, next: p + 4, isRef: true };
    }
    case C.DW_FORM_ref_udata: {
      const r = readUleb128(buf, p);
      return { value: r.value, next: r.next, isRef: true };
    }
    case C.DW_FORM_string: {
      let end = p;
      while (end < buf.length && buf[end] !== 0) end += 1;
      const s = buf.toString('utf8', p, end);
      return { value: s, next: Math.min(end + 1, buf.length) };
    }
    case C.DW_FORM_strp:
      return { value: readStrp(buf, p, u32, debugStr), next: p + 4 };
    case C.DW_FORM_block2: {
      const len = u16(p);
      return { value: buf.subarray(p + 2, p + 2 + len), next: p + 2 + len };
    }
    case C.DW_FORM_block4: {
      const len = u32(p);
      return { value: buf.subarray(p + 4, p + 4 + len), next: p + 4 + len };
    }
    case C.DW_FORM_block1: {
      const len = buf[p];
      return { value: buf.subarray(p + 1, p + 1 + len), next: p + 1 + len };
    }
    case C.DW_FORM_block: {
      const len = readUleb128(buf, p);
      return { value: buf.subarray(len.next, len.next + len.value), next: len.next + len.value };
    }
    case C.DW_FORM_exprloc: {
      const len = readUleb128(buf, p);
      return { value: buf.subarray(len.next, len.next + len.value), next: len.next + len.value };
    }
    case C.DW_FORM_sec_offset:
      return { value: u32(p), next: p + 4 };
    case 0x1a: // DW_FORM_strx (Dwarf5) — treat like strp for now
      return { value: readStrp(buf, p, u32, debugStr), next: p + 4 };
    case 0x19: // DW_FORM_flag_present
      return { value: true, next: p };
    default:
      throw new Error(`Unsupported DW_FORM 0x${form.toString(16)}`);
  }
}

/**
 * @param {Buffer} buf
 * @param {number} off
 * @param {Function} u32
 * @param {Buffer|undefined} debugStr
 */
function readStrp(buf, off, u32, debugStr) {
  const rel = u32(off);
  if (!debugStr) {
    return `strp:${rel}`;
  }
  if (rel < 0 || rel >= debugStr.length) {
    return `strp:${rel}`;
  }
  let end = rel;
  while (end < debugStr.length && debugStr[end] !== 0) end += 1;
  return debugStr.toString('utf8', rel, end);
}

/**
 * @param {Buffer|Uint8Array} block
 * @param {number} addrSize
 * @param {boolean} le
 */
function locationFromBlock(block, addrSize, le) {
  if (!block || block.length === 0) {
    return null;
  }
  if (block[0] === C.DW_OP_addr) {
    const u32 = le
      ? (o) => block[o] | (block[o + 1] << 8) | (block[o + 2] << 16) | (block[o + 3] << 24)
      : (o) => (block[o] << 24) | (block[o + 1] << 16) | (block[o + 2] << 8) | block[o + 3];
    if (addrSize === 4 && block.length >= 5) {
      return u32(1) >>> 0;
    }
  }
  return null;
}

module.exports = {
  readAttribute,
  locationFromBlock,
};