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

assert.ok(html.includes('records-grid') || html.includes('image-grid'), 'table present');
assert.ok(html.includes('data-row'), 'data rows present');
assert.match(html, /<tr class="data-row">/);
assert.ok((html.match(/<tr /g) || []).length >= 50, 'expected many table rows');

console.log('render-hex-html.test.js: OK');