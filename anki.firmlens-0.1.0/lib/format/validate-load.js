/**
 * @fileoverview Validate user-selected files by content before parsing.
 * @module lib/format/validate-load
 */

const { readFileHead } = require('./read-head');
const {
  sniffElf,
  sniffMemorySnapshot,
  sniffLinkerMap,
  describeUnexpectedKind,
} = require('./sniff');

/**
 * @typedef {object} ValidatedSnapshotFiles
 * @property {import('./sniff').IntelHexSniff} hex
 * @property {import('./sniff').ElfSniff} elf
 * @property {import('./sniff').MapSniff | null} map
 * @property {string[]} warnings Combined non-fatal warnings
 */

/**
 * @param {string} hexPath
 * @param {string} elfPath
 * @param {string | null} mapPath
 * @returns {ValidatedSnapshotFiles}
 */
function validateSnapshotLoad(hexPath, elfPath, mapPath) {
  /** @type {string[]} */
  const warnings = [];

  const hexHead = readFileHead(hexPath);
  const hexSniff = sniffMemorySnapshot(hexHead.buffer);
  if (!hexSniff || typeof hexSniff === 'string' || hexSniff.kind !== 'intel-hex') {
    const got = typeof hexSniff === 'string' ? hexSniff : hexSniff?.kind ?? null;
    throw new Error(
      `Memory snapshot: expected Intel HEX (:… records), got ${describeUnexpectedKind(got)}.`,
    );
  }

  const elfHead = readFileHead(elfPath, 64);
  const elfSniff = sniffElf(elfHead.buffer);
  if (!elfSniff) {
    throw new Error('Debug image: expected ELF (magic .ELF), file is not ELF.');
  }
  warnings.push(...elfSniff.warnings);

  /** @type {import('./sniff').MapSniff | null} */
  let mapSniff = null;
  if (mapPath) {
    const mapHead = readFileHead(mapPath);
    mapSniff = sniffLinkerMap(mapHead.buffer);
    warnings.push(...mapSniff.warnings);
  }

  return { hex: hexSniff, elf: elfSniff, map: mapSniff, warnings };
}

module.exports = {
  validateSnapshotLoad,
};