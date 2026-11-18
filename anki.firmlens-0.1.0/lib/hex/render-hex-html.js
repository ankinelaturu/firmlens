/**
 * @fileoverview Server-side HTML for the hex snapshot viewer (no webview JS required).
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
 * @param {import('./hex-view-model').HexViewSection[]} sections
 */
function countDataRows(sections) {
  let n = 0;
  for (const sec of sections) {
    for (const row of sec.rows) {
      if (row.isData) n += 1;
    }
  }
  return n;
}

/**
 * @param {import('./hex-view-model').HexViewModel} model
 * @param {{ fileName: string; sessionActive?: boolean; bundle?: { axf?: string; map?: string } }} meta
 */
function renderHexViewerHtml(model, meta) {
  const sections = model.sections || [];
  const dataRows = countDataRows(sections);

  /** @type {string[]} */
  const blocks = [];

  blocks.push(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(meta.fileName)} · FirmLens</title>
  <style>
    :root {
      color: var(--vscode-foreground, #ccc);
      background: var(--vscode-editor-background, #1e1e1e);
      font-family: var(--vscode-editor-font-family, Menlo, Monaco, monospace);
      font-size: var(--vscode-editor-font-size, 13px);
    }
    body { margin: 0; padding: 12px 0 32px; }
    .toolbar {
      padding: 8px 14px 12px;
      border-bottom: 1px solid var(--vscode-panel-border, #444);
      position: sticky; top: 0; z-index: 2;
      background: var(--vscode-editor-background, #1e1e1e);
    }
    .toolbar h1 { margin: 0 0 6px; font-size: 1.05em; font-weight: 600; }
    .meta { color: var(--vscode-descriptionForeground, #999); font-size: 0.92em; }
    .warn { color: #cca700; margin-top: 6px; font-size: 0.9em; }
    details.block {
      margin: 0;
      border-top: 1px solid var(--vscode-panel-border, #444);
    }
    details.block summary {
      cursor: pointer;
      padding: 10px 14px;
      font-weight: 600;
      list-style: none;
      background: var(--vscode-editor-inactiveSelectionBackground, #2a2a2a);
    }
    details.block summary::-webkit-details-marker { display: none; }
    details.block summary::before { content: "▶ "; opacity: 0.7; }
    details.block[open] summary::before { content: "▼ "; }
    .sub { font-weight: normal; color: var(--vscode-descriptionForeground, #999); font-size: 0.9em; }
    .wrap { overflow-x: auto; padding: 0 0 8px; }
    table.grid {
      border-collapse: collapse;
      width: 100%;
      min-width: 720px;
      font-variant-numeric: tabular-nums;
    }
    table.grid th, table.grid td {
      border-right: 1px solid var(--vscode-panel-border, #444);
      border-bottom: 1px solid #333;
      padding: 3px 6px;
      vertical-align: middle;
    }
    table.grid th {
      font-size: 0.72em;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--vscode-descriptionForeground, #999);
      background: var(--vscode-editor-background, #1e1e1e);
    }
    table.grid th:last-child, table.grid td:last-child { border-right: none; }
    td.ln { color: #888; text-align: right; width: 2.5em; }
    td.chk { text-align: right; width: 2.5em; }
    td.chk.bad { color: #f48771; font-weight: 600; }
    td.data { white-space: nowrap; }
    .byte {
      display: inline-block;
      min-width: 1.6em;
      text-align: center;
      padding: 0 2px;
      border-right: 1px solid #383838;
    }
    .byte:last-child { border-right: none; }
    .zero { opacity: 0.55; }
    .cc { color: #c586c0; }
    .ff { color: #f48771; }
    .ascii { color: #ce9178; }
    .ptr { color: #569cd6; }
    tr.data-row { background: rgba(128,128,128,0.08); }
    .typ-hint { font-size: 0.75em; color: #888; margin-left: 4px; }
    .empty { padding: 20px 14px; color: #888; }
  </style>
</head>
<body>
  <div class="toolbar">
    <h1>${escapeHtml(meta.fileName)}</h1>
    <div class="meta">${escapeHtml(
      [
        `${model.dataByteCount || 0} data bytes`,
        `${sections.length} block(s)`,
        `${dataRows} data record(s)`,
        meta.sessionActive ? 'FirmLens session linked' : null,
        meta.bundle?.axf ? `AXF: ${meta.bundle.axf}` : null,
        meta.bundle?.map ? `MAP: ${meta.bundle.map}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    )}</div>`);

  if (model.warnings?.length) {
    blocks.push(
      `<div class="warn">${model.warnings.length} parse warning(s): ${escapeHtml(model.warnings[0])}</div>`,
    );
  }

  blocks.push('  </div>');

  if (sections.length === 0) {
    blocks.push('<p class="empty">No Intel HEX records parsed.</p>');
  }

  for (const section of sections) {
    const rows = section.rows || [];
    blocks.push(`
  <details class="block" open>
    <summary>${escapeHtml(section.title)}<span class="sub"> · ${rows.length} record(s)</span></summary>
    <div class="wrap">
      <table class="grid">
        <thead><tr>
          <th>Ln</th><th>LL</th><th>ADDR</th><th>TYP</th><th>LOAD</th><th>DATA</th><th>CHK</th>
        </tr></thead>
        <tbody>`);

    for (const row of rows) {
      /** @type {string[]} */
      const bytes = [];
      for (const cell of row.dataCells || []) {
        bytes.push(
          `<span class="byte ${escapeHtml(cell.style || 'default')}">${escapeHtml(cell.text)}</span>`,
        );
      }
      blocks.push(`
          <tr class="${row.isData ? 'data-row' : ''}">
            <td class="ln">${row.lineNo}</td>
            <td>${escapeHtml(row.ll)}</td>
            <td>${escapeHtml(row.addr)}</td>
            <td>${escapeHtml(row.typ)}<span class="typ-hint">${escapeHtml(row.typLabel)}</span></td>
            <td>${escapeHtml(row.loadAddr || '—')}</td>
            <td class="data">${bytes.join('')}</td>
            <td class="chk ${row.chkOk ? '' : 'bad'}">${escapeHtml(row.chk)}</td>
          </tr>`);
    }

    blocks.push(`
        </tbody>
      </table>
    </div>
  </details>`);
  }

  blocks.push(`
</body>
</html>`);

  return blocks.join('\n');
}

module.exports = {
  renderHexViewerHtml,
};