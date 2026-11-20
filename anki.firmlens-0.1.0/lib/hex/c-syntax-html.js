/**
 * @fileoverview Lightweight C/C++ syntax coloring for tooltip HTML (single lines).
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

const KEYWORDS = new Set([
  'auto',
  'break',
  'case',
  'char',
  'const',
  'continue',
  'default',
  'do',
  'double',
  'else',
  'enum',
  'extern',
  'float',
  'for',
  'goto',
  'if',
  'inline',
  'int',
  'long',
  'register',
  'return',
  'short',
  'signed',
  'sizeof',
  'static',
  'struct',
  'switch',
  'typedef',
  'union',
  'unsigned',
  'void',
  'volatile',
  'while',
  '_Bool',
  '_Complex',
  '_Imaginary',
  'true',
  'false',
  'nullptr',
  'class',
  'namespace',
  'template',
  'typename',
  'public',
  'private',
  'protected',
  'virtual',
  'override',
  'constexpr',
  'noexcept',
  'alignas',
  'alignof',
  'decltype',
]);

const TYPES = new Set([
  'bool',
  'size_t',
  'ssize_t',
  'int8_t',
  'int16_t',
  'int32_t',
  'int64_t',
  'uint8_t',
  'uint16_t',
  'uint32_t',
  'uint64_t',
  'intptr_t',
  'uintptr_t',
  'time_t',
  'FILE',
]);

/**
 * @param {string} cls
 * @param {string} text
 */
function span(cls, text) {
  return `<span class="${cls}">${escapeHtml(text)}</span>`;
}

/**
 * @param {string} line
 */
function highlightCLineHtml(line) {
  if (!line) return ' ';
  /** @type {string[]} */
  const parts = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];

    if (ch === ' ' || ch === '\t') {
      let j = i + 1;
      while (j < line.length && (line[j] === ' ' || line[j] === '\t')) j += 1;
      parts.push(escapeHtml(line.slice(i, j)));
      i = j;
      continue;
    }

    if (line.startsWith('//', i)) {
      parts.push(span('fl-syn-com', line.slice(i)));
      break;
    }

    if (line.startsWith('/*', i)) {
      const end = line.indexOf('*/', i + 2);
      const j = end >= 0 ? end + 2 : line.length;
      parts.push(span('fl-syn-com', line.slice(i, j)));
      i = j;
      continue;
    }

    if (ch === '#') {
      let j = i + 1;
      while (j < line.length && line[j] !== ' ' && line[j] !== '\t' && line[j] !== '<') j += 1;
      parts.push(span('fl-syn-pp', line.slice(i, j)));
      i = j;
      continue;
    }

    if (ch === '"') {
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '\\' && j + 1 < line.length) {
          j += 2;
          continue;
        }
        if (line[j] === '"') {
          j += 1;
          break;
        }
        j += 1;
      }
      parts.push(span('fl-syn-str', line.slice(i, j)));
      i = j;
      continue;
    }

    if (ch === "'") {
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '\\' && j + 1 < line.length) {
          j += 2;
          continue;
        }
        if (line[j] === "'") {
          j += 1;
          break;
        }
        j += 1;
      }
      parts.push(span('fl-syn-str', line.slice(i, j)));
      i = j;
      continue;
    }

    if (ch >= '0' && ch <= '9') {
      let j = i + 1;
      while (j < line.length && /[0-9A-Fa-fxXuUlL.]/.test(line[j])) j += 1;
      parts.push(span('fl-syn-num', line.slice(i, j)));
      i = j;
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j += 1;
      const word = line.slice(i, j);
      if (word === '__attribute__') {
        parts.push(span('fl-syn-meta', word));
      } else if (KEYWORDS.has(word)) {
        parts.push(span('fl-syn-kw', word));
      } else if (TYPES.has(word) || /_t$/.test(word)) {
        parts.push(span('fl-syn-ty', word));
      } else {
        let next = j;
        while (next < line.length && (line[next] === ' ' || line[next] === '\t')) next += 1;
        const isCall = line[next] === '(';
        parts.push(span(isCall ? 'fl-syn-fn' : 'fl-syn-id', word));
      }
      i = j;
      continue;
    }

    parts.push(escapeHtml(ch));
    i += 1;
  }

  return parts.join('') || ' ';
}

module.exports = {
  highlightCLineHtml,
  escapeHtml,
};