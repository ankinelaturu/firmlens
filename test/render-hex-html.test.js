/**
 * @fileoverview HTML hex viewer render smoke test.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { buildHexViewModel } = require('../anki.firmlens-0.1.0/lib/hex/hex-view-model');
const { renderHexViewerHtml } = require('../anki.firmlens-0.1.0/lib/hex/render-hex-html');

const hex = fs.readFileSync(path.join(__dirname, '../deploy/snapshot.hex'), 'utf8');
const model = buildHexViewModel(hex);
const html = renderHexViewerHtml(model, { fileName: 'snapshot.hex', sessionActive: true });

assert.ok(html.includes('<table class="grid">'), 'table present');
assert.ok(html.includes('data-row'), 'data rows present');
assert.match(html, /<tr class="data-row">/);
assert.ok((html.match(/<tr /g) || []).length >= 50, 'expected many table rows');

console.log('render-hex-html.test.js: OK');