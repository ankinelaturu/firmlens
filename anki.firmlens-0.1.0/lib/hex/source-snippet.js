/**
 * @fileoverview Read declaration neighborhood from workspace sources for hex tooltips.
 */

const fs = require('fs');
const path = require('path');
const { basename } = require('../dwarf/dwarf-index');
const {
  buildDeclFileCandidates,
  declLineMatchesSymbol,
  globalNameForGoto,
} = require('./resolve-decl-source');
const { highlightCLineHtml } = require('./c-syntax-html');

const CONTEXT_BEFORE = 5;
const CONTEXT_AFTER = 5;
const MAX_LINE_CHARS = 76;
const MAX_SOURCE_FILES = 220;

/**
 * @param {string} line
 */
function displayLineText(line) {
  const normalized = String(line).replace(/\t/g, '  ').replace(/\s+$/g, '');
  if (normalized.length <= MAX_LINE_CHARS) {
    return { text: normalized, truncated: false };
  }
  return { text: `${normalized.slice(0, MAX_LINE_CHARS - 1)}…`, truncated: true };
}

/**
 * @param {string} s
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {string} dir
 * @param {number} budget
 * @param {Set<string>} skipDirNames
 * @returns {string[]}
 */
function collectSourceFilesUnder(dir, budget, skipDirNames) {
  /** @type {string[]} */
  const out = [];
  if (!fs.existsSync(dir)) return out;

  /** @type {string[]} */
  const stack = [dir];
  while (stack.length && out.length < budget) {
    const cur = stack.pop();
    if (!cur) break;
    let entries;
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (out.length >= budget) break;
      const full = path.join(cur, ent.name);
      if (ent.isDirectory()) {
        if (skipDirNames.has(ent.name)) continue;
        stack.push(full);
      } else if (ent.isFile() && /\.(c|cpp|h|hpp)$/i.test(ent.name)) {
        out.push(full);
      }
    }
  }
  return out;
}

/**
 * @param {string[]} roots
 */
function collectSourceFiles(roots) {
  const skip = new Set(['node_modules', '.git', 'build', 'dist', '.cursor']);
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {string[]} */
  const out = [];
  for (const root of roots) {
    for (const file of collectSourceFilesUnder(root, MAX_SOURCE_FILES - out.length, skip)) {
      const key = path.resolve(file);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(key);
      if (out.length >= MAX_SOURCE_FILES) return out;
    }
  }
  return out;
}

/**
 * @param {string[]} roots
 * @param {string} declFile
 * @param {number} declLine
 * @param {string} dwarfName
 * @param {{from:string,to:string}[]} remaps
 * @returns {string | null}
 */
function resolveDeclFilePath(roots, declFile, declLine, dwarfName, remaps) {
  const df = String(declFile || '');
  for (const root of roots) {
    for (const candidate of buildDeclFileCandidates(root, df, remaps)) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  if (declLine <= 0) return null;
  for (const file of collectSourceFiles(roots)) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = text.split(/\r?\n/);
    const idx = declLine - 1;
    if (idx < 0 || idx >= lines.length) continue;
    if (declLineMatchesSymbol(lines[idx], dwarfName)) return file;
  }

  const global = globalNameForGoto(dwarfName);
  if (!global) return null;
  for (const file of collectSourceFiles(roots)) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = text.split(/\r?\n/);
    const idx = declLine - 1;
    if (idx < 0 || idx >= lines.length) continue;
    if (lines[idx].includes(global)) return file;
  }

  return null;
}

/**
 * @param {string} filePath
 * @param {number} declLine1
 */
function readContextLines(filePath, declLine1) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const center = Math.max(0, declLine1 - 1);
  const start = Math.max(0, center - CONTEXT_BEFORE);
  const end = Math.min(lines.length - 1, center + CONTEXT_AFTER);
  /** @type {{ lineNo: number; text: string; truncated: boolean; focus: boolean }[]} */
  const slice = [];
  for (let i = start; i <= end; i += 1) {
    const { text: rowText, truncated } = displayLineText(lines[i] ?? '');
    slice.push({
      lineNo: i + 1,
      text: rowText,
      truncated,
      focus: i === center,
    });
  }
  return { lines: slice, displayPath: basename(filePath) };
}

/**
 * @param {{ lines: { lineNo: number; text: string; truncated: boolean; focus: boolean }[]; displayPath: string }} ctx
 * @param {number} declLine
 */
function formatSnippetHtml(ctx, declLine) {
  /** @type {string[]} */
  const rows = [];
  for (const row of ctx.lines) {
    const cls = row.focus ? 'fl-tip-src-row fl-tip-src-focus' : 'fl-tip-src-row';
    const bodyCls = row.truncated ? 'fl-tip-src-line fl-tip-src-trunc' : 'fl-tip-src-line';
    rows.push(
      `<div class="${cls}">` +
        `<span class="fl-tip-gutter">${row.lineNo}</span>` +
        `<span class="${bodyCls}">${highlightCLineHtml(row.text)}</span>` +
        `</div>`,
    );
  }
  return (
    `<div class="fl-tip-src">` +
    `<div class="fl-tip-file">${escapeHtml(ctx.displayPath)}<span class="fl-tip-file-line"> · line ${declLine}</span></div>` +
  `<div class="fl-tip-src-view">${rows.join('')}</div>` +
    `</div>`
  );
}

/**
 * @param {{ lines: { lineNo: number; text: string; truncated: boolean; focus: boolean }[]; displayPath: string }} ctx
 */
function formatSnippetPlain(ctx) {
  return ctx.lines.map((r) => `${r.lineNo}: ${r.text}`).join('\n');
}

/**
 * @param {string[]} sourceRoots
 * @param {{from:string,to:string}[]} [remaps]
 */
function createSourceSnippetCache(sourceRoots, remaps = []) {
  /** @type {Map<string, { html: string; plain: string } | null>} */
  const cache = new Map();
  const roots = sourceRoots.map((r) => path.resolve(r)).filter((r) => fs.existsSync(r));

  /**
   * @param {string} declFile
   * @param {number} declLine
   * @param {string} dwarfName
   */
  function getSnippet(declFile, declLine, dwarfName) {
    const line = Number(declLine) || 0;
    if (!dwarfName || line <= 0) return null;
    const key = `${dwarfName}|${declFile}|${line}`;
    if (cache.has(key)) return cache.get(key) || null;

    const filePath = resolveDeclFilePath(roots, declFile, line, dwarfName, remaps);
    if (!filePath) {
      cache.set(key, null);
      return null;
    }
    try {
      const ctx = readContextLines(filePath, line);
      const snippet = {
        html: formatSnippetHtml(ctx, line),
        plain: formatSnippetPlain(ctx),
      };
      cache.set(key, snippet);
      return snippet;
    } catch {
      cache.set(key, null);
      return null;
    }
  }

  return { getSnippet };
}

module.exports = {
  createSourceSnippetCache,
  resolveDeclFilePath,
  readContextLines,
  formatSnippetHtml,
  CONTEXT_BEFORE,
  CONTEXT_AFTER,
  MAX_LINE_CHARS,
};