/**
 * @fileoverview Full hex viewer HTML (Records + Image tabs).
 */

const { renderRecordsHtml } = require('./render-records-html');
const { renderSymbolsTabHtml } = require('./render-symbols-html');
const { buildAllIntervals } = require('./symbol-intervals');
const { buildSymbolHueMap } = require('./symbol-color');

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
 *   recordsScriptUri?: string;
 *   tooltipScriptUri?: string;
 *   symbolsScriptUri?: string;
 * }} meta
 */
function renderHexViewerHtml(model, meta) {
  const sections = model.sections || [];
  const dataRows = countDataRows(sections);
  const intervals = meta.firmware?.dwarf ? buildAllIntervals(meta.firmware.dwarf) : [];
  const hueMap = buildSymbolHueMap(intervals);
  const limits = meta.limits || { maxStructFields: 32, maxReadBytes: 256 };

  const recordsBody = renderRecordsHtml(model, {
    intervals,
    firmware: meta.firmware ?? null,
    limits,
    hueMap,
  });
  const symbolsBody = renderSymbolsTabHtml(meta.firmware ?? null);

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
    #tab-symbols:checked ~ .tab-labels label[for="tab-symbols"] {
      color: var(--vscode-foreground, #ccc);
      border-bottom-color: var(--vscode-focusBorder, #007acc);
      font-weight: 600;
    }
    .tab-panel { display: none; }
    #tab-records:checked ~ .tab-panels #panel-records { display: block; }
    #tab-symbols:checked ~ .tab-panels #panel-symbols { display: block; }
    details.block {
      margin: 0;
      border-top: 1px solid var(--vscode-panel-border, #444);
    }
    details.block summary {
      cursor: pointer; padding: 0; margin: 0; font-weight: 600; list-style: none;
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
    .records-wrap { overflow-x: auto; padding: 0 0 12px; }
    table.records-grid {
      min-width: 820px;
      table-layout: fixed;
    }
    table.records-grid .col-ln { width: 2.5em; }
    table.records-grid .col-ll { width: 2.5em; }
    table.records-grid .col-addr { width: 3.5em; }
    table.records-grid .col-typ { width: 4.75em; }
    table.records-grid .col-load { width: 6.5em; }
    table.records-grid .col-data { width: auto; }
    table.records-grid .data .byte.sym-mapped {
      color: var(--vscode-editor-foreground, #eee);
      box-shadow: none;
      border-right-color: transparent;
    }
    table.records-grid .data .byte.sym-mapped + .byte.sym-mapped {
      border-right-color: transparent;
    }
    table.records-grid .col-chk { width: 2.5em; }
    table.records-grid tr.section-band td {
      padding: 0;
      border-right: none;
      border-bottom: 1px solid var(--vscode-panel-border, #444);
      vertical-align: middle;
      line-height: 1.2;
    }
    table.records-grid .band-toggle {
      display: flex; align-items: center; gap: 4px;
      width: 100%; margin: 0; padding: 0;
      border: none; cursor: pointer; text-align: left;
      font: inherit; color: inherit; line-height: 1.2;
      min-height: 0;
      background: var(--vscode-editor-inactiveSelectionBackground, #2a2a2a);
      border-radius: 0;
      appearance: none;
      -webkit-appearance: none;
    }
    table.records-grid .band-toggle:hover { background: var(--vscode-list-hoverBackground, #333); }
    table.records-grid tr.band-linear .band-toggle { background: rgba(0, 122, 204, 0.12); }
    table.records-grid tr.band-segment .band-toggle { background: rgba(180, 120, 0, 0.12); }
    table.records-grid tr.band-eof .band-toggle {
      background: rgba(140, 80, 160, 0.15);
      color: var(--vscode-foreground, #ccc);
    }
    .band-title { font-weight: 600; }
  .chev { width: 1em; opacity: 0.85; flex-shrink: 0; }
    tbody.records-section[data-open="false"] tr.records-data { display: none; }
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
    .byte.sym-mapped {
      color: var(--vscode-editor-foreground, #eee);
      box-shadow: none;
      transition: filter 0.1s ease, transform 0.1s ease, box-shadow 0.1s ease;
    }
    .byte.sym-mapped.fl-block-pop {
      position: relative;
      z-index: 2;
      filter: brightness(1.5) saturate(1.2);
      transform: scale(1.1);
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.28), 0 0 12px rgba(100, 170, 255, 0.55);
      border-radius: 2px;
    }
    table.records-grid .data .byte.sym-mapped.fl-block-pop {
      border-right-color: transparent;
    }
    tr.image-row.fl-block-pop {
      background: rgba(0, 122, 204, 0.1);
    }
    tr.image-row.fl-block-pop .gutter.sym-start,
    tr.image-row.fl-block-pop .gutter.sym-cont {
      color: var(--vscode-foreground, #eee);
      font-weight: 600;
    }
    .gutter.fl-block-pop {
      text-shadow: 0 0 8px rgba(120, 180, 255, 0.65);
    }
    .byte[data-fl-tip] { cursor: default; }
    .gap { background: repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(128,128,128,0.12) 3px, rgba(128,128,128,0.12) 6px); }
    #fl-tip {
      position: fixed;
      z-index: 10000;
      max-width: min(440px, calc(100vw - 24px));
      padding: 8px 10px;
      font-size: 12px;
      line-height: 1.45;
      font-family: var(--vscode-editor-font-family, Menlo, Monaco, Consolas, monospace);
      word-break: break-word;
      color: var(--vscode-editorHoverWidget-foreground, var(--vscode-foreground, #ccc));
      background: var(--vscode-editorHoverWidget-background, #252526);
      border: 1px solid var(--vscode-editorHoverWidget-border, #454545);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.36);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.06s ease;
    }
    #fl-tip:not(.fl-tip-rich) { white-space: pre-wrap; }
    #fl-tip.fl-tip-visible { opacity: 1; }
    #fl-tip .fl-tip-title {
      font-weight: 600;
      font-size: 12px;
      margin-bottom: 4px;
      color: var(--vscode-foreground, #eee);
    }
    #fl-tip .fl-tip-off {
      font-weight: 500;
      opacity: 0.85;
      margin-left: 4px;
    }
    #fl-tip .fl-tip-pill {
      display: inline-block;
      margin-left: 6px;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: lowercase;
      letter-spacing: 0.03em;
      color: var(--vscode-badge-foreground, #ccc);
      background: var(--vscode-badge-background, rgba(120, 120, 120, 0.45));
      border: 1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.45));
      vertical-align: middle;
    }
    .byte.sym-padding {
      color: var(--vscode-descriptionForeground, #aaa);
      opacity: 0.95;
    }
    #fl-tip .fl-tip-meta {
      font-size: 11px;
      color: var(--vscode-descriptionForeground, #999);
      margin-bottom: 6px;
    }
    #fl-tip .fl-tip-code {
      margin: 6px 0 8px;
      padding: 6px 8px;
      border-radius: 3px;
      background: var(--vscode-textCodeBlock-background, rgba(10, 10, 10, 0.4));
      border: 1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.35));
      font-size: 11px;
      line-height: 1.4;
    }
    #fl-tip .fl-tip-file {
      color: var(--vscode-descriptionForeground, #999);
      margin-bottom: 2px;
    }
    #fl-tip .fl-tip-line { white-space: pre; }
    #fl-tip .fl-tip-ln {
      color: var(--vscode-editorLineNumber-foreground, #858585);
      user-select: none;
    }
    #fl-tip .fl-tip-sep { margin: 0 2px; opacity: 0.6; }
    #fl-tip .fl-tip-mono { font-family: inherit; }
    #fl-tip .fl-tip-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--vscode-descriptionForeground, #999);
      margin-bottom: 3px;
    }
    #fl-tip .fl-tip-summary { margin-bottom: 4px; }
    #fl-tip .fl-tip-lines .fl-tip-decode-line { opacity: 0.95; }
    #fl-tip .fl-tip-section { margin-top: 4px; }
    #fl-tip .fl-tip-hex-block { white-space: pre-wrap; font-family: inherit; }
    .symbols-wrap { overflow-x: auto; padding: 0 0 16px; }
    table.symbols-grid { min-width: 720px; table-layout: fixed; }
    table.symbols-grid .col-sym-name { width: 28%; }
    table.symbols-grid .col-sym-addr { width: 7.5em; }
    table.symbols-grid .col-sym-data { width: auto; }
    table.symbols-grid .col-sym-len { width: 4.5em; }
    table.symbols-grid .sym-len-hdr,
    table.symbols-grid .sym-len-cell { text-align: right; }
    table.symbols-grid .sym-name-cell { white-space: nowrap; }
    table.symbols-grid .sym-tree-depth-1 { padding-left: 1.25em; }
    table.symbols-grid .sym-tree-depth-2 { padding-left: 2em; }
    table.symbols-grid .sym-tree-toggle {
      margin: 0 4px 0 0; padding: 0 3px; border: none; cursor: pointer;
      font: inherit; color: inherit; background: transparent; vertical-align: middle;
    }
    table.symbols-grid .sym-tree-leaf { display: inline-block; width: 1.2em; margin-right: 4px; }
    table.symbols-grid .sym-tree-label { vertical-align: middle; }
    table.symbols-grid .sym-type-pill {
      display: inline-block;
      margin-left: 8px;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
      vertical-align: middle;
      color: var(--vscode-badge-foreground, #ccc);
      background: var(--vscode-badge-background, rgba(90, 93, 94, 0.45));
      border: 1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.4));
    }
    table.symbols-grid .sym-addr-cell { white-space: nowrap; font-size: 0.92em; }
    table.symbols-grid .sym-data-cell {
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 0;
    }
    table.symbols-grid .sym-data-unknown {
      color: var(--vscode-descriptionForeground, #666);
      opacity: 0.5;
    }
    table.symbols-grid .sym-data-parent.sym-data-suppressed {
      color: transparent;
      user-select: none;
    }
    table.symbols-grid .sym-data-parent.sym-data-suppressed::before {
      content: '—';
      color: var(--vscode-descriptionForeground, #777);
    }
    table.symbols-grid tr.sym-tree-child[hidden] { display: none; }
    .symbols-empty { padding: 16px 14px; color: var(--vscode-descriptionForeground, #999); }
    .symbols-empty code { font-size: 0.92em; }
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

  <input class="tab-radios" type="radio" name="fl-tab" id="tab-records" checked />
  <input class="tab-radios" type="radio" name="fl-tab" id="tab-symbols" />
  <div class="tab-labels">
    <label for="tab-records">HEX records</label>
    <label for="tab-symbols">Symbols</label>
  </div>
  <div class="tab-panels">
    <div class="tab-panel" id="panel-records">${recordsBody}</div>
    <div class="tab-panel" id="panel-symbols">${symbolsBody}</div>
  </div>
  ${meta.recordsScriptUri ? `<script src="${escapeHtml(meta.recordsScriptUri)}"></script>` : ''}
  ${meta.tooltipScriptUri ? `<script src="${escapeHtml(meta.tooltipScriptUri)}"></script>` : ''}
  ${meta.symbolsScriptUri ? `<script src="${escapeHtml(meta.symbolsScriptUri)}"></script>` : ''}
</body>
</html>`;
}

module.exports = {
  renderHexViewerHtml,
};