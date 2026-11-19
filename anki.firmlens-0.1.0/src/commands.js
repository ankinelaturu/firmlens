/**
 * @fileoverview Command palette registration.
 */

const vscode = require('vscode');
const { VIEW_TYPE } = require('./hex-viewer/provider');
const { resolveSessionBundle } = require('../lib/session/resolve-paths');

/**
 * @param {ReturnType<typeof import('./session').createSessionManager>} session
 * @returns {Promise<boolean>}
 */
async function ensureSessionForView(session) {
  if (session.getSession()?.hexPath) {
    return true;
  }
  const config = vscode.workspace.getConfiguration('firmlens');
  const deployDirectory = String(config.get('deployDirectory', 'deploy'));
  const paths = resolveSessionBundle(config.get('autoLoadPaths'), deployDirectory);
  if (paths) {
    return session.loadSnapshotFromPaths(paths, { quiet: true });
  }
  return false;
}

/**
 * @param {ReturnType<typeof import('./session').createSessionManager>} session
 */
async function openSessionHexViewer(session) {
  const ready = await ensureSessionForView(session);
  const cur = session.getSession();
  if (!ready || !cur?.hexPath) {
    const pick = await vscode.window.showWarningMessage(
      'FirmLens: no snapshot loaded. Add deploy/snapshot.hex + firmware.axf or use Load Snapshot.',
      'Load Snapshot',
    );
    if (pick === 'Load Snapshot') {
      await session.loadSnapshot();
    }
    if (!session.getSession()?.hexPath) {
      return;
    }
  }
  const hexPath = session.getSession().hexPath;
  const uri = vscode.Uri.file(hexPath);
  try {
    await vscode.openWith(uri, VIEW_TYPE);
  } catch (err) {
    try {
      await vscode.commands.executeCommand('vscode.openWith', uri, VIEW_TYPE);
    } catch (err2) {
      const message = err2 instanceof Error ? err2.message : String(err2);
      vscode.window.showErrorMessage(`FirmLens: could not open viewer — ${message}`);
    }
  }
}

/**
 * @param {vscode.ExtensionContext} context
 * @param {ReturnType<typeof import('./session').createSessionManager>} session
 */
function registerSnapshotCommands(context, session) {
  context.subscriptions.push(
    vscode.commands.registerCommand('firmlens.loadSnapshot', () => session.loadSnapshot()),
    vscode.commands.registerCommand('firmlens.clearSnapshot', () => session.clearSnapshot()),
    vscode.commands.registerCommand('firmlens.viewSnapshot', () => openSessionHexViewer(session)),
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