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
    vscode.commands.registerCommand('firmlens.openHexViewer', async () => {
      const active = vscode.window.activeTextEditor?.document.uri;
      if (active && /\.hex$/i.test(active.fsPath)) {
        await vscode.commands.executeCommand('vscode.openWith', active, 'firmlens.hexViewer');
        return;
      }
      const picked = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { 'Intel HEX': ['hex'] },
        title: 'Open with FirmLens Hex Snapshot',
      });
      if (picked?.[0]) {
        await vscode.commands.executeCommand('vscode.openWith', picked[0], 'firmlens.hexViewer');
      }
    }),
  );
}

module.exports = {
  registerSnapshotCommands,
};