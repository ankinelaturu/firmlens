/**
 * @fileoverview Command palette registration.
 */

const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 * @param {ReturnType<typeof import('./session').createSessionManager>} session
 */
function registerSnapshotCommands(context, session) {
  context.subscriptions.push(
    vscode.commands.registerCommand('firmlens.loadSnapshot', () => session.loadSnapshot()),
    vscode.commands.registerCommand('firmlens.clearSnapshot', () => session.clearSnapshot()),
  );
}

module.exports = {
  registerSnapshotCommands,
};