(function () {
  const SHOW_MS = 140;
  const GAP = 8;

  /** @type {HTMLDivElement | null} */
  let tipEl = null;
  /** @type {number | undefined} */
  let showTimer;
  /** @type {Element | null} */
  let activeTarget = null;

  function ensureTip() {
    if (tipEl) return tipEl;
    tipEl = document.createElement('div');
    tipEl.id = 'fl-tip';
    tipEl.setAttribute('role', 'tooltip');
    tipEl.hidden = true;
    document.body.appendChild(tipEl);
    return tipEl;
  }

  function hide() {
    window.clearTimeout(showTimer);
    showTimer = undefined;
    activeTarget = null;
    if (!tipEl) return;
    tipEl.hidden = true;
    tipEl.classList.remove('fl-tip-visible');
    tipEl.textContent = '';
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  function place(x, y) {
    if (!tipEl) return;
    tipEl.hidden = false;
    tipEl.classList.add('fl-tip-visible');
    const pad = GAP;
    const rect = tipEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = x + pad;
    let top = y + pad;
    if (left + rect.width > vw - pad) {
      left = Math.max(pad, vw - rect.width - pad);
    }
    if (top + rect.height > vh - pad) {
      top = y - rect.height - pad;
    }
    if (top < pad) top = pad;
    tipEl.style.left = `${Math.round(left)}px`;
    tipEl.style.top = `${Math.round(top)}px`;
  }

  /**
   * @param {Element} target
   * @param {number} x
   * @param {number} y
   */
  function show(target, x, y) {
    const text = target.getAttribute('data-fl-tip');
    if (!text) return;
    const el = ensureTip();
    activeTarget = target;
    el.textContent = text;
    el.hidden = false;
    el.classList.add('fl-tip-visible');
    place(x, y);
  }

  /**
   * @param {Element} el
   * @returns {el is Element}
   */
  function hasTip(el) {
    return el instanceof Element && el.hasAttribute('data-fl-tip');
  }

  /**
   * @param {EventTarget | null} t
   */
  function tipHost(t) {
    if (!(t instanceof Element)) return null;
    if (hasTip(t)) return t;
    return t.closest('[data-fl-tip]');
  }

  document.addEventListener(
    'pointerover',
    (ev) => {
      const host = tipHost(ev.target);
      if (!host) return;
      if (host === activeTarget && tipEl && !tipEl.hidden) return;
      hide();
      const { clientX, clientY } = ev;
      showTimer = window.setTimeout(() => {
        show(host, clientX, clientY);
      }, SHOW_MS);
    },
    true,
  );

  document.addEventListener(
    'pointerout',
    (ev) => {
      const host = tipHost(ev.target);
      if (!host) return;
      const related = /** @type {Node | null} */ (ev.relatedTarget);
      if (related && host.contains(related)) return;
      hide();
    },
    true,
  );

  document.addEventListener(
    'pointermove',
    (ev) => {
      if (!activeTarget || !tipEl || tipEl.hidden) return;
      const host = tipHost(ev.target);
      if (host !== activeTarget) return;
      place(ev.clientX, ev.clientY);
    },
    true,
  );

  document.addEventListener('scroll', hide, true);
  window.addEventListener('blur', hide);
})();