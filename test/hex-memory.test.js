/**
 * @fileoverview Node test runner for Intel HEX parser (no VS Code required).
 */

const assert = require('assert');
const path = require('path');
const { loadHexFile, parseIntelHex } = require('../anki.firmlens-0.1.0/lib/hex/hex-memory');

const fixtureHex = path.join(__dirname, '../fixtures/generated/demo_mf_root.hex');

function run() {
  const mem = loadHexFile(fixtureHex);
  assert.strictEqual(mem.hasByte(0x20000020), true);
  assert.strictEqual(mem.hasByte(0x20000024), true);

  const ptr = mem.read(0x20000020, 4);
  assert.ok(ptr.available.every(Boolean));
  const view = new DataView(ptr.bytes.buffer, ptr.bytes.byteOffset, 4);
  assert.strictEqual(view.getUint32(0, true), 0x20001000);

  const meta = mem.read(0x20001000, 9);
  assert.deepStrictEqual([...meta.bytes.slice(0, 9)], [0x01, 0, 0, 0, 0x03, 0, 0, 0, 0x01]);

  const partial = parseIntelHex(`:020000042000DA\n:081000000100000003000000E4\n:00000001FF\n`);
  const partialMeta = partial.read(0x20001000, 9);
  assert.strictEqual(partialMeta.available[8], false);
  console.log('hex-memory.test.js: OK');
}

run();