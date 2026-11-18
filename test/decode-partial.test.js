/**
 * @fileoverview Partial pointee + NULL pointer from fixtures/hex partial snapshot.
 */

const path = require('path');
const assert = require('assert');
const { loadHexFile, parseIntelHex } = require('../anki.firmlens-0.1.0/lib/hex/hex-memory');
const { decodeAt } = require('../anki.firmlens-0.1.0/lib/decode/decode-value');

const partial = loadHexFile(path.join(__dirname, '../fixtures/hex/demo_mf_root_partial.hex'));
/** @type {import('../anki.firmlens-0.1.0/lib/dwarf/dwarf-index').TypeRef} */
const pointee = {
  kind: 'struct',
  typeName: 'mem_file_metadata',
  members: [
    { name: 'id', offset: 0, type: { kind: 'int', byteSize: 4, signed: false } },
    { name: 'file_count', offset: 4, type: { kind: 'int', byteSize: 4, signed: false } },
    { name: 'initialized', offset: 8, type: { kind: 'bool', byteSize: 1 } },
  ],
};
const ptrType = {
  kind: 'pointer',
  byteSize: 4,
  pointee,
};
const decoded = decodeAt(partial, 0x20000020, ptrType, true, { maxStructFields: 8, maxReadBytes: 64 }, 32);
assert.match(decoded.summary, /0x/);
assert.ok(decoded.lines.some((l) => l.includes('initialized: unavailable')), decoded.lines.join('\n'));

const nullHex = parseIntelHex(':020000042000DA\n:0400200000000000DC\n:00000001FF\n');
const nul = decodeAt(nullHex, 0x20000020, ptrType, true, { maxStructFields: 8, maxReadBytes: 64 }, 32);
assert.strictEqual(nul.summary, 'NULL');

console.log('decode-partial.test.js: OK');