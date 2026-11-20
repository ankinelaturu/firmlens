/**
 * @fileoverview Decode strings for hex viewer tooltips.
 */

const { decodeAt } = require('../decode/decode-value');
const { basename } = require('../dwarf/dwarf-index');
const { declHint } = require('../hover/format-markdown');
const { highlightCLineHtml } = require('./c-syntax-html');
const {
  isPaddingInterval,
  paddingParentName,
  formatTypeLabel,
} = require('./symbol-intervals');

/**
 * @typedef {import('./hex-memory').HexMemory} HexMemory
 * @typedef {import('../dwarf/dwarf-index').DwarfIndex} DwarfIndex
 * @typedef {import('../dwarf/dwarf-index').DwarfVariable} DwarfVariable
 * @typedef {import('../dwarf/dwarf-index').TypeRef} TypeRef
 * @typedef {import('./symbol-intervals').SymbolInterval} SymbolInterval
 */

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
 * @param {TypeRef | undefined} type
 */
function typeDeclName(type) {
  if (!type) return 'unknown';
  if (type.typeName) return type.typeName;
  if (type.kind === 'pointer' && type.pointee?.typeName) return `${type.pointee.typeName} *`;
  if (type.kind === 'array') return type.typeName || 'array';
  return type.kind;
}

/**
 * @param {SymbolInterval} sym
 * @param {DwarfVariable | null} global
 */
function syntheticDecl(sym, global) {
  if (sym.name.includes('.') && global?.type?.kind === 'struct') {
    const member = sym.name.slice(global.name.length + 1);
    const m = global.type.members?.find((x) => x.name === member);
    if (m) return `${typeDeclName(m.type)} ${member};`;
  }
  if (global) return `${typeDeclName(global.type)} ${global.name};`;
  const short = sym.name.includes('.') ? sym.name.slice(sym.name.lastIndexOf('.') + 1) : sym.name;
  return `${sym.typeLabel} ${short};`;
}

/**
 * @param {DwarfVariable | null} global
 * @param {SymbolInterval} sym
 */
function declSourceLine(global, sym) {
  const v = global || {
    name: sym.name,
    declFile: sym.declFile,
    declLine: sym.declLine,
    address: sym.start,
    type: { kind: 'unknown', typeName: sym.typeLabel },
  };
  return declHint(/** @type {DwarfVariable} */ (v));
}

/**
 * @param {DwarfIndex} dwarf
 * @param {string} axfPath
 */
function resolveAddressSize(dwarf) {
  if (dwarf?.addressSize) return /** @type {32|64} */ (dwarf.addressSize === 64 ? 64 : 32);
  return /** @type {32} */ (32);
}

/**
 * @param {HexMemory} memory
 * @param {DwarfIndex} dwarf
 * @param {SymbolInterval} sym
 * @param {number} byteAddress
 * @param {{ maxStructFields: number, maxReadBytes: number }} limits
 * @param {string} _axfPath
 * @param {ReturnType<typeof import('./source-snippet').createSourceSnippetCache> | null} [snippetCache]
 * @returns {{ plain: string; html: string }}
 */
