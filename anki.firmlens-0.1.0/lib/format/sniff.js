/**
 * @fileoverview Content-based detection for snapshot / debug / map inputs (vendor-neutral).
 * @module lib/format/sniff
 */

const ELF_MAGIC = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);

const ET_NONE = 0;
const ET_REL = 1;
const ET_EXEC = 2;
const ET_DYN = 3;

const EI_CLASS = 4;
const EI_DATA = 5;
const ELFCLASS32 = 1;
const ELFCLASS64 = 2;
const ELFDATA2LSB = 1;
const ELFDATA2MSB = 2;

const EM_ARM = 40;
const EM_NONE = 0;

/**
 * @typedef {'intel-hex'|'elf'|'map-keil'|'map-gnu'|'map-unknown'|'s-record'|'unknown'} SniffedKind
 */

/**
 * @typedef {object} ElfSniff
 * @property {'elf'} kind
 * @property {32|64} wordSize
 * @property {'le'|'be'} endian
 * @property {number} eType ET_* from ELF header
 * @property {number} eMachine EM_* from ELF header
 * @property {string[]} warnings Non-fatal notes for the user
 */

/**
 * @typedef {object} IntelHexSniff
 * @property {'intel-hex'} kind
 */

/**
 * @typedef {object} MapSniff
 * @property {'map-keil'|'map-gnu'|'map-unknown'} kind
 * @property {string[]} warnings
 */

/**
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function isElfMagic(buffer) {
  return buffer.length >= 4 && buffer.subarray(0, 4).equals(ELF_MAGIC);
}

/**
 * @param {Buffer} buffer
 * @returns {ElfSniff | null}
 */
function sniffElf(buffer) {
  if (!isElfMagic(buffer)) {
    return null;
  }
  if (buffer.length < 20) {
    throw new Error('ELF: file too small for header');
  }

  const elfClass = buffer[EI_CLASS];
  /** @type {32|64} */
  let wordSize = 32;
  if (elfClass === ELFCLASS64) {
    wordSize = 64;
  } else if (elfClass !== ELFCLASS32) {
    throw new Error(`ELF: unsupported EI_CLASS ${elfClass}`);
  }

  const dataEncoding = buffer[EI_DATA];
  /** @type {'le'|'be'} */
  const endian = dataEncoding === ELFDATA2LSB ? 'le' : dataEncoding === ELFDATA2MSB ? 'be' : 'le';
  if (dataEncoding !== ELFDATA2LSB && dataEncoding !== ELFDATA2MSB) {
    throw new Error(`ELF: unsupported EI_DATA ${dataEncoding}`);
  }

  const readU16 = endian === 'le'
    ? (off) => buffer[off] | (buffer[off + 1] << 8)
    : (off) => (buffer[off] << 8) | buffer[off + 1];

  const eType = readU16(16);
  const eMachine = readU16(18);

  /** @type {string[]} */
  const warnings = [];

  if (eType === ET_REL) {
    warnings.push(
      'ELF is relocatable (object file), not a linked executable. DWARF addresses may be wrong until linked.',
    );
  } else if (eType === ET_NONE) {
    warnings.push('ELF type is ET_NONE.');
  } else if (eType !== ET_EXEC && eType !== ET_DYN) {
    warnings.push(`Unusual ELF e_type ${eType}.`);
  }

  const EM_386 = 3;
  if (eMachine !== EM_ARM && eMachine !== EM_NONE && eMachine !== EM_386) {
    warnings.push(`ELF machine is 0x${eMachine.toString(16)} (not ARM/x86).`);
  }

  if (wordSize !== 32) {
    warnings.push(`ELF is ${wordSize}-bit; initial FirmLens target is 32-bit ARM.`);
  }

  if (endian !== 'le') {
    warnings.push('ELF is big-endian; most Cortex builds are little-endian.');
  }

  return { kind: 'elf', wordSize, endian, eType, eMachine, warnings };
}

/**
 * @param {Buffer} buffer
 * @returns {IntelHexSniff | SniffedKind | null}
 */
function sniffMemorySnapshot(buffer) {
  if (isElfMagic(buffer)) {
    return 'elf';
  }
  if (buffer.length > 0 && buffer[0] === 0x53 /* S */ && buffer[1] >= 0x30 && buffer[1] <= 0x33) {
    return 's-record';
  }

  const text = buffer.toString('utf8');
  const trimmed = text.trimStart();
  if (!trimmed.startsWith(':')) {
    return null;
  }

  const line = trimmed.split(/\r?\n/).find((l) => l.length > 0);
  if (!line || !/^:[0-9A-Fa-f]{2}[0-9A-Fa-f]{4}[0-9A-Fa-f]{2}/.test(line)) {
    return null;
  }

  let sawData = false;
  for (const raw of trimmed.split(/\r?\n/)) {
    const l = raw.trim();
    if (!l.startsWith(':')) {
      continue;
    }
    if (l.length < 11) {
      return null;
    }
    const type = parseInt(l.slice(7, 9), 16);
    if (type === 0x00 || type === 0x02 || type === 0x04) {
      sawData = true;
    }
  }

  if (!sawData) {
    return null;
  }

  return { kind: 'intel-hex' };
}

/**
 * @param {Buffer} buffer
 * @returns {MapSniff}
 */
function sniffLinkerMap(buffer) {
  const text = buffer.toString('utf8');

  if (isElfMagic(buffer)) {
    return {
      kind: 'map-unknown',
      warnings: ['File looks like ELF, not a linker map.'],
    };
  }

  if (text.trimStart().startsWith(':')) {
    return {
      kind: 'map-unknown',
      warnings: ['File looks like Intel HEX, not a linker map.'],
    };
  }

  const head = text.slice(0, 4096);

  if (/Component:\s*ARM Compiler/i.test(head) || /Memory Map of the image/i.test(head)) {
    return { kind: 'map-keil', warnings: [] };
  }

  if (
    /Linker script and memory map/i.test(head) ||
    /Memory Configuration/i.test(head) ||
    /\bVMA\b.*\bLMA\b.*\bOut\b/i.test(head)
  ) {
    return { kind: 'map-gnu', warnings: [] };
  }

  return {
    kind: 'map-unknown',
    warnings: ['Unrecognized map format; optional corroboration only.'],
  };
}

/**
 * Human label for load errors.
 *
 * @param {SniffedKind | null} kind
 */
function describeUnexpectedKind(kind) {
  if (kind === 'elf') {
    return 'an ELF binary (expected Intel HEX text)';
  }
  if (kind === 's-record') {
    return 'Motorola S-record (expected Intel HEX)';
  }
  if (kind === null || kind === 'unknown') {
    return 'an unrecognized format';
  }
  return kind;
}

module.exports = {
  sniffElf,
  sniffMemorySnapshot,
  sniffLinkerMap,
  describeUnexpectedKind,
  isElfMagic,
  ET_REL,
  ET_EXEC,
  EM_ARM,
};