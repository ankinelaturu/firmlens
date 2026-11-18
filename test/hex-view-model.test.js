/**
 * @fileoverview Hex viewer view model.
 */

const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { buildHexViewModel } = require('../anki.firmlens-0.1.0/lib/hex/hex-view-model');

const hexPath = path.join(__dirname, '../deploy/build/TestApplication.hex');
const alt = path.join(__dirname, '../fixtures/generated/project_snapshot.hex');
const source = fs.existsSync(hexPath) ? hexPath : alt;
const model = buildHexViewModel(fs.readFileSync(source, 'utf8'));

assert.ok(model.sections.length >= 1, 'expected at least one section');
const flash = model.sections.find((s) => s.id === 'linear:134217728');
if (flash) {
  const dataInFlash = flash.rows.filter((r) => r.isData);
  assert.ok(dataInFlash.length >= 16, 'flash section should have many data records under one header');
}
assert.ok(model.dataByteCount > 0, 'expected data bytes');

const dataRows = model.sections.flatMap((s) => s.rows.filter((r) => r.isData));
assert.ok(dataRows.length > 0, 'expected data rows');
assert.ok(dataRows[0].loadAddr?.startsWith('0x'), 'load address on data row');
assert.strictEqual(dataRows[0].chk.length, 2, 'checksum column');

const withChk = model.sections.flatMap((s) => s.rows);
for (const row of withChk) {
  assert.ok(row.ll && row.addr && row.typ && row.chk, 'grid columns present');
}

console.log('hex-view-model.test.js: OK');