/**
 * @fileoverview Markdown layout for FirmLens hovers (VS Code MarkdownString-safe).
 * Names and values use inline code (editor monospace) for a firmware/debug look.
 */

const { basename } = require('../dwarf/dwarf-index');
const { provenanceLines } = require('../format/metadata');

/**
 * @param {string} text
 */
function escapeInlineCode(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/`/g, '\\`');
}

/**
 * @param {string} text
 */
function code(text) {
  if (text == null || text === '') return '`\u200b`';
  return `\`${escapeInlineCode(text)}\``;
}

/**
 * @param {string} text
 */
function escapeCell(text) {
  return String(text).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

/**
 * @param {string} label
 * @param {string} value
 */
function labelCode(label, value) {
  return `${label} · ${code(value)}`;
}

/**
 * @param {string[]} lines
 * @returns {{ rows: { name: string, value: string }[], rest: string[] }}
 */
function structRowsFromDecodeLines(lines) {
  /** @type {{ name: string, value: string }[]} */
  const rows = [];
  /** @type {string[]} */
  const rest = [];
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][\w]*):\s*(.+)$/);
    if (m) {
      const val =
        m[2] === 'unavailable' || m[2].includes('unavailable')
          ? code('—')
          : code(m[2]);
      rows.push({ name: m[1], value: val });
    } else if (line !== 'pointee:' && line !== '…') {
      rest.push(line);
    }
  }
  return { rows, rest };
}

/**
 * @param {{ name: string, value: string }[]} rows
 */
function markdownTable(rows) {
  if (rows.length === 0) return [];
  const out = ['| Field | Value |', '| --- | --- |'];
  for (const { name, value } of rows) {
    out.push(`| ${code(name)} | ${value} |`);
  }
  return out;
}

/**
 * @param {import('../hex/hex-memory').HexMemory} memory
 * @param {number} address
 * @param {number} size
 */
function formatRawHex(memory, address, size) {
  const r = memory.read(address, size);
  if (!r.available.every(Boolean)) return null;
  return [...r.bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
}

/**
 * @param {object} opts
 * @param {string} opts.title Name or expression hovered
 * @param {string} opts.typeName
 * @param {string} opts.storageAddr
 * @param {string} opts.snapshotValue
 * @param {import('../decode/decode-value').DecodedValue} opts.decoded
 * @param {import('../hex/hex-memory').HexMemory} [opts.memory]
 * @param {number} [opts.readAddress]
 * @param {number} [opts.readLen]
 * @param {string} [opts.declHint] e.g. "storage.c:8"
 * @param {string} opts.snapshotLabel
 * @param {import('../format/metadata').SnapshotMetadata | null} opts.metadata
 * @param {boolean} opts.fromCapture
 * @param {string[]} opts.sessionWarnings
 * @param {string} [opts.memberCaption] For `base->field` hovers
 * @returns {string[]}
 */
function formatHoverMarkdown(opts) {
  /** @type {string[]} */
  const body = [`### FirmLens · ${code(opts.title)}`, ''];
  body.push(`${code(opts.typeName)} · storage ${code(opts.storageAddr)}`);
  if (opts.declHint) {
    body.push(labelCode('Decl', opts.declHint));
  }
  if (opts.memberCaption) {
    body.push('', opts.memberCaption);
  }
  body.push('', labelCode('Snapshot value', opts.snapshotValue));

  if (opts.memory && opts.readAddress != null && opts.readLen && opts.readLen <= 8) {
    const raw = formatRawHex(opts.memory, opts.readAddress, opts.readLen);
    if (raw) {
      body.push(labelCode('Raw', raw));
    }
  }

  const { rows, rest } = structRowsFromDecodeLines(opts.decoded.lines);
  const ptrMeta = rest.filter((l) => l.startsWith('address:'));

  if (ptrMeta.length) {
    body.push('', '#### Pointer');
    for (const line of ptrMeta) {
      const addr = line.replace(/^address:\s*/i, '').trim();
      body.push(labelCode('Address', addr));
    }
  }

  if (rows.length > 0) {
    const pointeeAddr = ptrMeta[0]?.match(/0x[0-9a-f]+/i)?.[0];
    body.push(
      '',
      pointeeAddr ? `#### Pointee @ ${code(pointeeAddr)}` : '#### Fields',
      '',
      ...markdownTable(rows),
    );
  } else if (opts.decoded.lines.length > 0 && !ptrMeta.length) {
    body.push('', ...opts.decoded.lines.map((l) => {
      const m = l.match(/^([A-Za-z_][\w]*):\s*(.+)$/);
      if (m) return `- ${code(m[1])} · ${code(m[2])}`;
      return `- ${code(l)}`;
    }));
  }

  body.push('', '---');
  body.push(labelCode('Snapshot', opts.snapshotLabel));
  for (const line of provenanceLines(opts.metadata, opts.fromCapture, opts.sessionWarnings)) {
    const colon = line.indexOf(':');
    if (colon > 0) {
      const key = line.slice(0, colon).replace(/^⚠\s*/, '').trim();
      const val = line.slice(colon + 1).trim();
      const prefix = line.startsWith('⚠') ? '⚠ ' : '';
      body.push(`${prefix}${key} · ${code(val)}`);
    } else {
      body.push(code(line));
    }
  }
  return body;
}

/**
 * @param {string} reason
 * @param {string} [hint]
 * @returns {string[]}
 */
function formatReasonMarkdown(reason, hint) {
  /** @type {string[]} */
  const body = ['### FirmLens', '', code(reason)];
  if (hint) {
    body.push('', hint);
  }
  return body;
}

/**
 * @param {import('../dwarf/dwarf-index').DwarfVariable} variable
 */
function declHint(variable) {
  const file = basename(String(variable.declFile || 'source'));
  const line = variable.declLine;
  if (!file || !line) return '';
  return `${file}:${line}`;
}

module.exports = {
  formatHoverMarkdown,
  formatReasonMarkdown,
  declHint,
  structRowsFromDecodeLines,
  code,
};