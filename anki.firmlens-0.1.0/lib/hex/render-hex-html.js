/**
 * @fileoverview Full hex viewer HTML (Records + Image tabs).
 */

const { renderRecordsHtml } = require('./render-records-html');
const { renderImageTabHtml } = require('./render-image-html');
const { buildAllIntervals } = require('./symbol-intervals');
const { buildMemoryImage } = require('./memory-image');

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
 * @param {{
 *   fileName: string;
 *   sessionActive?: boolean;
 *   bundle?: { axf?: string; map?: string };
 *   firmware?: import('./resolve-hex-firmware').HexFirmwareContext | null;
 *   limits?: { maxStructFields: number; maxReadBytes: number };
 *   tooltipScriptUri?: string;
 * }} meta
 */
function renderHexViewerHtml(model, meta) {
  const sections = model.sections || [];
  const dataRows = countDataRows(sections);
  const intervals = meta.firmware?.dwarf ? buildAllIntervals(meta.firmware.dwarf) : [];
  const imageRegions = meta.firmware?.memory ? buildMemoryImage(meta.firmware.memory) : [];
  const limits = meta.limits || { maxStructFields: 32, maxReadBytes: 256 };

  const recordsBody = renderRecordsHtml(model, intervals);
  const imageBody = renderImageTabHtml(imageRegions, intervals, {
    firmware: meta.firmware,
    limits,
  });

  return `<!DOCTYPE html>
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
    body { margin: 0; padding: 0 0 32px; min-height: 100vh; overflow: auto; }
    .toolbar {
      padding: 8px 14px 10px;
      border-bottom: 1px solid var(--vscode-panel-border, #444);
      position: sticky; top: 0; z-index: 4;
      background: var(--vscode-editor-background, #1e1e1e);
    }
    .toolbar h1 { margin: 0 0 6px; font-size: 1.05em; font-weight: 600; }
    .meta { color: var(--vscode-descriptionForeground, #999); font-size: 0.92em; }
    .warn { color: #cca700; margin-top: 6px; font-size: 0.9em; }
    .tab-radios { display: none; }
    .tab-labels {
      display: flex; gap: 0; margin-top: 10px;
      border-bottom: 1px solid var(--vscode-panel-border, #444);
    }
    .tab-labels label {
      padding: 8px 16px; cursor: pointer; user-select: none;
      color: var(--vscode-descriptionForeground, #999);
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    #tab-records:checked ~ .tab-labels label[for="tab-records"],
    #tab-image:checked ~ .tab-labels label[for="tab-image"] {
      color: var(--vscode-foreground, #ccc);
      border-bottom-color: var(--vscode-focusBorder, #007acc);
      font-weight: 600;
    }
    .tab-panel { display: none; }
    #tab-records:checked ~ .tab-panels #panel-records { display: block; }
    #tab-image:checked ~ .tab-panels #panel-image { display: block; }
    details.block {
      margin: 0;
      border-top: 1px solid var(--vscode-panel-border, #444);
    }
    details.block summary {
      cursor: pointer; padding: 10px 14px; font-weight: 600; list-style: none;
      background: var(--vscode-editor-inactiveSelectionBackground, #2a2a2a);
    }
    details.block summary::-webkit-details-marker { display: none; }
    details.block summary::before { content: "▶ "; opacity: 0.7; }
    details.block[open] summary::before { content: "▼ "; }
    .sub { font-weight: normal; color: var(--vscode-descriptionForeground, #999); font-size: 0.9em; }
    .wrap { overflow-x: auto; padding: 0 0 8px; }
    table.grid {
      border-collapse: collapse; width: 100%;
      font-variant-numeric: tabular-nums;
    }
    table.records-grid { min-width: 820px; }
    td.sym-badge { font-size: 0.85em; max-width: 14em; line-height: 1.35; color: var(--vscode-symbolIcon-variableForeground, #9cdcfe); }
    .sym-none { color: #666; }
    table.image-grid { min-width: 900px; }
    table.grid th, table.grid td {
      border-right: 1px solid var(--vscode-panel-border, #444);
      border-bottom: 1px solid #333;
      padding: 3px 6px; vertical-align: middle;
    }
    table.grid th {
      font-size: 0.72em; text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--vscode-descriptionForeground, #999);
      background: var(--vscode-editor-background, #1e1e1e);
    }
    td.ln { color: #888; text-align: right; width: 2.5em; }
    td.chk { text-align: right; width: 2.5em; }
    td.chk.bad { color: #f48771; font-weight: 600; }
    td.data { white-space: nowrap; }
    .byte {
      display: inline-block; min-width: 1.6em; text-align: center;
      padding: 0 2px;
      border-right: 1px solid #383838;
    }
  .byte.gap { opacity: 0.35; color: #666; }
    .byte:last-child { border-right: none; }
    .zero { opacity: 0.55; }
    .cc { color: #c586c0; }
    .ff { color: #f48771; }
    .ascii { color: #ce9178; }
    .ptr { color: #569cd6; }
    tr.data-row { background: rgba(128,128,128,0.08); }
    tr.image-row:target { outline: 1px solid var(--vscode-focusBorder, #007acc); background: rgba(0,122,204,0.12); }
    .typ-hint { font-size: 0.75em; color: #888; margin-left: 4px; }
    .empty, .sym-empty { padding: 16px 14px; color: #888; }
    .image-layout { display: flex; align-items: flex-start; gap: 0; }
    .sym-index {
      flex: 0 0 220px; max-width: 280px;
      padding: 8px 10px 16px;
      border-right: 1px solid var(--vscode-panel-border, #444);
      position: sticky; top: 120px; align-self: flex-start;
      max-height: calc(100vh - 140px); overflow-y: auto;
    }
    .sym-index h2 { margin: 0 0 8px; font-size: 0.85em; text-transform: uppercase; color: #999; }
    .sym-index h2.sym-sub { margin-top: 14px; }
    .sym-list { list-style: none; margin: 0; padding: 0; }
    .sym-list li { margin: 0 0 4px; }
    .sym-link {
      display: block; padding: 4px 6px; border-radius: 4px;
      text-decoration: none; color: inherit; font-size: 0.9em;
    }
    .sym-link:hover { background: var(--vscode-list-hoverBackground, #2a2a2a); }
    .sym-name { display: block; font-weight: 600; }
    .sym-addr, .sym-type { font-size: 0.8em; color: #999; }
    .image-map { flex: 1; min-width: 0; }
    .gutter-col { min-width: 10em; text-align: left; }
    .gutter { min-width: 10em; max-width: 16em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .gutter.sym-start { font-weight: 600; color: var(--vscode-symbolIcon-variableForeground, #9cdcfe); }
    .gutter.sym-cont { color: #999; padding-left: 12px; }
    .addr-col, .addr-cell { font-size: 0.9em; white-space: nowrap; }
    td.byte-cell { text-align: center; padding: 2px; }
    .data-hdr { text-align: left; padding-left: 8px; }
    .byte.sym-mapped { color: var(--vscode-editor-foreground, #eee); border-radius: 2px; }
    .gap { background: repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(128,128,128,0.12) 3px, rgba(128,128,128,0.12) 6px); }
  </style>
</head>
<body>
  <div class="toolbar">
    <h1>${escapeHtml(meta.fileName)}</h1>
    <div class="meta">${escapeHtml(
      [
        `${model.dataByteCount || 0} data bytes`,
        `${dataRows} HEX record(s)`,
        `${intervals.length} symbol(s)`,
        meta.sessionActive ? 'FirmLens session linked' : null,
        meta.firmware?.fromSession ? 'firmware from session' : meta.firmware?.axfPath ? 'DWARF loaded' : 'no AXF',
        meta.bundle?.axf ? `AXF: ${meta.bundle.axf}` : null,
        meta.bundle?.map ? `MAP: ${meta.bundle.map}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    )}</div>
    ${model.warnings?.length ? `<div class="warn">${model.warnings.length} parse warning(s): ${escapeHtml(model.warnings[0])}</div>` : ''}
  </div>

  <input class="tab-radios" type="radio" name="fl-tab" id="tab-image" checked />
  <input class="tab-radios" type="radio" name="fl-tab" id="tab-records" />
  <div class="tab-labels">
    <label for="tab-image">Image (symbols)</label>
    <label for="tab-records">HEX records</label>
  </div>
  <div class="tab-panels">
    <div class="tab-panel" id="panel-image">${imageBody}</div>
    <div class="tab-panel" id="panel-records">${recordsBody}</div>
  </div>
</body>
</html>`;
}

module.exports = {
  renderHexViewerHtml,
};