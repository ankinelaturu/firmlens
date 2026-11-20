/**
 * @fileoverview Line scan for editor inlay hints.
 */

const assert = require('assert');
const { expressionsOnLine } = require('../anki.firmlens-0.1.0/lib/identity/expressions-on-line');
const { inlayInspectLabel } = require('../anki.firmlens-0.1.0/lib/hover/preview-label');

const line = '  if (mf_root->file_count > 0) g_network = 1;';
const exprs = expressionsOnLine(line);
assert.ok(exprs.length >= 2, exprs.length);
assert.ok(exprs.some((e) => e.kind === 'member' && e.end > e.start));
assert.ok(exprs.some((e) => e.kind === 'ident' && line.slice(e.start, e.end) === 'g_network'));

const label = inlayInspectLabel();
assert.strictEqual(label, '▤inspect', label);

console.log('expressions-on-line.test.js: OK');