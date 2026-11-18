/**
 * @fileoverview Resolve snapshot bundle under workspace deploy/ or build/.
 */

const fs = require('fs');
const path = require('path');

/** @typedef {import('./resolve-paths').ResolvedAutoLoadPaths} ResolvedAutoLoadPaths */

/**
 * @param {string} dir
 * @param {string[]} names
 */
function firstExistingFile(dir, names) {
  for (const name of names) {
    const full = path.join(dir, name);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      return full;
    }
  }
  return null;
}

/**
 * @param {string} dir
 * @param {string[]} suffixes
 */
function firstBySuffix(dir, suffixes) {
  if (!fs.existsSync(dir)) return null;
  /** @type {string[]} */
  const files = fs.readdirSync(dir).filter((f) => suffixes.some((s) => f.endsWith(s)));
  files.sort();
  if (files.length === 0) return null;
  return path.join(dir, files[0]);
}

/**
 * @param {string} workspaceRoot
 * @param {string[]} dirCandidates
 * @returns {ResolvedAutoLoadPaths | null}
 */
function resolveDeployBundleAt(workspaceRoot, dirCandidates) {
  for (const dirName of dirCandidates) {
    const base = path.join(workspaceRoot, dirName);
    if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) {
      continue;
    }
    const hexPath =
      firstExistingFile(base, ['snapshot.hex', 'project_snapshot.hex']) ||
      firstBySuffix(base, ['.hex']);
    const axfPath =
      firstExistingFile(base, ['firmware.axf', 'project.axf']) ||
      firstBySuffix(base, ['.axf', '.elf', '.out']);
    if (!hexPath || !axfPath) {
      continue;
    }
    const mapPath =
      firstExistingFile(base, ['firmware.map', 'project.map']) ||
      firstBySuffix(base, ['.map']);
    const metadataPath = firstExistingFile(base, ['metadata.json', 'metadata.example.json']);
    return {
      hexPath,
      axfPath,
      mapPath,
      metadataPath,
    };
  }
  return null;
}

/**
 * @param {string[]} [preferredDirNames]
 * @returns {ResolvedAutoLoadPaths | null}
 */
function resolveDeployBundle(preferredDirNames) {
  const dirs = [...new Set((preferredDirNames || []).filter(Boolean))];
  if (dirs.length === 0) {
    dirs.push('deploy', 'build');
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
    const hit = resolveDeployBundleAt(folder.uri.fsPath, dirs);
    if (hit) return hit;
  }
  return null;
}

module.exports = {
  resolveDeployBundle,
  resolveDeployBundleAt,
  firstExistingFile,
};