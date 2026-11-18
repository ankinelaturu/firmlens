/**
 * @fileoverview Identity: shadowing, static disambiguation, member hover.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { localShadowsGlobal } = require('../anki.firmlens-0.1.0/lib/identity/c-scope');
const { resolveGlobalVariable } = require('../anki.firmlens-0.1.0/lib/identity/resolve-variable');
const { loadHexFile } = require('../anki.firmlens-0.1.0/lib/hex/hex-memory');
const { loadDwarfIndex } = require('../anki.firmlens-0.1.0/lib/dwarf/dwarf-index');
const { buildFirmwareHover } = require('../anki.firmlens-0.1.0/lib/hover/build-hover');

const root = path.join(__dirname, '../fixures-2');
const fw = path.join(root, 'firmware.c');
const fullText = fs.readFileSync(fw, 'utf8');

assert.strictEqual(
  localShadowsGlobal(fullText, 18, 4, 'retry_count'),
  true,
  'local retry_count should shadow global inside _start',
);
assert.strictEqual(
  localShadowsGlobal(fullText, 10, 10, 'retry_count'),
  false,
  'file-scope retry_count is not shadowed',
);

const dwarf = loadDwarfIndex(path.join(root, 'firmware.axf'));
const memory = loadHexFile(path.join(root, 'snapshot.hex'));
const remaps = [{ from: '/fixture', to: root }];

const member = buildFirmwareHover({
  memory,
  dwarf,
  snapshotLabel: 'snapshot.hex',
  editorPath: fw,
  fullText,
  lineIndex0: 16,
  charIndex: 16,
  remaps,
  limits: { maxStructFields: 32, maxReadBytes: 256 },
});
assert.ok(member && !('reason' in member), JSON.stringify(member));
assert.ok(member.body.join('\n').includes('Snapshot value · `3`'));

const shadow = buildFirmwareHover({
  memory,
  dwarf,
  snapshotLabel: 'snapshot.hex',
  editorPath: fw,
  fullText,
  lineIndex0: 18,
  charIndex: 4,
  remaps,
  limits: { maxStructFields: 32, maxReadBytes: 256 },
});
assert.ok(shadow && 'reason' in shadow);
assert.ok(shadow.reason.includes('shadow'));

const staticA = `static int duplicate_name = 1;\nvoid a(void) { (void)duplicate_name; }\n`;
const staticB = `static int duplicate_name = 2;\nvoid b(void) { (void)duplicate_name; }\n`;
/** @type {import('../anki.firmlens-0.1.0/lib/dwarf/dwarf-index').DwarfVariable[]} */
const mockVars = [
  {
    name: 'duplicate_name',
    address: 0x1000,
    declLine: 1,
    declFile: '/build/a.c',
    type: { kind: 'int', byteSize: 4, signed: true },
  },
  {
    name: 'duplicate_name',
    address: 0x2000,
    declLine: 1,
    declFile: '/build/b.c',
    type: { kind: 'int', byteSize: 4, signed: true },
  },
];
const mockDwarf = {
  littleEndian: true,
  addressSize: 32,
  variables: mockVars,
  byName: (n) => mockVars.filter((v) => v.name === n),
  byDecl: (f, l, n) =>
    mockVars.find(
      (v) =>
        v.name === n &&
        v.declLine === l &&
        (v.declFile.endsWith(path.basename(f)) || v.declFile === f),
    ) ?? null,
};

const pickA = resolveGlobalVariable({
  editorPath: '/workspace/a.c',
  line1Based: 2,
  word: 'duplicate_name',
  fullText: staticA,
  dwarf: mockDwarf,
  remaps: [{ from: '/build', to: '/workspace' }],
});
assert.strictEqual(pickA.variable?.address, 0x1000);

const pickB = resolveGlobalVariable({
  editorPath: '/workspace/b.c',
  line1Based: 2,
  word: 'duplicate_name',
  fullText: staticB,
  dwarf: mockDwarf,
  remaps: [{ from: '/build', to: '/workspace' }],
});
assert.strictEqual(pickB.variable?.address, 0x2000);

console.log('identity.test.js: OK');