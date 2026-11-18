/**
 * @fileoverview Read a bounded prefix of a file for format sniffing.
 * @module lib/format/read-head
 */

const fs = require('fs');

/** @typedef {{ buffer: Buffer, bytesRead: number }} FileHead */

/**
 * @param {string} filePath
 * @param {number} [maxBytes]
 * @returns {FileHead}
 */
function readFileHead(filePath, maxBytes = 8192) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(maxBytes);
    const bytesRead = fs.readSync(fd, buffer, 0, maxBytes, 0);
    return { buffer: buffer.subarray(0, bytesRead), bytesRead };
  } finally {
    fs.closeSync(fd);
  }
}

module.exports = {
  readFileHead,
};