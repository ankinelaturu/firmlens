/**
 * @fileoverview Decode one Intel HEX record line (optional strict checksum).
 */

/**
 * @typedef {object} DecodedHexRecord
 * @property {number} byteCount
 * @property {number} address
 * @property {number} type
 * @property {number[]} data
 * @property {number} checksum
 * @property {boolean} checksumOk
 */

/**
 * @param {string} line
 * @param {number} lineNo
 * @param {{ strict?: boolean }} [opts]
 * @returns {DecodedHexRecord}
 */
function decodeRecordLine(line, lineNo, opts) {
  const strict = opts?.strict !== false;
  const payload = line.slice(1);
  if (payload.length < 10 || payload.length % 2 !== 0) {
    throw new Error(`Intel HEX: bad record length (line ${lineNo})`);
  }
  const pairs = payload.match(/.{2}/g);
  if (!pairs) {
    throw new Error(`Intel HEX: invalid hex (line ${lineNo})`);
  }
  const values = pairs.map((p) => parseInt(p, 16));
  let sum = 0;
  for (const v of values) {
    sum = (sum + v) & 0xff;
  }
  const checksumOk = sum === 0;
  if (strict && !checksumOk) {
    throw new Error(`Intel HEX: checksum mismatch (line ${lineNo})`);
  }
  const byteCount = values[0];
  const address = (values[1] << 8) | values[2];
  const type = values[3];
  const data = values.slice(4, 4 + byteCount);
  if (data.length !== byteCount) {
    throw new Error(`Intel HEX: truncated data (line ${lineNo})`);
  }
  const checksum = values[4 + byteCount];
  return { byteCount, address, type, data, checksum, checksumOk };
}

/**
 * @param {number} type
 */
function hexRecordTypeLabel(type) {
  switch (type) {
    case 0x00:
      return 'DATA';
    case 0x01:
      return 'EOF';
    case 0x02:
      return 'SEG';
    case 0x03:
      return 'CS';
    case 0x04:
      return 'LIN';
    case 0x05:
      return 'IP';
    default:
      return `0x${type.toString(16).toUpperCase()}`;
  }
}

/**
 * @param {number} value
 * @returns {'zero' | 'ff' | 'cc' | 'ascii' | 'ptr' | 'default'}
 */
function byteColorClass(value) {
  if (value === 0x00) return 'zero';
  if (value === 0xff) return 'ff';
  if (value === 0xcc) return 'cc';
  if (value >= 0x20 && value <= 0x7e) return 'ascii';
  if (value === 0x08 || value === 0x20) return 'ptr';
  return 'default';
}

module.exports = {
  decodeRecordLine,
  hexRecordTypeLabel,
  byteColorClass,
};