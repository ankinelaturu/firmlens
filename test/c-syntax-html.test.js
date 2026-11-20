/**
 * @fileoverview C syntax HTML for tooltips.
 */

const assert = require('assert');
const { highlightCLineHtml } = require('../anki.firmlens-0.1.0/lib/hex/c-syntax-html');

const html = highlightCLineHtml('uint16_t g_board = 0; // init');
assert.ok(html.includes('fl-syn-ty'), 'type color');
assert.ok(html.includes('fl-syn-num'), 'number');
assert.ok(html.includes('fl-syn-com'), 'comment');
assert.ok(!html.includes('<script'), 'escaped safe');
assert.ok(html.includes('fl-syn-id') || html.includes('fl-syn-ty'), 'identifiers');

const fn = highlightCLineHtml('int board_read_temp_c(void)');
assert.ok(fn.includes('fl-syn-fn'), 'call-like name');

console.log('c-syntax-html.test.js: OK');