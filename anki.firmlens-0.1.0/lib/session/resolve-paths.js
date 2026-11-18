/**
 * @fileoverview Resolve firmlens.autoLoadPaths relative to workspace folders.
 */

const fs = require('fs');
const path = require('path');
const { resolveDeployBundle } = require('./deploy-bundle');

/**
 * @typedef {object} ResolvedAutoLoadPaths
 * @property {string} hexPath
 * @property {string} axfPath
 * @property {string | null} mapPath
 * @property {string | null} metadataPath
 */

/**
 * @param {string} p
 * @returns {string | null}
 */
function resolveWorkspacePath(p) {
  const trimmed = String(p || '').trim();
  if (!trimmed) return null;
  if (path.isAbsolute(trimmed) && fs.existsSync(trimmed)) {
    return trimmed;
  }
  let vscode;
  try {
    vscode = require('vscode');
  } catch {
    return null;
  }
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    return null;
  }
  for (const folder of folders) {
    const candidate = path.join(folder.uri.fsPath, trimmed);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * @param {unknown} raw
 * @returns {ResolvedAutoLoadPaths | null}
 */
function resolveAutoLoadPaths(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const obj = /** @type {Record<string, unknown>} */ (raw);
  const hexPath = resolveWorkspacePath(String(obj.hex || obj.hexPath || ''));
  const axfPath = resolveWorkspacePath(String(obj.axf || obj.axfPath || ''));
  if (!hexPath || !axfPath) return null;
  const mapPath = resolveWorkspacePath(String(obj.map || obj.mapPath || ''));
  const metadataPath = resolveWorkspacePath(String(obj.metadata || obj.metadataPath || ''));
  return {
    hexPath,
    axfPath,
    mapPath: mapPath || null,
    metadataPath: metadataPath || null,
  };
}

/**
 * @param {unknown} rawAutoLoadPaths
 * @param {string} deployDirectory
 * @returns {ResolvedAutoLoadPaths | null}
 */
function resolveSessionBundle(rawAutoLoadPaths, deployDirectory) {
  const explicit = resolveAutoLoadPaths(rawAutoLoadPaths);
  if (explicit) return explicit;
  const dirs = [deployDirectory, 'deploy', 'build'].filter(Boolean);
  return resolveDeployBundle(dirs);
}

module.exports = {
  resolveAutoLoadPaths,
  resolveWorkspacePath,
  resolveSessionBundle,
};