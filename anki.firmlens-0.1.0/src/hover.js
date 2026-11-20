/**
 * @fileoverview C hover provider using DWARF + snapshot memory.
 */

const vscode = require('vscode');
const { firmwareHoverAt } = require('./firmware-hover-at');

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
      return firmwareHoverAt(session, document, position);
    },
  };

  const selector = [{ language: 'c', scheme: 'file' }, { language: 'cpp', scheme: 'file' }];
  context.subscriptions.push(vscode.languages.registerHoverProvider(selector, provider));
}

module.exports = {
  registerFirmwareHover,
};