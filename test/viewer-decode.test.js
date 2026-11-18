/**
 * @fileoverview Hex viewer decode tooltips.
 */

const path = require('path');
const assert = require('assert');
const { loadHexFile } = require('../anki.firmlens-0.1.0/lib/hex/hex-memory');
const { loadDwarfIndex } = require('../anki.firmlens-0.1.0/lib/dwarf/dwarf-index');
const { buildAllIntervals } = require('../anki.firmlens-0.1.0/lib/hex/symbol-intervals');
const { tooltipForByte, symbolAtAddress } = require('../anki.firmlens-0.1.0/lib/hex/viewer-decode');

const hex = path.join(__dirname, '../deploy/snapshot.hex');
const axf = path.join(__dirname, '../deploy/firmware.axf');
const memory = loadHexFile(hex);
const dwarf = loadDwarfIndex(axf);
const intervals = buildAllIntervals(dwarf);

assert.ok(intervals.some((s) => s.name.includes('.')), 'expected member intervals');

const ram = intervals.find((s) => s.name === 'mf_root' || s.name.startsWith('mf_root'));
if (ram) {
  const sym = symbolAtAddress(intervals, ram.start);
  assert.ok(sym, 'symbol at start');
  const tip = tooltipForByte(memory, dwarf, sym, ram.start, { maxStructFields: 32, maxReadBytes: 256 }, axf);
  assert.ok(tip.includes(sym.name.split('.')[0]), 'tooltip mentions symbol');
}

console.log('viewer-decode.test.js: OK');