(function () {
  /** @type {import('vscode')} */
  const vscode = acquireVsCodeApi();

  const STORAGE_KEY = 'firmlens.hex.collapsedIds.v3';

  /** @type {{ model: any; fileName: string; bundle?: { axf?: string; map?: string }; sessionActive?: boolean }} */
  let state = /** @type {any} */ (window).FIRMLENS_HEX_VIEW || {
    model: { sections: [], dataByteCount: 0, warnings: [] },
    fileName: '',
  };

  /** @type {Set<string>} section ids user has collapsed */
  const collapsedIds = new Set();
  try {
    const saved = vscode.getState();
    const ids = saved?.[STORAGE_KEY];
    if (Array.isArray(ids)) {
      for (const id of ids) {
        if (typeof id === 'string') collapsedIds.add(id);
      }
    }
  } catch {
    /* ignore */
  }

  function persistCollapse() {
    vscode.setState({ [STORAGE_KEY]: [...collapsedIds] });
  }

  function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function renderToolbar(root) {
    const bar = el('header', 'toolbar');
    bar.appendChild(el('h1', '', state.fileName || 'Intel HEX'));
    const sections = state.model.sections || [];
    const bits = [
      `${state.model.dataByteCount || 0} data bytes`,
      `${sections.length} block(s)`,
    ];
    if (state.sessionActive) bits.push('FirmLens session linked');
    if (state.bundle?.axf) bits.push(`AXF: ${state.bundle.axf}`);
    if (state.bundle?.map) bits.push(`MAP: ${state.bundle.map}`);
    bar.appendChild(el('span', 'meta', bits.join(' · ')));

    const expandAll = el('button', 'tb-btn', 'Expand all');
    expandAll.type = 'button';
    expandAll.addEventListener('click', () => {
      collapsedIds.clear();
      persistCollapse();
      rerender();
    });
    const collapseAll = el('button', 'tb-btn', 'Collapse all');
    collapseAll.type = 'button';
    collapseAll.addEventListener('click', () => {
      for (const s of sections) collapsedIds.add(s.id);
      persistCollapse();
      rerender();
    });
    bar.appendChild(expandAll);
    bar.appendChild(collapseAll);

    if (state.model.warnings?.length) {
      bar.appendChild(el('span', 'warn', `${state.model.warnings.length} parse warning(s)`));
    }
    root.appendChild(bar);
  }

  function renderLegend(root) {
    const leg = el('div', 'legend');
    leg.appendChild(document.createTextNode('Bytes: '));
    for (const [label, cls] of [
      ['00', 'zero'],
      ['CC', 'cc'],
      ['FF', 'ff'],
      ['ASCII', 'ascii'],
      ['08/20', 'ptr'],
    ]) {
      leg.appendChild(el('span', `sample byte ${cls}`, label));
    }
    root.appendChild(leg);
  }

  function renderColsHead(parent) {
    const head = el('div', 'cols-head');
    for (const label of ['Ln', 'LL', 'ADDR', 'TYP', 'LOAD', 'DATA', 'CHK']) {
      head.appendChild(el('span', label === 'LOAD' ? 'load-col' : '', label));
    }
    parent.appendChild(head);
  }

  function renderRow(row) {
    const rowEl = el('div', `record-row${row.isData ? ' data-row' : ''}`);
    rowEl.appendChild(el('span', 'cell line-no', String(row.lineNo)));
    rowEl.appendChild(el('span', 'cell', row.ll || ''));
    rowEl.appendChild(el('span', 'cell', row.addr || ''));

    const typ = el('span', 'cell', '');
    typ.appendChild(document.createTextNode(row.typ || ''));
    if (row.typLabel) {
      typ.appendChild(el('span', 'typ-label', row.typLabel));
    }
    rowEl.appendChild(typ);

    rowEl.appendChild(el('span', 'cell load-col', row.loadAddr || '—'));

    const data = el('span', 'cell data-bytes');
    const cells = row.dataCells || [];
    for (let i = 0; i < cells.length; i += 1) {
      const b = cells[i];
      data.appendChild(el('span', `byte ${b.style || 'default'}`, b.text || '00'));
    }
    rowEl.appendChild(data);

    rowEl.appendChild(
      el('span', `cell chk-${row.chkOk ? 'ok' : 'bad'}`, row.chk || ''),
    );
    return rowEl;
  }

  function renderSections(root) {
    const main = el('main', '');
    const sections = state.model.sections || [];

    if (sections.length === 0) {
      main.appendChild(el('p', 'empty', 'No Intel HEX records parsed.'));
      root.appendChild(main);
      return;
    }

    for (const section of sections) {
      const rows = section.rows || [];
      const expanded = !collapsedIds.has(section.id);

      const header = el('button', 'section-header');
      header.type = 'button';
      header.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      header.appendChild(el('span', 'chev', expanded ? '▼' : '▶'));
      header.appendChild(el('span', 'title', section.title || 'Block'));
      header.appendChild(
        el(
          'span',
          'sub',
          ` · ${rows.length} record(s) · ${section.subtitle || ''}`,
        ),
      );
      header.addEventListener('click', () => {
        if (collapsedIds.has(section.id)) {
          collapsedIds.delete(section.id);
        } else {
          collapsedIds.add(section.id);
        }
        persistCollapse();
        rerender();
      });
      main.appendChild(header);

      const body = el('div', expanded ? 'section-body' : 'section-body collapsed');
      renderColsHead(body);
      for (const row of rows) {
        body.appendChild(renderRow(row));
      }
      main.appendChild(body);
    }
    root.appendChild(main);
  }

  function rerender() {
    const root = document.getElementById('root');
    if (!root) return;
    root.replaceChildren();
    renderToolbar(root);
    renderLegend(root);
    renderSections(root);
  }

  rerender();

  window.addEventListener('message', (ev) => {
    const msg = ev.data;
    if (msg?.type === 'update' && msg.model) {
      state = {
        model: msg.model,
        fileName: msg.fileName || state.fileName,
        bundle: msg.bundle,
        sessionActive: msg.sessionActive,
      };
      rerender();
    }
  });
})();