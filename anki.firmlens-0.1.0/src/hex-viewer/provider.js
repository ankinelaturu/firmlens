/**
 * @fileoverview FirmLens custom readonly editor for Intel HEX snapshots.
 */

// @ts-check
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { buildHexViewModel } = require('../../lib/hex/hex-view-model');
const { renderHexViewerHtml } = require('../../lib/hex/render-hex-html');
const { resolveHexFirmware } = require('../../lib/hex/resolve-hex-firmware');

const VIEW_TYPE = 'firmlens.hexViewer';

/** @type {vscode.OutputChannel | undefined} */
let outputChannel;

/**
 * @param {string} hexPath
 */
function bundleHintsForHex(hexPath) {
  const dir = path.dirname(hexPath);
  /** @type {{ axf?: string; map?: string }} */
  const bundle = {};
  for (const name of ['firmware.axf', 'project.axf']) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) {
      bundle.axf = path.basename(p);
      break;
    }
  }
  for (const name of ['firmware.map', 'project.map']) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) {
      bundle.map = path.basename(p);
      break;
    }
  }
  return bundle;
}

/**
 * @param {string} hexPath
 * @param {ReturnType<typeof import('../session').createSessionManager>} session
 */
/**
 * @param {vscode.Webview} webview
 * @param {vscode.Uri} extensionUri
 */
function hexViewerMediaUri(webview, extensionUri, fileName) {
  return webview
    .asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'hex-viewer', fileName))
    .toString();
}

/**
 * @param {string} hexPath
 * @param {ReturnType<typeof import('../session').createSessionManager>} session
 * @param {vscode.Webview | null} webview
 * @param {vscode.Uri | null} extensionUri
 */
function renderDocument(hexPath, session, webview, extensionUri) {
  const text = fs.readFileSync(hexPath, 'utf8');
  const model = buildHexViewModel(text);
  const cur = session.getSession();
  const sessionActive =
    Boolean(cur?.hexPath) && path.resolve(cur.hexPath) === path.resolve(hexPath);
  const firmware = resolveHexFirmware(hexPath, session);
  const config = vscode.workspace.getConfiguration('firmlens');
  const html = renderHexViewerHtml(model, {
    fileName: path.basename(hexPath),
    sessionActive,
    bundle: bundleHintsForHex(hexPath),
    firmware,
    limits: {
      maxStructFields: config.get('maxStructFields', 32),
      maxReadBytes: config.get('maxReadBytes', 256),
    },
    recordsScriptUri:
      webview && extensionUri ? hexViewerMediaUri(webview, extensionUri, 'records-collapse.js') : undefined,
    tooltipScriptUri:
      webview && extensionUri ? hexViewerMediaUri(webview, extensionUri, 'hex-tooltips.js') : undefined,
    symbolsScriptUri:
      webview && extensionUri ? hexViewerMediaUri(webview, extensionUri, 'symbols-tree.js') : undefined,
  });
  const rowCount = model.sections.reduce((n, s) => n + s.rows.length, 0);
  outputChannel?.appendLine(
    `[hex viewer] ${path.basename(hexPath)}: ${model.sections.length} sections, ${rowCount} rows, html ${html.length} bytes`,
  );
  return html;
}

/**
 * @param {ReturnType<typeof import('../session').createSessionManager>} session
 * @param {vscode.ExtensionContext} context
 */
function registerHexViewer(session, context) {
  outputChannel = vscode.window.createOutputChannel('FirmLens');
  context.subscriptions.push(outputChannel);

  const provider = new (class {
    /**
     * @param {vscode.Uri} uri
     */
    openCustomDocument(uri) {
      return {
        uri,
        dispose() {},
      };
    }

    /**
     * @param {{ uri: vscode.Uri }} document
     * @param {vscode.WebviewPanel} webviewPanel
     */
    async resolveCustomEditor(document, webviewPanel) {
      const hexPath = document.uri.fsPath;
      outputChannel?.appendLine(`[hex viewer] open ${hexPath}`);

      webviewPanel.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'media'),
        ],
      };

      const refresh = () => {
        try {
          webviewPanel.webview.html = renderDocument(
            hexPath,
            session,
            webviewPanel.webview,
            context.extensionUri,
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          outputChannel?.appendLine(`[hex viewer] error: ${message}`);
          vscode.window.showErrorMessage(`FirmLens hex viewer: ${message}`);
          webviewPanel.webview.html = `<!DOCTYPE html><body><pre>${message}</pre></body>`;
        }
      };

      refresh();

      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(path.dirname(hexPath), path.basename(hexPath)),
      );
      watcher.onDidChange(refresh);
      watcher.onDidCreate(refresh);
      webviewPanel.onDidDispose(() => watcher.dispose());
    }
  })();

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(VIEW_TYPE, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );
}

module.exports = {
  registerHexViewer,
  VIEW_TYPE,
};