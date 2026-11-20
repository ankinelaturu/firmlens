/**
 * @fileoverview AXF inspector webview — explicit snapshot load only (no auto session).
 */

(function () {
  const vscode = acquireVsCodeApi();
  const payload = window.FIRMLENS_AXF || {};

  const loadBtn = document.getElementById('load-bundle');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      vscode.postMessage({
        type: 'loadSnapshotBundle',
        axfPath: payload.axfPath,
        hexPath: payload.hexPath,
        mapPath: payload.mapPath,
        metadataPath: payload.metadataPath,
      });
    });
  }

  document.querySelectorAll('.copy-addr').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const addr = btn.getAttribute('data-addr');
      if (addr) {
        vscode.postMessage({ type: 'copyAddress', address: addr });
      }
    });
  });
})();