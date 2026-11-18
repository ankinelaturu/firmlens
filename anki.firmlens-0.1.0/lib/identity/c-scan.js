/**
 * @fileoverview Lightweight C scan: comments, strings, word at position.
 */

/**
 * @param {string} text
 * @param {number} offset
 */
function isInCommentOrString(text, offset) {
  let i = 0;
  let state = 'code';
  while (i < text.length && i <= offset) {
    const c = text[i];
    const n = text[i + 1];
    if (state === 'code') {
      if (c === '/' && n === '/') {
        state = 'line_comment';
        i += 2;
        continue;
      }
      if (c === '/' && n === '*') {
        state = 'block_comment';
        i += 2;
        continue;
      }
      if (c === '"') {
        state = 'string';
        i += 1;
        continue;
      }
      if (c === '\'') {
        state = 'char';
        i += 1;
        continue;
      }
      i += 1;
      continue;
    }
    if (state === 'line_comment') {
      if (c === '\n') state = 'code';
      i += 1;
      continue;
    }
    if (state === 'block_comment') {
      if (c === '*' && n === '/') {
        state = 'code';
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    if (state === 'string') {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === '"') state = 'code';
      i += 1;
      continue;
    }
    if (state === 'char') {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === '\'') state = 'code';
      i += 1;
      continue;
    }
  }
  return state !== 'code';
}

/**
 * @param {string} line
 * @param {number} col
 */
function wordAt(line, col) {
  const re = /[A-Za-z_][A-Za-z0-9_]*/g;
  let m;
  while ((m = re.exec(line))) {
    if (col >= m.index && col <= m.index + m[0].length) {
      return { word: m[0], start: m.index, end: m.index + m[0].length };
    }
  }
  return null;
}

module.exports = {
  isInCommentOrString,
  wordAt,
};