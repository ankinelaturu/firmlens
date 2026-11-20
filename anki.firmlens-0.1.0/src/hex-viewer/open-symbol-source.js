/**
 * @fileoverview Open workspace source at DWARF declaration from the Symbols tab.
 */

// @ts-check
const vscode = require('vscode');
const fs = require('fs');
const {
  buildDeclFileCandidates,
  declLineMatchesSymbol,
  globalNameForGoto,
} = require('../../lib/hex/resolve-decl-source');
const { resolveHexFirmware } = require('../../lib/hex/resolve-hex-firmware');

/**
 * @param {string} declFile
 * @param {number} declLine
 * @param {string} dwarfName
 * @param {{from:string,to:string}[]} remaps
 */
async function resolveSourceDocumentUri(declFile, declLine, dwarfName, remaps) {
  const folders = vscode.workspace.workspaceFolders;
  if (folders?.length) {
    for (const folder of folders) {
      for (const candidate of buildDeclFileCandidates(folder.uri.fsPath, declFile, remaps)) {
        if (fs.existsSync(candidate)) {
          return vscode.Uri.file(candidate);
        }
      }
    }
  }

  if (declLine <= 0) return null;

  const files = await vscode.workspace.findFiles(
    '**/*.{c,cpp,h,hpp}',
    '**/{node_modules,.git,build,dist}/**',
    250,
  );
  for (const uri of files) {
    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      const idx = declLine - 1;
      if (idx < 0 || idx >= doc.lineCount) continue;
      const lineText = doc.lineAt(idx).text;
      if (declLineMatchesSymbol(lineText, dwarfName)) return uri;
    } catch {
      /* skip unreadable */
    }
  }

  return null;
}

/**
 * @param {object} opts
 * @param {string} opts.hexPath
 * @param {ReturnType<typeof import('../session').createSessionManager>} opts.session
 * @param {string} opts.dwarfName
 * @param {number} opts.declLine
 * @param {string} [opts.declFile]
 */
async function openSymbolSource(opts) {
  const { hexPath, session, dwarfName, declLine, declFile } = opts;
  const line = Math.max(0, Number(declLine) || 0);
  if (!dwarfName || line <= 0) {
    vscode.window.showWarningMessage('FirmLens: no declaration line in DWARF for this symbol.');
    return;
  }

  const firmware = resolveHexFirmware(hexPath, session);
  if (!firmware?.dwarf) {
    vscode.window.showWarningMessage('FirmLens: load firmware (AXF) to resolve symbol declarations.');
    return;
  }

  const config = vscode.workspace.getConfiguration('firmlens');
  const remaps = /** @type {{from:string,to:string}[]} */ (config.get('sourceRootRemap', []));

  let df = String(declFile || '');
  if (!df) {
    const global = globalNameForGoto(dwarfName);
    const hits = firmware.dwarf.byName(global);
    const v = hits.find((h) => h.name === global) || hits[0];
    df = v ? String(v.declFile || '') : '';
  }

  const uri = await resolveSourceDocumentUri(df, line, dwarfName, remaps);
  if (!uri) {
    vscode.window.showWarningMessage(
      `FirmLens: could not find source for ${dwarfName} (decl line ${line}). Try firmlens.sourceRootRemap.`,
    );
    return;
  }

  const doc = await vscode.workspace.openTextDocument(uri);
  const lineIndex = Math.min(line - 1, Math.max(0, doc.lineCount - 1));
  const position = new vscode.Position(lineIndex, 0);
  await vscode.window.showTextDocument(doc, {
    selection: new vscode.Range(position, position),
    viewColumn: vscode.ViewColumn.Beside,
    preserveFocus: false,
  });
}

module.exports = {
  openSymbolSource,
  resolveSourceDocumentUri,
};