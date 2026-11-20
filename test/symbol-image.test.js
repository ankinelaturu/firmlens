/**
 * @fileoverview Symbol intervals and memory image for hex viewer.
 */

const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { loadHexFile } = require('../anki.firmlens-0.1.0/lib/hex/hex-memory');
const { loadDwarfIndex } = require('../anki.firmlens-0.1.0/lib/dwarf/dwarf-index');
const { buildGlobalIntervals } = require('../anki.firmlens-0.1.0/lib/hex/symbol-intervals');
const { buildSymbolTreeModel } = require('../anki.firmlens-0.1.0/lib/hex/symbol-tree-model');
const { renderHexViewerHtml } = require('../anki.firmlens-0.1.0/lib/hex/render-hex-html');
const { buildHexViewModel } = require('../anki.firmlens-0.1.0/lib/hex/hex-view-model');

const root = path.join(__dirname, '..');
const hexPath = path.join(root, 'deploy/snapshot.hex');
const axfPath = path.join(root, 'deploy/firmware.axf');

const memory = loadHexFile(hexPath);
const dwarf = loadDwarfIndex(axfPath);
const intervals = buildGlobalIntervals(dwarf);

assert.ok(intervals.length > 0, 'expected globals from dwarf');
const tree = buildSymbolTreeModel(memory, dwarf);
assert.ok(tree.some((n) => n.container), 'expected struct container');

const html = renderHexViewerHtml(buildHexViewModel(fs.readFileSync(hexPath, 'utf8')), {
  fileName: 'snapshot.hex',
  sessionActive: true,
  firmware: { memory, dwarf, axfPath, fromSession: false },
});
assert.ok(html.includes('symbols-grid'), 'symbols tab table');
assert.ok(html.includes('tab-symbols'), 'symbols tab control');

console.log('symbol-image.test.js: OK');