// @ts-check
/// <reference types="vscode" />

/**
 * @fileoverview FirmLens VS Code extension entry (JavaScript, no build step).
 */

const vscode = require('vscode');
const { createSessionManager } = require('./src/session');
const { registerSnapshotCommands } = require('./src/commands');
const { createStatusBar } = require('./src/status-bar');
const { registerFirmwareHover } = require('./src/hover');
const { autoLoadSnapshotIfConfigured } = require('./src/auto-load');
const { registerHexViewer } = require('./src/hex-viewer/provider');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const session = createSessionManager(context);
  const statusBar = createStatusBar();
  session.onDidChange(() => {
    statusBar.update(session.getSummary());
  });
  statusBar.update(session.getSummary());

  registerSnapshotCommands(context, session);
  registerFirmwareHover(context, session);
  registerHexViewer(session, context);

  context.subscriptions.push(statusBar.item);

  void autoLoadSnapshotIfConfigured(session);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};