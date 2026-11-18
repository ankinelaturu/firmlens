/**
 * @fileoverview Build hover markdown for a resolved global variable or member.
 */

const { isInCommentOrString } = require('../identity/c-scan');
const { resolveGlobalVariable } = require('../identity/resolve-variable');
const { localShadowsGlobal, expressionAt } = require('../identity/c-scope');
const { resolveMember, decodeMemberValue } = require('../identity/resolve-member');
const { decodeAt } = require('../decode/decode-value');
const { rangeCoversBytes, provenanceLines } = require('../format/metadata');

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
 * @param {import('../format/metadata').SnapshotMetadata | null} [input.metadata]
 * @param {string[]} [input.sessionWarnings]
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
  const expr = expressionAt(line, input.charIndex);
  if (!expr) {
    return null;
  }

  if (expr.kind === 'ident' && localShadowsGlobal(input.fullText, input.lineIndex0, input.charIndex, expr.word)) {
    return { reason: 'Local variable shadows global — snapshot value omitted.' };
  }

  const identWord = expr.kind === 'member' ? expr.base : expr.word;
  const { variable, reason } = resolveGlobalVariable({
    editorPath: input.editorPath,
    line1Based: input.lineIndex0 + 1,
    word: identWord,
    fullText: input.fullText,
    dwarf: input.dwarf,
    remaps: input.remaps,
  });

  if (!variable) {
    return reason ? { reason } : null;
  }

  const meta = input.metadata ?? null;
  const sessionWarnings = input.sessionWarnings ?? [];
  const addrSize = input.dwarf.addressSize;
  const le = input.dwarf.littleEndian;

  if (expr.kind === 'member') {
    const mem = resolveMember(
      input.memory,
      variable,
      expr.member,
      expr.op,
      le,
      addrSize,
      input.limits,
    );
    if ('reason' in mem) {
      return { reason: mem.reason };
    }
    const decoded = decodeMemberValue(input.memory, mem.address, mem.memberType, le, input.limits);
    const addr = `0x${mem.address.toString(16)}`;
    const typeName = mem.memberType.typeName || mem.memberType.kind;
    const readLen = mem.memberType.byteSize || 4;
    const fromCapture = rangeCoversBytes(meta?.captureRanges, mem.address, readLen);
    /** @type {string[]} */
    const body = [
      `**${expr.base}${expr.op}${expr.member}** · \`${typeName}\` @ \`${addr}\``,
      '',
      `**Value:** ${decoded.summary}`,
    ];
    if (decoded.lines.length) {
      body.push('', ...decoded.lines.map((l) => `- ${l}`));
    }
    body.push('', `_Snapshot:_ ${input.snapshotLabel}`);
    body.push(...provenanceLines(meta, fromCapture, sessionWarnings).map((l) => `_${l}_`));
    return { title: expr.member, body, address: addr };
  }

  const decoded = decodeAt(
    input.memory,
    variable.address,
    variable.type,
    le,
    input.limits,
    addrSize,
  );

  const addr = `0x${variable.address.toString(16)}`;
  const typeName = variable.type.typeName || variable.type.kind;
  const readLen = variable.type.byteSize || (variable.type.kind === 'pointer' ? (addrSize === 64 ? 8 : 4) : 4);
  const fromCapture = rangeCoversBytes(meta?.captureRanges, variable.address, readLen);
  /** @type {string[]} */
  const body = [
    `**${expr.word}** · \`${typeName}\` @ \`${addr}\``,
    '',
    `**Value:** ${decoded.summary}`,
  ];
  if (decoded.lines.length) {
    body.push('', ...decoded.lines.map((l) => `- ${l}`));
  }
  body.push('', `_Snapshot:_ ${input.snapshotLabel}`);
  body.push(...provenanceLines(meta, fromCapture, sessionWarnings).map((l) => `_${l}_`));

  return { title: expr.word, body, address: addr };
}

module.exports = {
  buildFirmwareHover,
};