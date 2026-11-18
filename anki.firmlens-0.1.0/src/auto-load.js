/**
 * @fileoverview Load snapshot from deploy/ or settings on startup.
 */

const vscode = require('vscode');
const { resolveSessionBundle } = require('../lib/session/resolve-paths');

/**
 * @param {ReturnType<typeof import('./session').createSessionManager>} session
 */
async function autoLoadSnapshotIfConfigured(session) {
  const config = vscode.workspace.getConfiguration('firmlens');
  if (!config.get('autoLoadOnStartup', true)) {
    return;
  }
  const deployDirectory = String(config.get('deployDirectory', 'deploy'));
  const paths = resolveSessionBundle(config.get('autoLoadPaths'), deployDirectory);
  if (!paths) {
    console.info(
      `[FirmLens] no deploy bundle under ${deployDirectory}/ or build/ — use FirmLens: Load Snapshot`,
    );
    return;
  }
  const ok = await session.loadSnapshotFromPaths(paths, { quiet: true });
  if (!ok) {
    console.warn('[FirmLens] auto-load failed — use FirmLens: Load Snapshot');
  }
}

module.exports = {
  autoLoadSnapshotIfConfigured,
};