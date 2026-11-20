/**
 * @fileoverview Block-local names that shadow globals (parameters + declarations).
 */

/**
 * @param {string} text
 * @param {number} lineIndex0
 * @param {number} charIndex
 */
function offsetAt(text, lineIndex0, charIndex) {
  const lines = text.split(/\r?\n/);
  let off = 0;
  for (let i = 0; i < lineIndex0; i += 1) {
    off += lines[i].length + 1;
  }
  return off + charIndex;
}

/**
 * Names declared as parameters or in the block starting at `{` before hover.
 *
 * @param {string} text
 * @param {number} hoverOffset
 * @returns {Set<string>}
 */
function localsShadowingBefore(text, hoverOffset) {
  /** @type {Set<string>} */
  const names = new Set();
  let depth = 0;
  let blockStart = -1;
  for (let pos = hoverOffset; pos >= 0; pos -= 1) {
    const c = text[pos];
    if (c === '}') depth += 1;
    if (c === '{') {
      if (depth === 0) {
        blockStart = pos;
        break;
      }
      depth -= 1;
    }
  }
  if (blockStart < 0) {
    return names;
  }

  const headerEnd = text.lastIndexOf(')', blockStart);
  if (headerEnd > blockStart - 200 && headerEnd >= 0) {
    const parenStart = text.lastIndexOf('(', headerEnd);
    if (parenStart >= 0 && headerEnd - parenStart < 400) {
      const params = text.slice(parenStart + 1, headerEnd);
      collectDeclaratorIds(params).forEach((n) => names.add(n));
    }
  }

  const body = text.slice(blockStart + 1, hoverOffset);
  collectLocalsFromBody(body).forEach((n) => names.add(n));
  return names;
}

/**
 * @param {string} snippet
 * @returns {Set<string>}
 */
function collectDeclaratorIds(snippet) {
  /** @type {Set<string>} */
  const out = new Set();
  const cleaned = snippet
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');
  const parts = cleaned.split(',');
  for (const part of parts) {
    const m = part.trim().match(/(\w+)\s*$/);
    if (m) out.add(m[1]);
  }
  return out;
}

/**
 * @param {string} body
 * @returns {Set<string>}
 */
function collectLocalsFromBody(body) {
  /** @type {Set<string>} */
  const out = new Set();
  const stripped = body
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');

  const stmtRe =
    /(?:^|[;{}])\s*(?:const\s+)?(?:static\s+)?(?:unsigned\s+|signed\s+)?(?:[A-Za-z_][\w]*\s+)+\*?\s*([A-Za-z_]\w*)\s*[=;\[]/gm;
  let m;
  while ((m = stmtRe.exec(stripped))) {
    if (!isReserved(m[1])) out.add(m[1]);
  }

  const forRe = /\bfor\s*\(\s*(?:const\s+)?(?:unsigned\s+)?(?:\w+\s+)+\*?\s*(\w+)\s*[=;]/g;
  while ((m = forRe.exec(stripped))) {
    if (!isReserved(m[1])) out.add(m[1]);
  }
  return out;
}

/**
 * @param {string} name
 */
function isReserved(name) {
  return new Set(['if', 'for', 'while', 'switch', 'return', 'sizeof']).has(name);
}

/**
 * @param {string} fullText
 * @param {number} lineIndex0
 * @param {number} charIndex
 * @param {string} word
 */
function localShadowsGlobal(fullText, lineIndex0, charIndex, word) {
  const off = offsetAt(fullText, lineIndex0, charIndex);
  const locals = localsShadowingBefore(fullText, off);
  return locals.has(word);
}

/**
 * @param {string} line
 * @param {number} col
 */
function expressionAt(line, col) {
  const re = /[A-Za-z_][A-Za-z0-9_]*\s*(?:->|\.)\s*[A-Za-z_][A-Za-z0-9_]*/g;
  let m;
  while ((m = re.exec(line))) {
    const start = m.index;
    const end = m.index + m[0].length;
    if (col >= start && col < end) {
      const parts = m[0].match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(->|\.)\s*([A-Za-z_][A-Za-z0-9_]*)$/);
      if (!parts) return null;
      return {
        kind: 'member',
        base: parts[1],
        op: parts[2],
        member: parts[3],
        start,
        end,
      };
    }
  }
  const { wordAt } = require('./c-scan');
  const hit = wordAt(line, col);
  if (hit) return { kind: 'ident', ...hit };
  return null;
}

/**
 * @param {string} fullText
 * @param {string} word
 * @param {number} hoverLine1
 */
function findGlobalDeclLine(fullText, word, hoverLine1) {
  const lines = fullText.split(/\r?\n/);
  let best = 0;
  const patterns = [
    new RegExp(`\\b(?:static\\s+)?(?:const\\s+)?(?:[\\w*]+\\s+)+\\*?\\s*${word}\\b`),
    new RegExp(`\\b${word}\\s*=`),
  ];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (patterns.some((p) => p.test(line))) {
      if (i + 1 <= hoverLine1) best = i + 1;
    }
  }
  return best;
}

module.exports = {
  localShadowsGlobal,
  expressionAt,
  findGlobalDeclLine,
  offsetAt,
  isReserved,
};