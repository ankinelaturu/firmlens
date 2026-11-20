(function () {
  if (typeof acquireVsCodeApi !== 'function') return;
  const vscode = acquireVsCodeApi();

  document.addEventListener(
    'click',
    (ev) => {
      const btn = ev.target instanceof Element ? ev.target.closest('.sym-goto-src') : null;
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      const dwarfName = btn.getAttribute('data-dwarf-name') || '';
      const declLine = Number(btn.getAttribute('data-decl-line') || '0');
      const declFile = btn.getAttribute('data-decl-file') || '';
      if (!dwarfName || declLine <= 0) return;
      vscode.postMessage({
        type: 'gotoSource',
        dwarfName,
        declLine,
        declFile,
      });
    },
    true,
  );
})();