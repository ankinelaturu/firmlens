/**
 * @fileoverview Shared FirmLens hover build for editor + inspect command.
 */

const vscode = require('vscode');
const { buildFirmwareHover } = require('../lib/hover/build-hover');
const { formatReasonMarkdown } = require('../lib/hover/format-markdown');
const { getEditorPreviewMode, hoverEnabled, inlayHintsEnabled } = require('./editor-preview');

/** While true, provideHover runs even when editorPreview is inlayHints-only. */
let inspectHoverBypass = false;

function isInspectHoverBypassActive() {
  return inspectHoverBypass;
}

/**
 * @param {ReturnType<typeof import('./session').createSessionManager>} session
 * @param {vscode.TextDocument} document
 * @param {vscode.Position} position
 * @param {{ allowInspectBypass?: boolean }} [options]
 * @returns {vscode.Hover | null}
 */
function firmwareHoverAt(session, document, position, options = {}) {
  const active = session.getSession();
  if (!active || !active.dwarf) {
    return null;
  }
  if (session.getGeneration() !== active.loadGeneration) {
    return null;
  }

  const config = vscode.workspace.getConfiguration('firmlens');
  const previewMode = getEditorPreviewMode(config);
  const bypass = Boolean(options.allowInspectBypass) || inspectHoverBypass;
  if (!hoverEnabled(previewMode) && !bypass) {
    return null;
  }

  const remaps = config.get('sourceRootRemap', []);
  const limits = {
    maxStructFields: config.get('maxStructFields', 32),
    maxReadBytes: config.get('maxReadBytes', 256),
  };

  const result = buildFirmwareHover({
    memory: active.memory,
    dwarf: active.dwarf,
    snapshotLabel: active.snapshotLabel,
    editorPath: document.uri.fsPath,
    fullText: document.getText(),
    lineIndex0: position.line,
    charIndex: position.character,
    remaps: /** @type {{from:string,to:string}[]} */ (remaps),
    limits,
    metadata: active.metadata ?? null,
    sessionWarnings: active.sessionWarnings ?? [],
  });

  if (!result) {
    return null;
  }

  if ('reason' in result) {
    if (inlayHintsEnabled(previewMode) && !bypass) {
      return null;
    }
    const md = new vscode.MarkdownString(formatReasonMarkdown(result.reason, result.hint).join('\n'));
    md.isTrusted = false;
    return new vscode.Hover(md);
  }

  const md = firmwareHoverMarkdown(result.body);

  let range;
  if (result.hoverStart != null && result.hoverEnd != null) {
    range = new vscode.Range(position.line, result.hoverStart, position.line, result.hoverEnd);
  } else {
    range = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
  }

  return new vscode.Hover(md, range);
}

/**
 * @param {string[]} bodyLines
 */
function firmwareHoverMarkdown(bodyLines) {
  const md = new vscode.MarkdownString(bodyLines.join('\n'));
  md.isTrusted = false;
  md.supportHtml = false;
  return md;
}

/**
 * @param {vscode.Uri} uri
 * @param {number} line0
 * @param {number} character
 * @param {number} [hoverStart]
 * @param {number} [hoverEnd]
 */
async function runInspectAtPosition(uri, line0, character, hoverStart, hoverEnd) {
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document, { preserveFocus: false });

  const probe = new vscode.Position(line0, character);
  const startCol = hoverStart != null ? hoverStart : character;
  const endCol = hoverEnd != null ? hoverEnd : character + 1;
  const range = new vscode.Range(line0, startCol, line0, endCol);
  editor.selection = new vscode.Selection(range.start, range.end);
  editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);

  inspectHoverBypass = true;
  try {
    await vscode.commands.executeCommand('editor.action.showHover', probe);
  } finally {
    inspectHoverBypass = false;
  }
}

module.exports = {
  firmwareHoverAt,
  firmwareHoverMarkdown,
  runInspectAtPosition,
  isInspectHoverBypassActive,
};