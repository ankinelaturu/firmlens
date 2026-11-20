/**
 * @fileoverview Symbols tree-table model.
 */

const path = require('path');
const assert = require('assert');
const { loadHexFile } = require('../anki.firmlens-0.1.0/lib/hex/hex-memory');
const { loadDwarfIndex } = require('../anki.firmlens-0.1.0/lib/dwarf/dwarf-index');
const { buildSymbolTreeModel } = require('../anki.firmlens-0.1.0/lib/hex/symbol-tree-model');

const hex = path.join(__dirname, '../deploy/snapshot.hex');
const axf = path.join(__dirname, '../deploy/firmware.axf');
const memory = loadHexFile(hex);
const dwarf = loadDwarfIndex(axf);
const nodes = buildSymbolTreeModel(memory, dwarf);

const network = nodes.find((n) => n.id === 'g_network' && n.container);
assert.ok(network, 'g_network container');
assert.ok(network.displayHex.length > 0, 'collapsed aggregate hex');

const child = nodes.find((n) => n.parentId === 'g_network' && n.label === 'packets_in');
assert.ok(child, 'member row');
assert.equal(child.typeLabel, 'uint32_t');

const volt = nodes.find((n) => n.label === 'voltage_mv');
assert.ok(volt, 'member label');

const pad = nodes.find((n) => n.label === '(padding)' && n.parentId === 'g_network');
assert.ok(pad, 'padding child');
assert.equal(pad.canGoto, false, 'padding has no goto');

assert.equal(network.canGoto, true, 'global goto');
assert.equal(child.canGoto, true, 'member goto');
assert.ok(child.dwarfName?.includes('packets_in'), 'member dwarf name');

const { renderSymbolsTabHtml } = require('../anki.firmlens-0.1.0/lib/hex/render-symbols-html');
const { resolveHexFirmware } = require('../anki.firmlens-0.1.0/lib/hex/resolve-hex-firmware');
const firmware = resolveHexFirmware(hex, { getSession: () => null });
const symHtml = renderSymbolsTabHtml(
  firmware || { memory, dwarf, fromSession: false, axfPath: axf },
);
assert.ok(symHtml.includes('sym-goto-src'), 'goto button in html');
assert.ok(symHtml.includes('data-dwarf-name="g_network"'), 'global goto attrs');

console.log('symbol-tree.test.js: OK');