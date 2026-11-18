/**
 * @fileoverview Symbol intervals and memory image for hex viewer.
 */

const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { loadHexFile } = require('../anki.firmlens-0.1.0/lib/hex/hex-memory');
const { loadDwarfIndex } = require('../anki.firmlens-0.1.0/lib/dwarf/dwarf-index');
const { buildGlobalIntervals, gutterLabel } = require('../anki.firmlens-0.1.0/lib/hex/symbol-intervals');
const { buildMemoryImage } = require('../anki.firmlens-0.1.0/lib/hex/memory-image');
const { renderHexViewerHtml } = require('../anki.firmlens-0.1.0/lib/hex/render-hex-html');
const { buildHexViewModel } = require('../anki.firmlens-0.1.0/lib/hex/hex-view-model');

const root = path.join(__dirname, '..');
const hexPath = path.join(root, 'deploy/snapshot.hex');
const axfPath = path.join(root, 'deploy/firmware.axf');

const memory = loadHexFile(hexPath);
const dwarf = loadDwarfIndex(axfPath);
const intervals = buildGlobalIntervals(dwarf);

assert.ok(intervals.length > 0, 'expected globals from dwarf');
const regions = buildMemoryImage(memory);
assert.ok(regions.length >= 2, 'flash + ram regions');

const ram = regions.find((r) => r.linearBase === 0x20000000);
assert.ok(ram, 'expected ram region');
const label = gutterLabel(intervals, 0x20000008);
assert.strictEqual(label.kind, 'start');
assert.ok(label.text.length > 0);

const html = renderHexViewerHtml(buildHexViewModel(fs.readFileSync(hexPath, 'utf8')), {
  fileName: 'snapshot.hex',
  sessionActive: true,
  firmware: { memory, dwarf, axfPath, fromSession: false },
});
assert.ok(html.includes('image-grid'), 'image tab table');
assert.ok(html.includes('sym-index'), 'symbol sidebar');
assert.ok(html.includes('id="sym-20000008"') || html.includes('sym-20000008'), 'anchor row');

console.log('symbol-image.test.js: OK');