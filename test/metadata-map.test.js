/**
 * @fileoverview Metadata provenance + GNU map corroboration.
 */

const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const {
  loadMetadataFile,
  sha256File,
  metadataWarnings,
  rangeCoversBytes,
  provenanceLines,
} = require('../anki.firmlens-0.1.0/lib/format/metadata');
const { loadGnuMapSymbols, mapCorroborationWarnings } = require('../anki.firmlens-0.1.0/lib/format/map-symbols');
const { loadDwarfIndex } = require('../anki.firmlens-0.1.0/lib/dwarf/dwarf-index');

const root = path.join(__dirname, '../fixures-2');
const axf = path.join(root, 'firmware.axf');
const hash = sha256File(axf);
assert.match(hash, /^[a-f0-9]{64}$/);

const metaPath = path.join(root, 'metadata.example.json');
const meta = loadMetadataFile(metaPath);
assert.strictEqual(meta.axfSha256, hash);
assert.strictEqual(metadataWarnings(meta, hash).length, 0);
assert.strictEqual(
  metadataWarnings({ axfSha256: '0'.repeat(64) }, hash).length,
  1,
);

assert.strictEqual(rangeCoversBytes(meta.captureRanges, 0x20001000, 8), true);
assert.strictEqual(rangeCoversBytes(meta.captureRanges, 0x20001000, 9), false);

const prov = provenanceLines(meta, true, []);
assert.ok(prov.some((l) => l.includes('capture metadata')));

const mapSyms = loadGnuMapSymbols(path.join(root, 'firmware.map'));
assert.strictEqual(mapSyms.get('mf_root'), 0x20000020);
const dwarf = loadDwarfIndex(axf);
const mf = dwarf.byName('mf_root')[0];
assert.strictEqual(mf.address, mapSyms.get('mf_root'));
assert.strictEqual(mapCorroborationWarnings(dwarf, mapSyms).length, 0);

console.log('metadata-map.test.js: OK');