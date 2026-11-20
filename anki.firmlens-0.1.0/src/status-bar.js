/**
 * @fileoverview Status bar session indicator.
 */

const vscode = require('vscode');

/**
 * @typedef {import('./session').SessionSummary} SessionSummary
 */

function createStatusBar() {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50);
  item.command = 'firmlens.viewSnapshot';
  item.tooltip = 'FirmLens: view snapshot';
  item.show();

  return {
    item,
    /** @param {SessionSummary} summary */
    update(summary) {
      item.command = 'firmlens.viewSnapshot';
      if (summary.active) {
        item.tooltip = `FirmLens: view snapshot (${summary.label}) — inline snap: hints + hover for detail`;
      } else {
        item.tooltip =
          'FirmLens: view snapshot (loads from deploy/ if needed — use Load Snapshot to pick files)';
      }
      item.text = summary.active
        ? `$(eye) FirmLens: ${summary.label}`
        : '$(eye) FirmLens: no session';
    },
  };
}

module.exports = {
  createStatusBar,
};