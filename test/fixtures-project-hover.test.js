/**
 * @fileoverview Multi-file fixture: linked AXF from fixtures/project.
 */

const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { loadHexFile } = require('../anki.firmlens-0.1.0/lib/hex/hex-memory');
const { loadDwarfIndex } = require('../anki.firmlens-0.1.0/lib/dwarf/dwarf-index');
const { buildFirmwareHover } = require('../anki.firmlens-0.1.0/lib/hover/build-hover');
const { sniffElf } = require('../anki.firmlens-0.1.0/lib/format/sniff');
const { loadGnuMapSymbols, mapCorroborationWarnings } = require('../anki.firmlens-0.1.0/lib/format/map-symbols');

const gen = path.join(__dirname, '../fixtures/generated');
const projectRoot = path.join(__dirname, '../fixtures/project');
const axf = path.join(gen, 'project.axf');
const hex = path.join(gen, 'project_snapshot.hex');

assert.ok(fs.existsSync(axf), `Run ./fixtures/project/build.sh first (missing ${axf})`);

const elfHead = fs.readFileSync(axf).subarray(0, 64);
const sniff = sniffElf(elfHead);
assert.strictEqual(sniff.eType, 2, 'ET_EXEC expected');

const dwarf = loadDwarfIndex(axf);
const names = dwarf.variables.map((v) => v.name).sort();
assert.ok(names.includes('mf_root'), names.join(', '));
assert.ok(names.includes('g_network'), names.join(', '));
assert.ok(dwarf.variables.length >= 6, `expected several globals, got ${dwarf.variables.length}`);

const mapSyms = loadGnuMapSymbols(path.join(gen, 'project.map'));
assert.strictEqual(mapCorroborationWarnings(dwarf, mapSyms).length, 0);

const memory = loadHexFile(hex);
const remaps = [{ from: '/fixture/project', to: projectRoot }];

function hover(relFile, line0, col, needle) {
  const editorPath = path.join(projectRoot, 'src', relFile);
  const fullText = fs.readFileSync(editorPath, 'utf8');
  const r = buildFirmwareHover({
    memory,
    dwarf,
    snapshotLabel: 'project_snapshot.hex',
    editorPath,
    fullText,
    lineIndex0: line0,
    charIndex: col,
    remaps,
    limits: { maxStructFields: 32, maxReadBytes: 256 },
  });
  assert.ok(r && !('reason' in r), `${relFile}:${line0} ${JSON.stringify(r)}`);
  assert.ok(r.body.join('\n').includes(needle), needle);
}

hover('storage.c', findLine('storage.c', 'mf_root'), colOn('storage.c', 'mf_root'), '0x20000020');
hover('network.c', findLine('network.c', 'g_network'), colOn('network.c', 'g_network'), '**Value:**');
hover('storage.c', findLine('storage.c', 'mf_root'), colOn('storage.c', 'mf_root'), 'file_count: 3');
hover('main.c', findLine('main.c', 'mf_root->file_count'), colOn('main.c', 'file_count'), '**Value:** 3');
hover('board.c', findLine('board.c', 'g_retry_count'), colOn('board.c', 'g_retry_count'), '**Value:** 7');

function findLine(file, snippet) {
  const lines = fs.readFileSync(path.join(projectRoot, 'src', file.replace(/^src\//, '')), 'utf8').split(/\n/);
  const i = lines.findIndex((l) => l.includes(snippet));
  assert.ok(i >= 0, `snippet ${snippet} in ${file}`);
  return i;
}

function colOn(file, word) {
  const line = fs.readFileSync(path.join(projectRoot, 'src', file), 'utf8').split(/\n/)[findLine(file, word)];
  const i = line.indexOf(word);
  assert.ok(i >= 0, word);
  return i + Math.floor(word.length / 2);
}

console.log('fixtures-project-hover.test.js: OK');