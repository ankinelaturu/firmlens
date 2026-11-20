/**
 * @fileoverview Scan a source line for FirmLens expression spans (members, then idents).
 */

const { isReserved } = require('./c-scope');

/**
 * @typedef {{ kind: 'member' | 'ident', start: number, end: number, probeCol: number }} LineExpression
 */

/**
 * @param {string} line
 * @returns {LineExpression[]}
 */
function expressionsOnLine(line) {
  /** @type {LineExpression[]} */
  const members = [];
  const memberRe = /[A-Za-z_][A-Za-z0-9_]*\s*(?:->|\.)\s*[A-Za-z_][A-Za-z0-9_]*/g;
  let m;
  while ((m = memberRe.exec(line))) {
    const span = m[0];
    members.push({
      kind: 'member',
      start: m.index,
      end: m.index + span.length,
      probeCol: m.index + Math.floor(span.length / 2),
    });
  }

  /**
   * @param {number} idx
   */
  const insideMember = (idx) => members.some((mem) => idx >= mem.start && idx < mem.end);

  /** @type {LineExpression[]} */
  const idents = [];
  const idRe = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
  while ((m = idRe.exec(line))) {
    if (insideMember(m.index)) continue;
    const word = m[0];
    if (isReserved(word)) continue;
    idents.push({
      kind: 'ident',
      start: m.index,
      end: m.index + word.length,
      probeCol: m.index + Math.floor(word.length / 2),
    });
  }

  return [...members, ...idents].sort((a, b) => a.start - b.start);
}

module.exports = {
  expressionsOnLine,
};