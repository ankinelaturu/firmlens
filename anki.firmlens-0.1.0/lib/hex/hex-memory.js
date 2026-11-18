/**
 * @fileoverview Intel HEX → sparse memory image.
 * @module lib/hex/hex-memory
 */

const fs = require('fs');

/**
 * @typedef {object} HexReadResult
 * @property {Uint8Array} bytes Buffer length equals requested size.
 * @property {boolean[]} available Per-byte true if present in snapshot.
 */

/**
 * @typedef {object} HexMemory
 * @property {() => number} byteCount Number of defined bytes stored.
 * @property {(address: number) => boolean} hasByte
 * @property {(address: number, length: number) => HexReadResult} read
 */

/**
 * @param {string} filePath
 * @returns {HexMemory}
 */
function loadHexFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return parseIntelHex(text);
}

/**
 * @param {string} text
 * @returns {HexMemory}
 */
function parseIntelHex(text) {
  /** @type {Map<number, number>} */
  const bytes = new Map();
  let upperLinear = 0;
  let upperSegment = 0;
  let eof = false;

  const lines = text.split(/\r?\n/);
  for (let lineNo = 0; lineNo < lines.length; lineNo += 1) {
    const raw = lines[lineNo].trim();
    if (!raw) {
      continue;
    }
    if (eof) {
      throw new Error(`Intel HEX: data after EOF (line ${lineNo + 1})`);
    }
    if (!raw.startsWith(':')) {
      throw new Error(`Intel HEX: missing ':' (line ${lineNo + 1})`);
    }
    const record = decodeRecord(raw, lineNo + 1);
    if (record.type === 0x00) {
      const addr = upperLinear + (upperSegment << 4) + record.address;
      for (let i = 0; i < record.data.length; i += 1) {
        const a = addr + i;
        const b = record.data[i];
        if (bytes.has(a) && bytes.get(a) !== b) {
          throw new Error(
            `Intel HEX: conflicting overlap at 0x${a.toString(16)} (line ${lineNo + 1})`,
          );
        }
        bytes.set(a, b);
      }
    } else if (record.type === 0x01) {
      eof = true;
    } else if (record.type === 0x02) {
      if (record.data.length !== 2) {
        throw new Error(`Intel HEX: invalid type 02 length (line ${lineNo + 1})`);
      }
      upperSegment = (record.data[0] << 8) | record.data[1];
      upperLinear = 0;
    } else if (record.type === 0x04) {
      if (record.data.length !== 2) {
        throw new Error(`Intel HEX: invalid type 04 length (line ${lineNo + 1})`);
      }
      upperLinear = ((record.data[0] << 8) | record.data[1]) << 16;
      upperSegment = 0;
    } else if (record.type === 0x03 || record.type === 0x05) {
      // Start address records — not loaded into memory.
    } else {
      throw new Error(`Intel HEX: unsupported record type 0x${record.type.toString(16)}`);
    }
  }

  return {
    byteCount: () => bytes.size,
    hasByte: (address) => bytes.has(address),
    read: (address, length) => {
      const out = new Uint8Array(length);
      const available = new Array(length);
      for (let i = 0; i < length; i += 1) {
        const a = address + i;
        if (bytes.has(a)) {
          out[i] = /** @type {number} */ (bytes.get(a));
          available[i] = true;
        } else {
          out[i] = 0;
          available[i] = false;
        }
      }
      return { bytes: out, available };
    },
  };
}

/**
 * @param {string} line
 * @param {number} lineNo
 */
function decodeRecord(line, lineNo) {
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
  if (sum !== 0) {
    throw new Error(`Intel HEX: checksum mismatch (line ${lineNo})`);
  }
  const byteCount = values[0];
  const address = (values[1] << 8) | values[2];
  const type = values[3];
  const data = values.slice(4, 4 + byteCount);
  if (data.length !== byteCount) {
    throw new Error(`Intel HEX: truncated data (line ${lineNo})`);
  }
  return { address, type, data };
}

module.exports = {
  loadHexFile,
  parseIntelHex,
};