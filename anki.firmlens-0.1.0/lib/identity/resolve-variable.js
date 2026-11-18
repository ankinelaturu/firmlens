/**
 * @fileoverview Match hovered identifier to DWARF variable entries.
 */

const { dwarfPathMatchesEditor, basename } = require('../dwarf/dwarf-index');

/**
 * @param {object} opts
 * @param {string} opts.editorPath
 * @param {number} opts.line1Based
 * @param {string} opts.word
 * @param {import('../dwarf/dwarf-index').DwarfIndex} opts.dwarf
 * @param {{from:string,to:string}[]} opts.remaps
 * @returns {{variable: import('../dwarf/dwarf-index').DwarfVariable | null, reason?: string}}
 */
function resolveGlobalVariable(opts) {
  const { editorPath, line1Based, word, dwarf, remaps } = opts;
  const hits = dwarf.byName(word);
  if (hits.length === 0) {
    return { variable: null, reason: 'No DWARF global with this name.' };
  }

  const fileMatches = hits.filter((v) => {
    const df = String(v.declFile);
    if (/^\d+$/.test(df)) {
      return true;
    }
    return dwarfPathMatchesEditor(editorPath, df, remaps);
  });

  const pool = fileMatches.length > 0 ? fileMatches : hits;

  if (pool.length === 1) {
    return { variable: pool[0] };
  }

  const byLine = pool.filter((v) => v.declLine === line1Based);
  if (byLine.length === 1) {
    return { variable: byLine[0] };
  }

  const scored = pool
    .map((v) => ({ v, d: Math.abs(v.declLine - line1Based) }))
    .sort((a, b) => a.d - b.d);
  if (scored.length >= 2 && scored[0].d === scored[1].d && scored[0].d > 2) {
    return { variable: null, reason: 'Ambiguous symbol; refine source-root remap or use declaration line.' };
  }
  return { variable: scored[0].v };
}

module.exports = {
  resolveGlobalVariable,
  basename,
};