/**
 * @fileoverview Editor integration mode (hover vs inlay hints).
 */

/**
 * @typedef {'off' | 'hover' | 'inlayHints' | 'both'} EditorPreviewMode
 */

/**
 * @param {import('vscode').WorkspaceConfiguration} config
 * @returns {EditorPreviewMode}
 */
function getEditorPreviewMode(config) {
  const raw = config.get('editorPreview', 'both');
  if (raw === 'off' || raw === 'hover' || raw === 'inlayHints' || raw === 'both') {
    return raw;
  }
  return 'both';
}

/**
 * @param {EditorPreviewMode} mode
 */
function hoverEnabled(mode) {
  return mode === 'hover' || mode === 'both';
}

/**
 * @param {EditorPreviewMode} mode
 */
function inlayHintsEnabled(mode) {
  return mode === 'inlayHints' || mode === 'both';
}

module.exports = {
  getEditorPreviewMode,
  hoverEnabled,
  inlayHintsEnabled,
};