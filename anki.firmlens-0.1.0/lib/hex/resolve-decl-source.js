/**
 * @fileoverview Resolve DWARF declaration paths for opening editor files.
 */

const path = require('path');
const { normalizePath, basename } = require('../dwarf/dwarf-index');

/**
 * @param {string} dwarfPath
 * @param {{from:string,to:string}[]} remaps
 */
function applySourceRootRemap(dwarfPath, remaps) {
  let p = normalizePath(dwarfPath);
  for (const { from, to } of remaps) {
    const fromNorm = normalizePath(from);
    if (p.startsWith(fromNorm)) {
      p = normalizePath(to) + p.slice(fromNorm.length);
      break;
    }
  }
  return p;
}

/**
 * @param {string} workspaceRoot
 * @param {string} declFile
 * @param {{from:string,to:string}[]} remaps
 * @returns {string[]}
 */
function buildDeclFileCandidates(workspaceRoot, declFile, remaps) {
  const df = String(declFile || '');
  if (!df || /^\d+$/.test(df)) return [];

  const root = path.resolve(workspaceRoot);
  const mapped = applySourceRootRemap(df, remaps);
  const norm = normalizePath(mapped);
  const base = basename(norm);

  /** @type {string[]} */
  const out = [];
  if (path.isAbsolute(mapped)) out.push(path.normalize(mapped));
  out.push(path.join(root, norm));
  out.push(path.join(root, base));
  const parts = norm.split('/').filter(Boolean);
  if (parts.length >= 2) {
    out.push(path.join(root, parts.slice(-2).join(path.sep)));
  }
  if (parts.length >= 1) {
    out.push(path.join(root, parts[parts.length - 1]));
  }
  return [...new Set(out.map((p) => path.normalize(p)))];
}

/**
 * @param {string} dwarfName
 */
function globalNameForGoto(dwarfName) {
  const dot = dwarfName.indexOf('.');
  return dot >= 0 ? dwarfName.slice(0, dot) : dwarfName;
}

/**
 * Identifier to highlight on the declaration line (member short name or global).
 * @param {string} dwarfName
 */
function gotoLookupName(dwarfName) {
  const dot = dwarfName.indexOf('.');
  if (dot < 0) return dwarfName;
  const rest = dwarfName.slice(dot + 1);
  if (rest.startsWith('(padding)')) return '';
  return rest;
}

/**
 * @param {string} lineText
 * @param {string} dwarfName
 */
function declLineMatchesSymbol(lineText, dwarfName) {
  const global = globalNameForGoto(dwarfName);
  return Boolean(global) && lineText.includes(global);
}

/**
 * @param {string} dwarfName
 */
function canGotoSymbol(dwarfName, declLine, unknown, isPadding) {
  if (unknown || isPadding) return false;
  const line = Number(declLine) || 0;
  return line > 0 && Boolean(dwarfName);
}

module.exports = {
  applySourceRootRemap,
  buildDeclFileCandidates,
  globalNameForGoto,
  gotoLookupName,
  declLineMatchesSymbol,
  canGotoSymbol,
};