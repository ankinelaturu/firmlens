/**
 * @fileoverview Stable symbol colors for hex viewer byte highlights.
 */

const { symbolAtAddress } = require('./viewer-decode');

/** @typedef {import('./symbol-intervals').SymbolInterval} SymbolInterval */

/** @type {readonly number[]} */
const HUE_PALETTE = [0, 28, 56, 88, 118, 148, 178, 208, 238, 268, 298, 328];

const MIN_ADJACENT_HUE_SEP = 48;

/**
 * @param {string} name
 */
function symbolHue(name) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (h * 33 + name.charCodeAt(i)) % 360;
  }
  return h;
}

/**
 * @param {number} a
 * @param {number} b
 */
function hueDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

/**
 * @param {SymbolInterval[]} intervals
 * @returns {{ name: string; start: number; end: number }[]}
 */
function buildSymbolRuns(intervals) {
  if (!intervals.length) return [];
  /** @type {number[]} */
  const bounds = [];
  for (const s of intervals) {
    bounds.push(s.start);
    if (s.end > s.start) bounds.push(s.end);
  }
  const sorted = [...new Set(bounds)].sort((a, b) => a - b);
  /** @type {{ name: string; start: number; end: number }[]} */
  const runs = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const lo = sorted[i];
    const hi = sorted[i + 1];
    if (hi <= lo) continue;
    const sym = symbolAtAddress(intervals, lo);
    if (!sym) continue;
    const last = runs[runs.length - 1];
    if (last && last.name === sym.name && last.end === lo) {
      last.end = hi;
    } else {
      runs.push({ name: sym.name, start: lo, end: hi });
    }
  }
  return runs;
}

/**
 * Assign hues so consecutive memory runs use contrasting colors.
 * @param {SymbolInterval[]} intervals
 * @returns {Map<string, number>}
 */
function buildSymbolHueMap(intervals) {
  /** @type {Map<string, number>} */
  const map = new Map();
  if (!intervals.length) return map;

  const runs = buildSymbolRuns(intervals);
  /** @type {Map<string, Set<string>>} */
  const adj = new Map();
  for (let i = 0; i < runs.length - 1; i += 1) {
    const a = runs[i].name;
    const b = runs[i + 1].name;
    if (a === b) continue;
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b);
    adj.get(b).add(a);
  }

  const unique = [...new Set(intervals.filter((s) => s.typeLabel !== 'padding').map((s) => s.name))];
  const order = [...unique].sort(
    (a, b) => (adj.get(b)?.size || 0) - (adj.get(a)?.size || 0) || a.localeCompare(b),
  );

  for (const name of order) {
    const preferred = symbolHue(name);
    const neighborHues = [...(adj.get(name) || [])]
      .map((n) => map.get(n))
      .filter((h) => h !== undefined);

    /** @type {number | null} */
    let chosen = null;
    /** @type {number} */
    let bestScore = -1;

    for (const slot of HUE_PALETTE) {
      const minNeighbor = neighborHues.length
        ? Math.min(...neighborHues.map((h) => hueDistance(slot, h)))
        : 360;
      if (neighborHues.length && minNeighbor < MIN_ADJACENT_HUE_SEP) continue;
      const stability = 360 - hueDistance(slot, preferred);
      const score = minNeighbor * 2 + stability;
      if (score > bestScore) {
        chosen = slot;
        bestScore = score;
      }
    }

    if (chosen == null) {
      for (const slot of HUE_PALETTE) {
        const minNeighbor = neighborHues.length
          ? Math.min(...neighborHues.map((h) => hueDistance(slot, h)))
          : 360;
        const score = minNeighbor;
        if (score > bestScore) {
          chosen = slot;
          bestScore = score;
        }
      }
    }

    map.set(name, chosen ?? preferred);
  }

  for (const s of intervals) {
    if (!map.has(s.name)) map.set(s.name, symbolHue(s.name));
  }
  return map;
}

/**
 * @param {string} name
 * @param {Map<string, number> | undefined} hueMap
 */
function resolveHue(name, hueMap) {
  if (hueMap?.has(name)) return hueMap.get(name);
  const root = name.includes('.') ? name.split('.')[0] : name;
  if (hueMap?.has(root)) return hueMap.get(root);
  return symbolHue(name);
}

/**
 * DWARF interval / tree name to use for shared global hue.
 * @param {string} [dwarfName]
 */
function hueKeyForSymbol(dwarfName) {
  if (!dwarfName) return '';
  if (!dwarfName.includes('.')) return dwarfName;
  return dwarfName.split('.')[0];
}

/**
 * @param {string} name
 * @param {Map<string, number> | undefined} [hueMap]
 * @returns {string}
 */
function symbolByteStyle(name, hueMap) {
  const h = resolveHue(name, hueMap);
  return `background: hsla(${h}, 52%, 42%, 0.42);`;
}

/**
 * @param {string} name
 * @param {Map<string, number> | undefined} [hueMap]
 * @returns {string}
 */
function symbolGutterStyle(name, hueMap) {
  const h = resolveHue(name, hueMap);
  return `border-left: 3px solid hsl(${h}, 58%, 58%);`;
}

/**
 * @returns {string}
 */
function paddingByteStyle() {
  return 'background: repeating-linear-gradient(-45deg, rgba(120,120,120,0.18), rgba(120,120,120,0.18) 4px, rgba(90,90,90,0.22) 4px, rgba(90,90,90,0.22) 8px);';
}

/**
 * @returns {string}
 */
function paddingGutterStyle() {
  return 'border-left: 3px dashed rgba(140, 140, 140, 0.55);';
}

/**
 * @param {string} name
 * @param {Map<string, number> | undefined} [hueMap]
 */
function symbolRowHueVar(name, hueMap) {
  const key = hueKeyForSymbol(name) || name;
  const h = resolveHue(key, hueMap);
  return `--fl-sym-h:${h}`;
}

module.exports = {
  symbolByteStyle,
  symbolGutterStyle,
  paddingByteStyle,
  paddingGutterStyle,
  symbolHue,
  resolveHue,
  hueKeyForSymbol,
  symbolRowHueVar,
  buildSymbolHueMap,
  buildSymbolRuns,
  hueDistance,
};