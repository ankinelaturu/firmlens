/**
 * @fileoverview Pointer target read for symbol Goto memory.
 */

const path = require('path');
const assert = require('assert');
const { loadHexFile } = require('../anki.firmlens-0.1.0/lib/hex/hex-memory');
const { buildSymbolTreeModel } = require('../anki.firmlens-0.1.0/lib/hex/symbol-tree-model');
const { loadDwarfIndex } = require('../anki.firmlens-0.1.0/lib/dwarf/dwarf-index');
const { buildAllIntervals } = require('../anki.firmlens-0.1.0/lib/hex/symbol-intervals');
const {
  readPointerTarget,
  formatGotoAddress,
  resolvePointerTargetSymbol,
} = require('../anki.firmlens-0.1.0/lib/hex/pointer-target');

const hex = path.join(__dirname, '../deploy/snapshot.hex');
const axf = path.join(__dirname, '../deploy/firmware.axf');
const memory = loadHexFile(hex);
const dwarf = loadDwarfIndex(axf);
const intervals = buildAllIntervals(dwarf);
const activeIv = intervals.find((s) => s.name === 'g_network_hub.active');
assert.ok(activeIv, 'active interval');
const active = readPointerTarget(memory, activeIv.start, activeIv.end, activeIv.typeLabel);
assert.equal(active, 0x20000010, formatGotoAddress(active));

const mf = dwarf.variables.find((v) => v.name === 'mf_root');
assert.ok(mf);
const mfPtr = readPointerTarget(memory, mf.address, mf.address + 4, 'mem_file_metadata *');
assert.equal(mfPtr, 0x20001000);

const nodes = buildSymbolTreeModel(memory, dwarf);
const actNode = nodes.find((n) => n.dwarfName === 'g_network_hub.active');
assert.ok(actNode?.gotoMemoryAddr, 'tree node has goto addr');
assert.equal(actNode.gotoMemoryAddr, 0x20000010);
assert.equal(actNode.gotoMemorySymbol, 'g_network', 'points at g_network');
assert.equal(actNode.gotoMemorySymbolId, 'g_network');

const sym = resolvePointerTargetSymbol(intervals, 0x20001000, 'mf_root');
assert.ok(sym && sym.name === 'g_root', 'mf_root -> g_root');

const { renderSymbolsTabHtml } = require('../anki.firmlens-0.1.0/lib/hex/render-symbols-html');
const html = renderSymbolsTabHtml(
  { memory, dwarf, axfPath: axf, fromSession: false },
  { limits: { maxStructFields: 32, maxReadBytes: 256 } },
);
assert.ok(html.includes('sym-goto-mem'), 'mem goto button');
assert.ok(html.includes('Goto 0x20000010'), 'formatted label');
assert.ok(html.includes('sym-goto-sym'), 'symbol goto button');
assert.ok(html.includes('Goto g_network'), 'symbol goto label');

console.log('pointer-target.test.js: OK');