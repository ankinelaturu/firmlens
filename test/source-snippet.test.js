/**
 * @fileoverview Source neighborhood snippets for tooltips.
 */

const path = require('path');
const assert = require('assert');
const { createSourceSnippetCache, CONTEXT_BEFORE, CONTEXT_AFTER } = require('../anki.firmlens-0.1.0/lib/hex/source-snippet');

const roots = [
  path.join(__dirname, '..'),
  path.join(__dirname, '../fixtures/project'),
];
const cache = createSourceSnippetCache(roots);
const snippet = cache.getSnippet('', 0, '');
assert.equal(snippet, null, 'empty key rejected');

const board = cache.getSnippet('board.c', 12, 'g_board');
if (board) {
  assert.ok(board.html.includes('fl-tip-src-view'), 'rich code view');
  assert.ok(board.html.includes('fl-tip-src-focus'), 'highlights decl line');
  const lineCount = board.html.match(/fl-tip-src-row/g)?.length || 0;
  assert.ok(lineCount <= CONTEXT_BEFORE + CONTEXT_AFTER + 1, 'bounded window');
}

console.log('source-snippet.test.js: OK');