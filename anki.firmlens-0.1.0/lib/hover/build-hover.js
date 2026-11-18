/**
 * @fileoverview Build hover markdown for a resolved global variable.
 */

const { isInCommentOrString, wordAt } = require('../identity/c-scan');
const { resolveGlobalVariable } = require('../identity/resolve-variable');
const { decodeAt } = require('../decode/decode-value');

/**
 * @param {object} input
 * @param {import('../hex/hex-memory').HexMemory} input.memory
 * @param {import('../dwarf/dwarf-index').DwarfIndex} input.dwarf
 * @param {string} input.snapshotLabel
 * @param {string} input.editorPath
 * @param {string} input.fullText
 * @param {number} input.lineIndex0
 * @param {number} input.charIndex
 * @param {{from:string,to:string}[]} input.remaps
 * @param {{ maxStructFields: number, maxReadBytes: number }} input.limits
 * @returns {{ title: string, body: string[], address: string } | { reason: string } | null}
 */
function buildFirmwareHover(input) {
  const offset = input.fullText
    .split(/\r?\n/)
    .slice(0, input.lineIndex0)
    .reduce((a, l, i) => a + l.length + (i < input.lineIndex0 ? 1 : 0), input.charIndex);
  if (isInCommentOrString(input.fullText, offset)) {
    return null;
  }

  const line = input.fullText.split(/\r?\n/)[input.lineIndex0] ?? '';
  const hit = wordAt(line, input.charIndex);
  if (!hit) {
    return null;
  }

  const { variable, reason } = resolveGlobalVariable({
    editorPath: input.editorPath,
    line1Based: input.lineIndex0 + 1,
    word: hit.word,
    dwarf: input.dwarf,
    remaps: input.remaps,
  });

  if (!variable) {
    return reason ? { reason } : null;
  }

  const decoded = decodeAt(
    input.memory,
    variable.address,
    variable.type,
    input.dwarf.littleEndian,
    input.limits,
  );

  const addr = `0x${variable.address.toString(16)}`;
  const typeName = variable.type.typeName || variable.type.kind;
  /** @type {string[]} */
  const body = [
    `**${hit.word}** · \`${typeName}\` @ \`${addr}\``,
    '',
    `**Value:** ${decoded.summary}`,
  ];
  if (decoded.lines.length) {
    body.push('', ...decoded.lines.map((l) => `- ${l}`));
  }
  body.push('', `_Snapshot:_ ${input.snapshotLabel}`, '_Provenance: user-selected pairing._');

  return { title: hit.word, body, address: addr };
}

module.exports = {
  buildFirmwareHover,
};