/**
 * @fileoverview Inlay hints — ▤inspect affordance; click opens FirmLens hover.
 */

const vscode = require('vscode');
const { expressionsOnLine } = require('../lib/identity/expressions-on-line');
const { buildFirmwarePreviewAt } = require('../lib/hover/build-hover');
const { inlayInspectLabel } = require('../lib/hover/preview-label');
const { getEditorPreviewMode, inlayHintsEnabled } = require('./editor-preview');
const { runInspectAtPosition, firmwareHoverMarkdown } = require('./firmware-hover-at');

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
    vscode.commands.registerCommand(
      'firmlens.inspectAt',
      /**
       * @param {string} docUri
       * @param {number} line0
       * @param {number} probeCol
       * @param {number | undefined} hoverStart
       * @param {number | undefined} hoverEnd
       */
      async (docUri, line0, probeCol, hoverStart, hoverEnd) => {
        await runInspectAtPosition(
          vscode.Uri.parse(docUri),
          line0,
          probeCol,
          hoverStart,
          hoverEnd,
        );
      },
    ),
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

      const labelText = inlayInspectLabel();
      const docUri = document.uri.toString();

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
          const position = new vscode.Position(lineIndex0, preview.endCol);
          const part = new vscode.InlayHintLabelPart(labelText);
          part.command = {
            title: 'FirmLens inspect',
            command: 'firmlens.inspectAt',
            arguments: [
              docUri,
              lineIndex0,
              preview.probeCol,
              preview.hoverStart,
              preview.hoverEnd,
            ],
          };
          const hoverMd = firmwareHoverMarkdown(preview.body);
          part.tooltip = hoverMd;

          const hint = new vscode.InlayHint(position, [part], vscode.InlayHintKind.Parameter);
          hint.paddingLeft = true;
          hint.tooltip = hoverMd;
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