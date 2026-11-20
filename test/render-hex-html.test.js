/**
 * @fileoverview HTML hex viewer render smoke test.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { buildHexViewModel } = require('../anki.firmlens-0.1.0/lib/hex/hex-view-model');
const { renderHexViewerHtml } = require('../anki.firmlens-0.1.0/lib/hex/render-hex-html');

const hexPath = path.join(__dirname, '../deploy/snapshot.hex');
const hex = fs.readFileSync(hexPath, 'utf8');
const model = buildHexViewModel(hex);
const axf = path.join(__dirname, '../deploy/firmware.axf');
const { loadHexFile } = require('../anki.firmlens-0.1.0/lib/hex/hex-memory');
const { loadDwarfIndex } = require('../anki.firmlens-0.1.0/lib/dwarf/dwarf-index');
const html = renderHexViewerHtml(model, {
  fileName: 'snapshot.hex',
  sessionActive: true,
  firmware: {
    memory: loadHexFile(hexPath),
    dwarf: loadDwarfIndex(axf),
    axfPath: axf,
    fromSession: false,
  },
});

assert.ok(html.includes('records-grid') && html.includes('symbols-grid'), 'tables present');
assert.ok(html.includes('data-row'), 'data rows present');
assert.match(html, /records-data data-row/);
assert.ok((html.match(/records-wrap/g) || []).length >= 1, 'single records table wrap');
assert.ok(!html.includes('<th>Symbols</th>'), 'no Symbols column');
assert.ok(html.includes('sym-mapped'), 'symbol-colored data bytes');
assert.ok((html.match(/<tr /g) || []).length >= 50, 'expected many table rows');

console.log('render-hex-html.test.js: OK');