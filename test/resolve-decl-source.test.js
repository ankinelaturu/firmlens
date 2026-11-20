/**
 * @fileoverview Declaration path helpers for goto source.
 */

const path = require('path');
const assert = require('assert');
const {
  buildDeclFileCandidates,
  globalNameForGoto,
  declLineMatchesSymbol,
  canGotoSymbol,
} = require('../anki.firmlens-0.1.0/lib/hex/resolve-decl-source');

assert.equal(globalNameForGoto('g_board.voltage_mv'), 'g_board');

const root = path.join(__dirname, '../deploy');
const candidates = buildDeclFileCandidates(root, 'src/firmware.c', []);
assert.ok(candidates.some((c) => c.endsWith('firmware.c')), 'basename candidate');

assert.ok(declLineMatchesSymbol('BoardState g_board;', 'g_board.voltage_mv'));
assert.ok(!canGotoSymbol('g.x.(padding)', 10, false, true));

console.log('resolve-decl-source.test.js: OK');