/**
 * @fileoverview Read-only FirmLens AXF inspector (does not auto-load snapshot session).
 */

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { summarizeAxf } = require('../../lib/elf/summarize-axf');
const { renderAxfInspectorHtml } = require('../../lib/elf/render-axf-html');

const VIEW_TYPE = 'firmlens.axfInspector';

/**
 * @param {vscode.Webview} webview
 * @param {vscode.Uri} extensionUri
 * @param {string} fileName
 */
function mediaUri(webview, extensionUri, fileName) {
  return webview
    .asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'axf-viewer', fileName))
    .toString();
}

/**
 * @param {string} axfPath
 * @param {ReturnType<typeof import('../session').createSessionManager>} session
 */
function sessionUiForAxf(axfPath, session) {
  const cur = session.getSession();
  if (!cur?.axfPath) {
    return { sessionMatches: false, sessionLabel: null };
  }
  const matches = path.resolve(cur.axfPath) === path.resolve(axfPath);
  return {
    sessionMatches: matches,
    sessionLabel: matches ? cur.snapshotLabel : null,
  };
}

/**
 * @param {string} axfPath
 * @param {ReturnType<typeof import('../session').createSessionManager>} session
 * @param {vscode.Webview} webview
 * @param {vscode.Uri} extensionUri
 */
function renderAxfDocument(axfPath, session, webview, extensionUri) {
  const summary = summarizeAxf(axfPath);
  const ui = sessionUiForAxf(axfPath, session);
  return renderAxfInspectorHtml(summary, {
    ...ui,
    scriptUri: mediaUri(webview, extensionUri, 'axf-viewer.js'),
  });
}

/**
 * @param {ReturnType<typeof import('../session').createSessionManager>} session
 * @param {vscode.ExtensionContext} context
 */
function registerAxfViewer(session, context) {
  const provider = new (class {
    openCustomDocument(uri) {
      return { uri, dispose() {} };
    }

    async resolveCustomEditor(document, webviewPanel) {
      const axfPath = document.uri.fsPath;
      webviewPanel.webview.options = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      };

      const refresh = () => {
        try {
          webviewPanel.webview.html = renderAxfDocument(
            axfPath,
            session,
            webviewPanel.webview,
            context.extensionUri,
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          webviewPanel.webview.html = `<!DOCTYPE html><body><pre>${message}</pre></body>`;
          vscode.window.showErrorMessage(`FirmLens AXF inspector: ${message}`);
        }
      };

      refresh();

      webviewPanel.webview.onDidReceiveMessage((msg) => {
        if (msg?.type === 'copyAddress' && msg.address) {
          void vscode.env.clipboard.writeText(String(msg.address));
          void vscode.window.showInformationMessage(`Copied ${msg.address}`);
          return;
        }
        if (msg?.type === 'loadSnapshotBundle') {
          if (!msg.hexPath || !fs.existsSync(msg.hexPath)) {
            void vscode.window.showWarningMessage(
              'FirmLens: no sibling HEX file — use Load Snapshot or place snapshot.hex next to this AXF.',
            );
            return;
          }
          if (!msg.axfPath || !fs.existsSync(msg.axfPath)) {
            void vscode.window.showErrorMessage('FirmLens: AXF path missing.');
            return;
          }
          void session
            .loadSnapshotFromPaths(
              {
                hexPath: msg.hexPath,
                axfPath: msg.axfPath,
                mapPath: msg.mapPath || null,
                metadataPath: msg.metadataPath || null,
              },
              { quiet: false },
            )
            .then((ok) => {
              if (ok) {
                refresh();
              }
            });
        }
      });

      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(path.dirname(axfPath), path.basename(axfPath)),
      );
      watcher.onDidChange(refresh);
      webviewPanel.onDidDispose(() => watcher.dispose());

      const sub = session.onDidChange(() => refresh());
      webviewPanel.onDidDispose(() => sub.dispose());
    }
  })();

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(VIEW_TYPE, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand('firmlens.openAxfInspector', async () => {
      const active = vscode.window.activeTextEditor?.document.uri;
      if (active && /\.(axf|elf|out)$/i.test(active.fsPath)) {
        await vscode.commands.executeCommand('vscode.openWith', active, VIEW_TYPE);
        return;
      }
      const picked = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { 'ELF / AXF': ['axf', 'elf', 'out'], All: ['*'] },
        title: 'Open with FirmLens AXF Inspector',
      });
      if (picked?.[0]) {
        await vscode.commands.executeCommand('vscode.openWith', picked[0], VIEW_TYPE);
      }
    }),
  );
}

module.exports = {
  registerAxfViewer,
  VIEW_TYPE,
};