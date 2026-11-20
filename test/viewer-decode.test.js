/**
 * @fileoverview Hex viewer decode tooltips.
 */

const path = require('path');
const assert = require('assert');
const { loadHexFile } = require('../anki.firmlens-0.1.0/lib/hex/hex-memory');
const { loadDwarfIndex } = require('../anki.firmlens-0.1.0/lib/dwarf/dwarf-index');
const { buildAllIntervals } = require('../anki.firmlens-0.1.0/lib/hex/symbol-intervals');
const {
  tooltipForByte,
  formatViewerTooltip,
  symbolAtAddress,
} = require('../anki.firmlens-0.1.0/lib/hex/viewer-decode');

const hex = path.join(__dirname, '../deploy/snapshot.hex');
const axf = path.join(__dirname, '../deploy/firmware.axf');
const memory = loadHexFile(hex);
const dwarf = loadDwarfIndex(axf);
const intervals = buildAllIntervals(dwarf);
const limits = { maxStructFields: 32, maxReadBytes: 256 };
const { createSourceSnippetCache } = require('../anki.firmlens-0.1.0/lib/hex/source-snippet');
const snippetCache = createSourceSnippetCache([
  path.join(__dirname, '..'),
  path.join(__dirname, '../fixtures/project'),
]);

assert.ok(intervals.some((s) => s.name.includes('.')), 'expected member intervals');

const volt = intervals.find((s) => s.name === 'g_board.voltage_mv');
assert.ok(volt, 'voltage_mv interval');
assert.equal(volt.typeLabel, 'uint16_t', 'shared member types resolve');

const ram = intervals.find((s) => s.name === 'mf_root' || s.name.startsWith('mf_root'));
if (ram) {
  const sym = symbolAtAddress(intervals, ram.start);
  assert.ok(sym, 'symbol at start');
  const tip = tooltipForByte(memory, dwarf, sym, ram.start, limits, axf);
  assert.ok(tip.includes(sym.name.split('.')[0]), 'tooltip mentions symbol');
  const rich = formatViewerTooltip(memory, dwarf, sym, ram.start, limits, axf, snippetCache);
  assert.ok(
    rich.html.includes('fl-tip-src') || rich.html.includes('fl-tip-code'),
    'tooltip has decl or source block',
  );
  assert.ok(rich.html.includes('fl-tip-mono'), 'tooltip uses mono sections');
}

if (volt) {
  const inner = formatViewerTooltip(memory, dwarf, volt, volt.start + 1, limits, axf, snippetCache);
  assert.ok(
    inner.html.includes('fl-tip-src') || inner.html.includes('fl-tip-code'),
    'offset byte still has decl block',
  );
}

const netPad = intervals.find((s) => s.name === 'g_network.(padding)');
assert.ok(netPad, 'g_network tail padding interval');
assert.equal(symbolAtAddress(intervals, netPad.start)?.typeLabel, 'padding');
const padTip = formatViewerTooltip(memory, dwarf, netPad, netPad.start, limits, axf);
assert.ok(padTip.html.includes('fl-tip-pill'), 'padding tooltip pill');

console.log('viewer-decode.test.js: OK');