function formatViewerTooltip(memory, dwarf, sym, byteAddress, limits, _axfPath, snippetCache) {
  const offset = byteAddress - sym.start;
  if (offset < 0 || byteAddress >= sym.end) return { plain: '', html: '' };

  if (isPaddingInterval(sym)) {
    const parent = paddingParentName(sym);
    const global = dwarf.variables.find((v) => v.name === parent) || null;
    const parentType = global ? formatTypeLabel(global) : 'struct';
    const relOff = global ? byteAddress - global.address : offset;
    const byteHex = memory.read(byteAddress, 1).bytes[0]?.toString(16).padStart(2, '0') ?? '??';
    const storage = `0x${byteAddress.toString(16).toUpperCase()}`;
    const titleHtml =
      `${escapeHtml(parent)} <span class="fl-tip-pill">padding</span>` +
      (relOff > 0 ? `<span class="fl-tip-off">+0x${relOff.toString(16)}</span>` : '');
    const plain = `${parent} (padding)+0x${relOff.toString(16)}\n${parentType} layout · byte 0x${byteHex}`;
    const html =
      `<div class="fl-tip-inner">` +
      `<div class="fl-tip-title">${titleHtml}</div>` +
      `<div class="fl-tip-meta">Struct layout padding in <span class="fl-tip-mono">${escapeHtml(parentType)}</span> · ` +
      `parent <span class="fl-tip-mono">${escapeHtml(parent)}</span></div>` +
      `<div class="fl-tip-meta">Byte at <span class="fl-tip-mono">${escapeHtml(storage)}</span> · snapshot <span class="fl-tip-mono">0x${escapeHtml(byteHex)}</span></div>` +
      `</div>`;
    return { plain, html };
  }

  const baseName = sym.name.split('.')[0];
  const global = dwarf.variables.find((v) => v.name === baseName) || null;
  if (!global) {
    const plain = sym.name;
    const html = `<div class="fl-tip-inner"><div class="fl-tip-title">${escapeHtml(sym.name)}</div></div>`;
    return { plain, html };
  }

  const storage = `0x${sym.start.toString(16).toUpperCase()}`;
  const le = dwarf.littleEndian !== false;
  const addressSize = resolveAddressSize(dwarf);
  const offsetHex = offset > 0 ? `+0x${offset.toString(16)}` : '';

  let type = global.type;
  let title = sym.name;
  if (sym.name.includes('.') && global.type?.kind === 'struct') {
    const member = sym.name.slice(global.name.length + 1);
    const m = global.type.members?.find((x) => x.name === member);
    if (m) type = m.type;
    title = sym.name;
  }

  /** @type {import('../decode/decode-value').DecodedValue | null} */
  let decoded = null;
  try {
    decoded = decodeAt(memory, sym.start, type, le, limits, addressSize);
  } catch {
    decoded = null;
  }

  const declLine = syntheticDecl(sym, global);
  const file = basename(String(sym.declFile || global.declFile || ''));
  const line = sym.declLine || global.declLine || 0;
  const hint = declSourceLine(global, sym);

  const titlePlain = offset > 0 ? `${title}${offsetHex}` : title;
  const titleHtml =
    offset > 0
      ? `${escapeHtml(title)}<span class="fl-tip-off">${escapeHtml(offsetHex)}</span>`
      : escapeHtml(title);

  /** @type {string[]} */
  const plainParts = [titlePlain, `${sym.typeLabel} · storage ${storage}`];
  if (hint) plainParts.push(hint, `${line}: ${declLine}`);
  if (decoded) {
    plainParts.push(`Snapshot: ${decoded.summary}`);
    for (const ln of decoded.lines.slice(0, 6)) plainParts.push(ln);
  }

  /** @type {string[]} */
  const htmlParts = [
    `<div class="fl-tip-inner">`,
    `<div class="fl-tip-title">${titleHtml}</div>`,
    `<div class="fl-tip-meta">${escapeHtml(sym.typeLabel)} · storage <span class="fl-tip-mono">${escapeHtml(storage)}</span></div>`,
  ];

  const snippet = snippetCache?.getSnippet(
    String(sym.declFile || global.declFile || ''),
    line,
    sym.name,
  );
  if (snippet) {
    if (hint) {
      htmlParts.push(`<div class="fl-tip-meta fl-tip-hint">${escapeHtml(hint)}</div>`);
    }
    htmlParts.push(snippet.html);
    plainParts.push(snippet.plain);
  } else if (file && line) {
    htmlParts.push(
      `<div class="fl-tip-code">`,
      `<div class="fl-tip-file">${escapeHtml(file)}</div>`,
      `<div class="fl-tip-line fl-tip-src-row">` +
        `<span class="fl-tip-gutter">${line}</span>` +
        `<span class="fl-tip-src-line">${highlightCLineHtml(declLine)}</span>` +
        `</div>`,
      `</div>`,
    );
  }

  if (decoded) {
    htmlParts.push(
      `<div class="fl-tip-section">`,
      `<div class="fl-tip-label">Snapshot</div>`,
      `<div class="fl-tip-mono fl-tip-summary">${escapeHtml(decoded.summary)}</div>`,
    );
    if (decoded.lines.length) {
      htmlParts.push(`<div class="fl-tip-mono fl-tip-lines">`);
      for (const ln of decoded.lines.slice(0, 8)) {
        htmlParts.push(`<div class="fl-tip-decode-line">${escapeHtml(ln)}</div>`);
      }
      htmlParts.push(`</div>`);
    }
    htmlParts.push(`</div>`);
  }

  htmlParts.push(`</div>`);

  return { plain: plainParts.join('\n'), html: htmlParts.join('') };
}

/**
 * @param {HexMemory} memory
 * @param {DwarfIndex} dwarf
 * @param {SymbolInterval} sym
 * @param {number} byteAddress
 * @param {{ maxStructFields: number, maxReadBytes: number }} limits
 * @param {string} axfPath
 * @returns {string}
 */
function tooltipForByte(memory, dwarf, sym, byteAddress, limits, axfPath) {
  return formatViewerTooltip(memory, dwarf, sym, byteAddress, limits, axfPath).plain;
}

/**
 * @param {DwarfIndex} dwarf
 * @param {string} name
 * @param {number} address
 */
function findVariable(dwarf, name, address) {
  return dwarf.variables.find((v) => v.name === name.split('.')[0] && v.address === address) || null;
}

/**
 * @param {HexMemory} memory
 * @param {DwarfIndex} dwarf
 * @param {SymbolInterval[]} intervals
 * @param {number} address
 * @param {{ maxStructFields: number, maxReadBytes: number }} limits
 * @param {string} axfPath
 */
function symbolAtAddress(intervals, address) {
  /** @type {SymbolInterval | null} */
  let best = null;
  let bestSize = Number.POSITIVE_INFINITY;
  for (const s of intervals) {
    if (address < s.start || address >= s.end) continue;
    const size = s.end - s.start;
    if (size <= bestSize) {
      best = s;
      bestSize = size;
    }
  }
  return best;
}

module.exports = {
  tooltipForByte,
  formatViewerTooltip,
  symbolAtAddress,
  findVariable,
};