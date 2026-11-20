/**
 * @fileoverview Pointers, arrays, and nested structs in fixtures/project.
 */

const path = require('path');
const assert = require('assert');
const fs = require('fs');
const { loadHexFile } = require('../anki.firmlens-0.1.0/lib/hex/hex-memory');
const { loadDwarfIndex } = require('../anki.firmlens-0.1.0/lib/dwarf/dwarf-index');
const { buildAllIntervals } = require('../anki.firmlens-0.1.0/lib/hex/symbol-intervals');
const { decodeAt } = require('../anki.firmlens-0.1.0/lib/decode/decode-value');
const { buildFirmwareHover } = require('../anki.firmlens-0.1.0/lib/hover/build-hover');

const gen = path.join(__dirname, '../fixtures/generated');
const projectRoot = path.join(__dirname, '../fixtures/project');
const axf = path.join(gen, 'project.axf');
const hex = path.join(gen, 'project_snapshot.hex');
assert.ok(fs.existsSync(axf), 'Run fixtures/project/build.sh first');

const dwarf = loadDwarfIndex(axf);
const memory = loadHexFile(hex);
const limits = { maxStructFields: 32, maxReadBytes: 256 };
const remaps = [{ from: '/fixture/project', to: projectRoot }];

const adc = dwarf.variables.find((v) => v.name === 'g_adc_samples');
assert.ok(adc, 'g_adc_samples');
assert.equal(adc.type.kind, 'array', 'array kind');
assert.equal(adc.type.length, 8, 'array length');
assert.equal(adc.type.elementType?.typeName, 'int32_t');

const decodedArr = decodeAt(memory, adc.address, adc.type, true, limits, 32);
assert.ok(decodedArr.lines.some((l) => l.startsWith('[0]:')), decodedArr.lines.join('\n'));
assert.ok(decodedArr.summary.includes('[8]'));

const hub = dwarf.variables.find((v) => v.name === 'g_network_hub');
assert.ok(hub?.type?.members?.some((m) => m.name === 'active' && m.type?.kind === 'pointer'));

const intervals = buildAllIntervals(dwarf);
assert.ok(intervals.some((s) => s.name === 'g_network_hub.active'), 'pointer member interval');
assert.ok(intervals.some((s) => s.name === 'g_adc_samples'), 'array global interval');

const peerPtr = intervals.find((s) => s.name === 'g_network_hub.peers');
assert.ok(peerPtr, 'peers array member');

const storage = path.join(projectRoot, 'src', 'storage.c');
const hubSrc = path.join(projectRoot, 'src', 'hub.c');
const hoverArray = buildFirmwareHover({
  memory,
  dwarf,
  snapshotLabel: 'project_snapshot.hex',
  editorPath: hubSrc,
  fullText: fs.readFileSync(hubSrc, 'utf8'),
  lineIndex0: 21,
  charIndex: 10,
  remaps,
  limits,
});
assert.ok(hoverArray && !('reason' in hoverArray), JSON.stringify(hoverArray));
assert.ok(hoverArray.body.join('\n').includes('[0]:'), 'array hover lines');

const activeMember = hub.type.members.find((m) => m.name === 'active');
assert.ok(activeMember?.type?.kind === 'pointer');
const activeDecoded = decodeAt(
  memory,
  hub.address + activeMember.offset,
  activeMember.type,
  true,
  limits,
  32,
);
assert.match(activeDecoded.summary, /0x20000010/i, activeDecoded.summary);
assert.ok(activeDecoded.lines.some((l) => l.includes('packets_in')), 'pointee fields in decode');

console.log('fixture-advanced-types.test.js: OK');