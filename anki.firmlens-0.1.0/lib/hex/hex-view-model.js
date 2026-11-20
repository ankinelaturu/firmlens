/**
 * @fileoverview Intel HEX text → view model for the FirmLens hex viewer.
 */

const { decodeRecordLine, hexRecordTypeLabel, byteColorClass } = require('./record-decode');
const { isIntelHexCommentLine } = require('./hex-lines');

/**
 * @typedef {object} HexViewByteCell
 * @property {string} text
 * @property {string} style
 */

/**
 * @typedef {object} HexViewRecordRow
 * @property {number} lineNo
 * @property {string} ll
 * @property {string} addr
 * @property {string} typ
 * @property {string} typLabel
 * @property {string | null} loadAddr
 * @property {HexViewByteCell[]} dataCells
 * @property {string} chk
 * @property {boolean} chkOk
 * @property {boolean} isData
 */

/**
 * @typedef {object} HexViewSection
 * @property {string} id
 * @property {string} title
 * @property {string} subtitle
 * @property {boolean} expanded
 * @property {HexViewRecordRow[]} rows
 */

/**
 * @typedef {object} HexViewModel
 * @property {number} totalLines
 * @property {number} dataByteCount
 * @property {HexViewSection[]} sections
 * @property {string[]} warnings
 */

/**
 * @param {number} n
 * @param {number} [width]
 */
function hexPad(n, width = 2) {
  return n.toString(16).toUpperCase().padStart(width, '0');
}

/**
 * @param {number} n
 */
function hexAddr32(n) {
  return `0x${n.toString(16).toUpperCase().padStart(8, '0')}`;
}

/**
 * @param {Map<string, HexViewSection>} sectionMap
 * @param {'linear' | 'segment' | 'default'} kind
 * @param {number} base
 * @returns {HexViewSection}
 */
function sectionFor(sectionMap, kind, base) {
  const key = `${kind}:${base}`;
  let sec = sectionMap.get(key);
  if (!sec) {
    const title =
      kind === 'linear'
        ? `Linear address ${hexAddr32(base)}`
        : kind === 'segment'
          ? `Segment ${hexPad(base >> 8, 2)}${hexPad(base & 0xff, 2)}`
          : 'Records';
    sec = {
      id: key,
      title,
      subtitle: kind === 'linear' ? 'Data records in this 64 KiB page' : 'Records',
      expanded: true,
      rows: [],
    };
    sectionMap.set(key, sec);
  }
  return sec;
}

/**
 * @param {string} text
 * @returns {HexViewModel}
 */
function buildHexViewModel(text) {
  /** @type {string[]} */
  const warnings = [];
  let upperLinear = 0;
  let upperSegment = 0;
  let eof = false;
  let dataByteCount = 0;
  /** @type {Map<string, HexViewSection>} */
  const sectionMap = new Map();
  /** @type {HexViewSection | null} */
  let trailing = null;

  const lines = text.split(/\r?\n/);
  for (let lineNo = 0; lineNo < lines.length; lineNo += 1) {
    const raw = lines[lineNo].trim();
    if (!raw) {
      continue;
    }
    if (eof) {
      warnings.push(`Data after EOF at line ${lineNo + 1}`);
      continue;
    }
    if (isIntelHexCommentLine(raw)) {
      continue;
    }
    if (!raw.startsWith(':')) {
      warnings.push(`Skipped non-hex line ${lineNo + 1}`);
      continue;
    }
    let record;
    try {
      record = decodeRecordLine(raw, lineNo + 1, { strict: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      warnings.push(message);
      continue;
    }

    if (record.type === 0x04) {
      if (record.data.length !== 2) {
        warnings.push(`Invalid type 04 at line ${lineNo + 1}`);
        continue;
      }
      upperLinear = ((record.data[0] << 8) | record.data[1]) << 16;
      upperSegment = 0;
      const sec = sectionFor(sectionMap, 'linear', upperLinear);
      sec.rows.push(rowFromRecord(lineNo + 1, record, null));
      continue;
    }
    if (record.type === 0x02) {
      if (record.data.length !== 2) {
        warnings.push(`Invalid type 02 at line ${lineNo + 1}`);
        continue;
      }
      upperSegment = (record.data[0] << 8) | record.data[1];
      upperLinear = 0;
      const segBase = upperSegment << 4;
      const sec = sectionFor(sectionMap, 'segment', segBase);
      sec.rows.push(rowFromRecord(lineNo + 1, record, null));
      continue;
    }

    if (record.type === 0x01) {
      eof = true;
      trailing = sectionFor(sectionMap, 'default', 0);
      trailing.subtitle = 'End of file';
      trailing.rows.push(rowFromRecord(lineNo + 1, record, null));
      continue;
    }

    if (record.type === 0x00) {
      const load = upperLinear + (upperSegment << 4) + record.address;
      const kind = upperSegment && !upperLinear ? 'segment' : upperLinear ? 'linear' : 'default';
      const base =
        kind === 'segment' ? upperSegment << 4 : kind === 'linear' ? upperLinear : 0;
      const sec = sectionFor(sectionMap, kind, base);
      dataByteCount += record.data.length;
      sec.rows.push(rowFromRecord(lineNo + 1, record, load));
      continue;
    }

    const sec = sectionFor(sectionMap, 'default', 0);
    sec.rows.push(rowFromRecord(lineNo + 1, record, null));
  }

  /** @type {HexViewSection[]} */
  const sections = [];
  const linearKeys = [...sectionMap.keys()].filter((k) => k.startsWith('linear:')).sort();
  const segmentKeys = [...sectionMap.keys()].filter((k) => k.startsWith('segment:')).sort();
  const defaultKeys = [...sectionMap.keys()].filter((k) => k.startsWith('default:')).sort();
  for (const key of [...linearKeys, ...segmentKeys, ...defaultKeys]) {
    const sec = sectionMap.get(key);
    if (sec) sections.push(sec);
  }

  return {
    totalLines: lines.length,
    dataByteCount,
    sections,
    warnings,
  };
}

/**
 * @param {number} lineNo
 * @param {import('./record-decode').DecodedHexRecord} record
 * @param {number | null} loadAddr
 * @returns {HexViewRecordRow}
 */
function rowFromRecord(lineNo, record, loadAddr) {
  /** @type {HexViewByteCell[]} */
  const dataCells = record.data.map((b) => ({
    text: hexPad(b),
    style: byteColorClass(b),
  }));
  return {
    lineNo,
    ll: hexPad(record.byteCount),
    addr: hexPad(record.address, 4),
    typ: hexPad(record.type),
    typLabel: hexRecordTypeLabel(record.type),
    loadAddr: loadAddr === null ? null : hexAddr32(loadAddr),
    dataCells,
    chk: hexPad(record.checksum),
    chkOk: record.checksumOk,
    isData: record.type === 0x00,
  };
}

module.exports = {
  buildHexViewModel,
};