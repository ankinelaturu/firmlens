/**
 * @fileoverview Minimal ELF section loader (32/64-bit LE/BE) for debug sections.
 * @module lib/elf/sections
 */

const fs = require('fs');

/**
 * @typedef {object} ElfImage
 * @property {boolean} littleEndian
 * @property {32|64} wordSize
 * @property {number} eMachine
 * @property {Map<string, Buffer>} sections By section name.
 */

/**
 * @param {string} filePath
 * @returns {ElfImage}
 */
function loadElfSections(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 52 || buf[0] !== 0x7f) {
    throw new Error('Not an ELF file');
  }
  const eiClass = buf[4];
  const eiData = buf[5];
  const littleEndian = eiData === 1;
  const u16 = littleEndian
    ? (o) => buf[o] | (buf[o + 1] << 8)
    : (o) => (buf[o] << 8) | buf[o + 1];
  const u32 = littleEndian
    ? (o) => (buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16) | (buf[o + 3] << 24)) >>> 0
    : (o) =>
        (((buf[o] << 24) | (buf[o + 1] << 16) | (buf[o + 2] << 8) | buf[o + 3]) >>> 0);
  const u64 = littleEndian
    ? (o) => Number(u32(o)) + Number(u32(o + 4)) * 0x100000000
    : (o) => Number(u32(o + 4)) + Number(u32(o)) * 0x100000000;

  /** @type {32|64} */
  const wordSize = eiClass === 2 ? 64 : 32;
  let eShoff;
  let eShentsize;
  let eShnum;
  let eShstrndx;
  let eMachine;

  if (wordSize === 32) {
    eMachine = u16(18);
    eShoff = u32(32);
    eShentsize = u16(46);
    eShnum = u16(48);
    eShstrndx = u16(50);
  } else {
    eMachine = u16(18);
    eShoff = Number(u64(40));
    eShentsize = u16(58);
    eShnum = u16(60);
    eShstrndx = u16(62);
  }

  if (eShoff === 0 || eShnum === 0) {
    throw new Error('ELF has no section header table');
  }

  const shstrOff = wordSize === 32 ? u32(eShoff + eShstrndx * eShentsize + 16) : Number(u64(eShoff + eShstrndx * eShentsize + 24));
  const shstrSize = wordSize === 32 ? u32(eShoff + eShstrndx * eShentsize + 20) : Number(u64(eShoff + eShstrndx * eShentsize + 32));

  /** @type {Map<string, Buffer>} */
  const sections = new Map();

  for (let i = 0; i < eShnum; i += 1) {
    const base = eShoff + i * eShentsize;
    const shName = u32(base);
    const shOffset = wordSize === 32 ? u32(base + 16) : Number(u64(base + 24));
    const shSize = wordSize === 32 ? u32(base + 20) : Number(u64(base + 32));
    let nameEnd = shstrOff + shName;
    const shstrEnd = Math.min(shstrOff + shstrSize, buf.length);
    while (nameEnd < shstrEnd && buf[nameEnd] !== 0) nameEnd += 1;
    if (nameEnd >= shstrEnd) {
      continue;
    }
    const name = buf.toString('utf8', shstrOff + shName, nameEnd);
    if (!name || shSize === 0) {
      continue;
    }
    sections.set(name, buf.subarray(shOffset, shOffset + shSize));
  }

  return { littleEndian, wordSize, eMachine, sections };
}

module.exports = {
  loadElfSections,
};