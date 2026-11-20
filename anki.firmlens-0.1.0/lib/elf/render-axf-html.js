/**
 * @fileoverview HTML for the FirmLens AXF inspector webview.
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
 * @param {string} s
 */
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

/**
 * @param {number} n
 */
function formatSize(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MiB`;
}

/**
 * @param {import('./summarize-axf').AxfSummary} summary
 * @param {object} ui
 * @param {boolean} ui.sessionMatches
 * @param {string | null} ui.sessionLabel
 * @param {string} [ui.scriptUri]
 */
function renderAxfInspectorHtml(summary, ui) {
  const sibling = summary.siblings;
  const canLoadBundle = Boolean(sibling.hexPath);
  const rows = summary.globals
    .map(
      (g) =>
        `<tr data-addr="${escapeAttr(g.address)}">` +
        `<td class="name"><code>${escapeHtml(g.name)}</code></td>` +
        `<td class="addr mono"><button type="button" class="copy-addr" data-addr="${escapeAttr(g.address)}" title="Copy address">${escapeHtml(g.address)}</button></td>` +
        `<td class="type"><code>${escapeHtml(g.typeName)}</code></td>` +
        `<td class="decl">${escapeHtml(g.decl)}</td>` +
        `</tr>`,
    )
    .join('\n');

  const sectionRows = summary.sections
    .map(
      (s) =>
        `<tr class="${s.debug ? 'debug-sec' : ''}">` +
        `<td>${escapeHtml(s.name)}</td>` +
        `<td class="mono">${formatSize(s.size)}</td>` +
        `</tr>`,
    )
    .join('\n');

  const warnList = [...summary.warnings, ...summary.bundleNotes, ...summary.mapWarnings]
    .map((w) => `<li>${escapeHtml(w)}</li>`)
    .join('');

  const sessionBanner = ui.sessionMatches
    ? `<p class="session-match">Active FirmLens session uses this AXF${ui.sessionLabel ? ` (${escapeHtml(ui.sessionLabel)})` : ''}.</p>`
    : `<p class="session-idle">Opening this inspector does not change the FirmLens snapshot session.</p>`;

  const loadBtn = canLoadBundle
    ? `<button type="button" id="load-bundle" class="primary">Load HEX + this AXF as snapshot session</button>`
  : `<button type="button" id="load-axf-only" class="primary" disabled title="Need a .hex in the same folder">Load session (needs sibling HEX)</button>`;

  const scriptTag = ui.scriptUri ? `<script src="${escapeAttr(ui.scriptUri)}"></script>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(summary.fileName)} — FirmLens AXF</title>
  <style>
    :root {
      font-family: var(--vscode-font-family, system-ui);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground, #ccc);
      background: var(--vscode-editor-background, #1e1e1e);
    }
    body { margin: 0; padding: 16px 20px 32px; line-height: 1.45; }
    h1 { font-size: 1.25em; font-weight: 600; margin: 0 0 4px; }
    .sub { opacity: 0.75; font-size: 0.92em; margin-bottom: 16px; word-break: break-all; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .card {
      border: 1px solid var(--vscode-widget-border, #444);
      border-radius: 6px;
      padding: 12px 14px;
      background: var(--vscode-editor-inactiveSelectionBackground, rgba(255,255,255,0.04));
    }
    .card h2 { margin: 0 0 8px; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.85; }
    .mono { font-family: var(--vscode-editor-font-family, monospace); font-size: 0.95em; }
    table { width: 100%; border-collapse: collapse; font-size: 0.92em; }
    th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid var(--vscode-widget-border, #333); vertical-align: top; }
    th { opacity: 0.8; font-weight: 500; }
    tr.debug-sec td { color: var(--vscode-textLink-foreground, #6bb3ff); }
    .siblings dt { font-weight: 500; margin-top: 6px; }
    .siblings dd { margin: 2px 0 0; opacity: 0.9; word-break: break-all; }
    .missing { opacity: 0.55; font-style: italic; }
    ul.warns { margin: 8px 0 0 18px; padding: 0; }
    ul.warns li { margin: 4px 0; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 16px 0; }
    button {
      font: inherit;
      padding: 6px 12px;
      border-radius: 4px;
      border: 1px solid var(--vscode-button-border, transparent);
      background: var(--vscode-button-secondaryBackground, #3a3a3a);
      color: var(--vscode-button-secondaryForeground, inherit);
      cursor: pointer;
    }
    button.primary {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #fff);
    }
    button:disabled { opacity: 0.45; cursor: not-allowed; }
    .session-match { color: var(--vscode-gitDecoration-addedResourceForeground, #73c991); margin: 0 0 8px; }
    .session-idle { opacity: 0.8; margin: 0 0 8px; }
    .globals-wrap { overflow: auto; max-height: 50vh; border: 1px solid var(--vscode-widget-border, #333); border-radius: 6px; }
    .copy-addr {
      background: transparent;
      border: none;
      padding: 0;
      color: var(--vscode-textLink-foreground, #6bb3ff);
      text-decoration: underline;
      cursor: pointer;
      font: inherit;
    }
    code { font-family: var(--vscode-editor-font-family, monospace); font-size: 0.92em; }
  </style>
</head>
<body>
  <h1>${escapeHtml(summary.fileName)}</h1>
  <p class="sub mono">${escapeHtml(summary.filePath)}</p>
  ${sessionBanner}
  <div class="actions">
    ${loadBtn}
    <span class="hint">Snapshot commands are unchanged until you click load.</span>
  </div>
  <div class="grid">
    <div class="card">
      <h2>ELF</h2>
      <p>${escapeHtml(summary.elfHeadline)}</p>
      <p class="mono">SHA-256<br />${escapeHtml(summary.sha256.slice(0, 16))}…</p>
    </div>
    <div class="card">
      <h2>DWARF</h2>
      <p>${escapeHtml(summary.dwarfVersionLabel)}</p>
      <p>${summary.compileUnitCount} compile unit(s) · ${summary.globalCount != null ? `${summary.globalCount} globals indexed` : '—'}</p>
      ${summary.dwarfError ? `<p class="warn">${escapeHtml(summary.dwarfError)}</p>` : ''}
    </div>
    <div class="card">
      <h2>Siblings (same folder)</h2>
      <dl class="siblings">
        <dt>Intel HEX</dt>
        <dd class="${sibling.hexPath ? 'mono' : 'missing'}">${sibling.hexPath ? escapeHtml(sibling.hexPath) : 'not found'}</dd>
        <dt>MAP</dt>
        <dd class="${sibling.mapPath ? 'mono' : 'missing'}">${sibling.mapPath ? escapeHtml(sibling.mapPath) : 'not found'}</dd>
        <dt>metadata.json</dt>
        <dd class="${sibling.metadataPath ? 'mono' : 'missing'}">${sibling.metadataPath ? escapeHtml(sibling.metadataPath) : 'not found'}</dd>
      </dl>
    </div>
  </div>
  ${warnList ? `<div class="card"><h2>Notes</h2><ul class="warns">${warnList}</ul></div>` : ''}
  <h2>Sections</h2>
  <div class="globals-wrap" style="max-height:28vh;margin-bottom:20px">
    <table>
      <thead><tr><th>Name</th><th>Size</th></tr></thead>
      <tbody>${sectionRows}</tbody>
    </table>
  </div>
  <h2>DWARF globals ${summary.globalCount != null ? `(${summary.globalCount})` : ''}</h2>
  <div class="globals-wrap">
    <table>
      <thead><tr><th>Name</th><th>Address</th><th>Type</th><th>Decl</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" class="missing">No globals indexed.</td></tr>'}</tbody>
    </table>
  </div>
  <script>
    window.FIRMLENS_AXF = ${JSON.stringify({
      axfPath: summary.filePath,
      hexPath: sibling.hexPath,
      mapPath: sibling.mapPath,
      metadataPath: sibling.metadataPath,
    })};
  </script>
  ${scriptTag}
</body>
</html>`;
}

module.exports = {
  renderAxfInspectorHtml,
};