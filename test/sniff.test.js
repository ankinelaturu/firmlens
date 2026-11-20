/**
 * @fileoverview Format sniffing tests (vendor-neutral).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const {
  sniffElf,
  sniffMemorySnapshot,
  sniffLinkerMap,
} = require('../anki.firmlens-0.1.0/lib/format/sniff');
const { validateSnapshotLoad } = require('../anki.firmlens-0.1.0/lib/format/validate-load');

const gen = path.join(__dirname, '../fixtures/generated');

function run() {
  const elfBuf = fs.readFileSync(path.join(gen, 'demo_mf_root.axf'));
  const elf = sniffElf(elfBuf);
  assert.strictEqual(elf?.kind, 'elf');
  assert.strictEqual(elf.wordSize, 32);
  assert.strictEqual(elf.eType, 2);

  const hexBuf = fs.readFileSync(path.join(gen, 'demo_mf_root.hex'));
  const hex = sniffMemorySnapshot(hexBuf);
  assert.ok(hex && typeof hex === 'object' && hex.kind === 'intel-hex');

  assert.strictEqual(sniffMemorySnapshot(elfBuf), 'elf');

  const srec = Buffer.from('S30F0000...\n', 'utf8');
  assert.strictEqual(sniffMemorySnapshot(srec), 's-record');

  const mapBuf = fs.readFileSync(path.join(gen, 'demo_mf_root.map'));
  const map = sniffLinkerMap(mapBuf);
  assert.ok(map.kind === 'map-gnu' || map.kind === 'map-keil', map.kind);

  const validated = validateSnapshotLoad(
    path.join(gen, 'demo_mf_root.hex'),
    path.join(gen, 'demo_mf_root.axf'),
    path.join(gen, 'demo_mf_root.map'),
  );
  assert.ok(validated.warnings.length >= 0);

  assert.throws(
    () =>
      validateSnapshotLoad(
        path.join(gen, 'demo_mf_root.axf'),
        path.join(gen, 'demo_mf_root.hex'),
        null,
      ),
    /Intel HEX/,
  );

  const hexWithHeader = Buffer.from(
    '; TYPE=SNAPSHOT\n; VERSION=1\n:020000042000DA\n:08100000010203040506070809FA\n:00000001FF\n',
    'utf8',
  );
  const sniffed = sniffMemorySnapshot(hexWithHeader);
  assert.ok(sniffed && typeof sniffed === 'object' && sniffed.kind === 'intel-hex', sniffed);

  console.log('sniff.test.js: OK');
}

run();