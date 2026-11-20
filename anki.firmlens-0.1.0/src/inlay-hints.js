/**
 * @fileoverview Inlay hints for snapshot values (discoverable without hover).
 */

const vscode = require('vscode');
const { expressionsOnLine } = require('../lib/identity/expressions-on-line');
const { buildFirmwarePreviewAt } = require('../lib/hover/build-hover');
const { previewInlayLabel } = require('../lib/hover/preview-label');
const { getEditorPreviewMode, inlayHintsEnabled } = require('./editor-preview');

const MAX_HINTS_PER_REQUEST = 80;

/**
 * @param {vscode.ExtensionContext} context
 * @param {ReturnType<typeof import('./session').createSessionManager>} session
 */
function registerFirmwareInlayHints(context, session) {
  /** @type {vscode.EventEmitter<void>} */
  const changeEmitter = new vscode.EventEmitter();
  session.onDidChange(() => changeEmitter.fire());
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('firmlens')) {
        changeEmitter.fire();
      }
    }),
  );

  const provider = {
    onDidChangeInlayHints: changeEmitter.event,
    /**
     * @param {vscode.TextDocument} document
     * @param {vscode.Range} range
     * @param {vscode.CancellationToken} token
     */
    provideInlayHints(document, range, token) {
      if (token.isCancellationRequested) {
        return [];
      }

      const config = vscode.workspace.getConfiguration('firmlens');
      const mode = getEditorPreviewMode(config);
      if (!inlayHintsEnabled(mode)) {
        return [];
      }

      const active = session.getSession();
      if (!active || !active.dwarf) {
        return [];
      }
      if (session.getGeneration() !== active.loadGeneration) {
        return [];
      }

      const remaps = config.get('sourceRootRemap', []);
      const limits = {
        maxStructFields: config.get('maxStructFields', 32),
        maxReadBytes: config.get('maxReadBytes', 256),
      };

      const fullText = document.getText();
      const editorPath = document.uri.fsPath;
      const base = {
        memory: active.memory,
        dwarf: active.dwarf,
        snapshotLabel: active.snapshotLabel,
        editorPath,
        fullText,
        remaps: /** @type {{from:string,to:string}[]} */ (remaps),
        limits,
        metadata: active.metadata ?? null,
        sessionWarnings: active.sessionWarnings ?? [],
      };

      /** @type {vscode.InlayHint[]} */
      const hints = [];
      const endLine = Math.min(range.end.line, document.lineCount - 1);

      for (let lineIndex0 = range.start.line; lineIndex0 <= endLine; lineIndex0 += 1) {
        if (token.isCancellationRequested) {
          break;
        }
        const line = document.lineAt(lineIndex0).text;
        const exprs = expressionsOnLine(line);
        for (const expr of exprs) {
          if (hints.length >= MAX_HINTS_PER_REQUEST) {
            return hints;
          }
          const preview = buildFirmwarePreviewAt(base, lineIndex0, expr.probeCol);
          if (!preview) {
            continue;
          }
          const label = previewInlayLabel(preview.snapshotValue);
          const position = new vscode.Position(lineIndex0, preview.endCol);
          const hint = new vscode.InlayHint(
            position,
            label,
            vscode.InlayHintKind.Parameter,
          );
          hint.paddingLeft = true;
          hint.tooltip = new vscode.MarkdownString(
            `**FirmLens** · ${preview.title}\n\nSnapshot · \`${preview.snapshotValue.replace(/`/g, '\\`')}\`\n\nStorage · \`${preview.address}\`\n\nHover for full decode.`,
          );
          hints.push(hint);
        }
      }

      return hints;
    },
  };

  const selector = [{ language: 'c', scheme: 'file' }, { language: 'cpp', scheme: 'file' }];
  context.subscriptions.push(
    vscode.languages.registerInlayHintsProvider(selector, provider),
    changeEmitter,
  );
}

module.exports = {
  registerFirmwareInlayHints,
};