/**
 * @fileoverview C hover provider using DWARF + snapshot memory.
 */

const vscode = require('vscode');
const { buildFirmwareHover } = require('../lib/hover/build-hover');

/**
 * @param {vscode.ExtensionContext} context
 * @param {ReturnType<typeof import('./session').createSessionManager>} session
 */
function registerFirmwareHover(context, session) {
  const provider = {
    /**
     * @param {vscode.TextDocument} document
     * @param {vscode.Position} position
     * @param {vscode.CancellationToken} token
     */
    provideHover(document, position, token) {
      if (token.isCancellationRequested) {
        return null;
      }
      const active = session.getSession();
      if (!active || !active.dwarf) {
        return null;
      }
      if (session.getGeneration() !== active.loadGeneration) {
        return null;
      }

      const config = vscode.workspace.getConfiguration('firmlens');
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
        const md = new vscode.MarkdownString(`**FirmLens:** ${result.reason}`);
        return new vscode.Hover(md);
      }

      const md = new vscode.MarkdownString();
      md.isTrusted = false;
      md.supportHtml = false;
      md.appendMarkdown(result.body.join('\n'));
      const range = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
      return new vscode.Hover(md, range);
    },
  };

  const selector = [{ language: 'c', scheme: 'file' }, { language: 'cpp', scheme: 'file' }];
  context.subscriptions.push(vscode.languages.registerHoverProvider(selector, provider));
}

module.exports = {
  registerFirmwareHover,
};