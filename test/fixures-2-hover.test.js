/**
 * @fileoverview End-to-end hover build for fixures-2 fixture.
 */

const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { loadHexFile } = require('../anki.firmlens-0.1.0/lib/hex/hex-memory');
const { loadDwarfIndex } = require('../anki.firmlens-0.1.0/lib/dwarf/dwarf-index');
const { buildFirmwareHover } = require('../anki.firmlens-0.1.0/lib/hover/build-hover');

const root = path.join(__dirname, '../fixures-2');
const memory = loadHexFile(path.join(root, 'snapshot.hex'));
const dwarf = loadDwarfIndex(path.join(root, 'firmware.axf'));
const fw = path.join(root, 'firmware.c');
const fullText = fs.readFileSync(fw, 'utf8');

function hoverAt(line0, col, needle) {
  const r = buildFirmwareHover({
    memory,
    dwarf,
    snapshotLabel: 'snapshot.hex',
    editorPath: fw,
    fullText,
    lineIndex0: line0,
    charIndex: col,
    remaps: [{ from: '/fixture', to: root }],
    limits: { maxStructFields: 32, maxReadBytes: 256 },
  });
  assert.ok(r && !('reason' in r), JSON.stringify(r));
  assert.ok(r.body.join('\n').includes(needle), needle);
  return r;
}

hoverAt(8, 42, 'root');
hoverAt(16, 16, '**Value:** 3');
hoverAt(16, 16, '0x20001004');
hoverAt(10, 39, '**Value:** 7');
hoverAt(9, 45, 'mf_root');

console.log('fixures-2-hover.test.js: OK');