/**
 * @fileoverview Build hover markdown for a resolved global variable or member.
 */

const { isInCommentOrString } = require('../identity/c-scan');
const { resolveGlobalVariable } = require('../identity/resolve-variable');
const { localShadowsGlobal, expressionAt } = require('../identity/c-scope');
const { resolveMember, decodeMemberValue } = require('../identity/resolve-member');
const { decodeAt } = require('../decode/decode-value');
const { rangeCoversBytes } = require('../format/metadata');
const { formatHoverMarkdown, declHint, code } = require('./format-markdown');

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
 * @returns {{ title: string, body: string[], address: string, snapshotValue: string, hoverStart?: number, hoverEnd?: number } | { reason: string, hint?: string } | null}
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

  const hoverRange =
    expr.kind === 'member'
      ? { hoverStart: expr.start, hoverEnd: expr.end }
      : { hoverStart: expr.start, hoverEnd: expr.end };

  if (expr.kind === 'ident' && localShadowsGlobal(input.fullText, input.lineIndex0, input.charIndex, expr.word)) {
    return {
      reason: 'Local shadows global',
      hint: 'Snapshot values apply to file-scope `static` / global symbols only.',
    };
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
    return reason
      ? { reason, hint: 'Check `firmlens.sourceRootRemap` or hover the global declaration.' }
      : null;
  }

  const meta = input.metadata ?? null;
  const sessionWarnings = input.sessionWarnings ?? [];
  const addrSize = input.dwarf.addressSize;
  const le = input.dwarf.littleEndian;
  const hint = declHint(variable);

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
    const title = `${expr.base}${expr.op}${expr.member}`;
    const body = formatHoverMarkdown({
      title,
      typeName,
      storageAddr: addr,
      snapshotValue: decoded.summary,
      decoded,
      type: mem.memberType,
      memory: input.memory,
      readAddress: mem.address,
      readLen,
      declHint: hint,
      memberCaption: `Member of ${code(expr.base)} · base storage ${code(`0x${variable.address.toString(16)}`)}`,
      snapshotLabel: input.snapshotLabel,
      metadata: meta,
      fromCapture,
      sessionWarnings,
    });
    return {
      title: expr.member,
      body,
      address: addr,
      snapshotValue: decoded.summary,
      ...hoverRange,
    };
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
  const scalarRead =
    variable.type.kind === 'int' || variable.type.kind === 'bool' ? variable.address : undefined;
  const body = formatHoverMarkdown({
    title: expr.word,
    typeName,
    storageAddr: addr,
    snapshotValue: decoded.summary,
    decoded,
    type: variable.type,
    memory: input.memory,
    readAddress: scalarRead,
    readLen: scalarRead != null ? readLen : undefined,
    declHint: hint,
    snapshotLabel: input.snapshotLabel,
    metadata: meta,
    fromCapture,
    sessionWarnings,
  });

  return {
    title: expr.word,
    body,
    address: addr,
    snapshotValue: decoded.summary,
    ...hoverRange,
  };
}

/**
 * @param {Parameters<typeof buildFirmwareHover>[0]} input
 * @param {number} lineIndex0
 * @param {number} probeCol
 * @returns {{ lineIndex0: number, endCol: number, probeCol: number, hoverStart?: number, hoverEnd?: number, snapshotValue: string, title: string, address: string, body: string[] } | null}
 */
function buildFirmwarePreviewAt(input, lineIndex0, probeCol) {
  const result = buildFirmwareHover({
    ...input,
    lineIndex0,
    charIndex: probeCol,
  });
  if (!result || 'reason' in result) {
    return null;
  }
  return {
    lineIndex0,
    probeCol,
    endCol: result.hoverEnd ?? probeCol,
    hoverStart: result.hoverStart,
    hoverEnd: result.hoverEnd,
    snapshotValue: result.snapshotValue,
    title: result.title,
    address: result.address,
    body: result.body,
  };
}

module.exports = {
  buildFirmwareHover,
  buildFirmwarePreviewAt,
};