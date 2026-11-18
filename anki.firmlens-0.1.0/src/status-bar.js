/**
 * @fileoverview Status bar session indicator.
 */

const vscode = require('vscode');

/**
 * @typedef {import('./session').SessionSummary} SessionSummary
 */

function createStatusBar() {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50);
  item.command = 'firmlens.loadSnapshot';
  item.tooltip = 'FirmLens snapshot session — click to load';
  item.show();

  return {
    item,
    /** @param {SessionSummary} summary */
    update(summary) {
      item.text = summary.active
        ? `$(eye) FirmLens: ${summary.label}`
        : '$(eye) FirmLens: no session';
    },
  };
}

module.exports = {
  createStatusBar,
};