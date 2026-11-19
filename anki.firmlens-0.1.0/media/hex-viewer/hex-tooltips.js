(function () {
  const SHOW_MS = 140;
  const GAP = 8;

  /** @type {HTMLDivElement | null} */
  let tipEl = null;
  /** @type {number | undefined} */
  let showTimer;
  /** @type {Element | null} */
  let activeTarget = null;
  /** @type {Element[]} */
  let popNodes = [];
  /** @type {string | null} */
  let activeBlockId = null;

  function ensureTip() {
    if (tipEl) return tipEl;
    tipEl = document.createElement('div');
    tipEl.id = 'fl-tip';
    tipEl.setAttribute('role', 'tooltip');
    tipEl.hidden = true;
    document.body.appendChild(tipEl);
    return tipEl;
  }

  function clearPop() {
    for (const n of popNodes) n.classList.remove('fl-block-pop');
    document.querySelectorAll('tr.image-row.fl-block-pop').forEach((r) => r.classList.remove('fl-block-pop'));
    popNodes = [];
    activeBlockId = null;
  }

  /**
   * @param {Element} el
   * @returns {string | null}
   */
  function blockIdOf(el) {
    return el.getAttribute('data-fl-block');
  }

  /**
   * @param {Element} host
   */
  function popBlock(host) {
    const id = blockIdOf(host);
    if (id && id === activeBlockId) return;
    clearPop();
    activeBlockId = id;
    if (id) {
      const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id.replace(/"/g, '\\"');
      popNodes = [...document.querySelectorAll(`[data-fl-block="${escaped}"]`)];
    } else {
      popNodes = [host];
    }
    for (const n of popNodes) n.classList.add('fl-block-pop');
    const row = host.closest('tr.image-row');
    if (row && id) row.classList.add('fl-block-pop');
  }

  function hide() {
    window.clearTimeout(showTimer);
    showTimer = undefined;
    activeTarget = null;
    clearPop();
    if (!tipEl) return;
    tipEl.hidden = true;
    tipEl.classList.remove('fl-tip-visible');
    tipEl.replaceChildren();
    tipEl.classList.remove('fl-tip-rich');
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
  function showTip(target, x, y) {
    const html = target.getAttribute('data-fl-tip-html');
    const text = target.getAttribute('data-fl-tip');
    if (!html && !text) return;
    const el = ensureTip();
    activeTarget = target;
    if (html) {
      el.innerHTML = html;
      el.classList.add('fl-tip-rich');
    } else {
      el.textContent = text || '';
      el.classList.remove('fl-tip-rich');
    }
    el.hidden = false;
    el.classList.add('fl-tip-visible');
    place(x, y);
  }

  /**
   * @param {Element} el
   * @returns {el is Element}
   */
  function hasTip(el) {
    return el instanceof Element && (el.hasAttribute('data-fl-tip') || el.hasAttribute('data-fl-tip-html'));
  }

  /**
   * @param {EventTarget | null} t
   */
  function tipHost(t) {
    if (!(t instanceof Element)) return null;
    if (hasTip(t)) return t;
    return t.closest('[data-fl-tip], [data-fl-tip-html]');
  }

  /**
   * @param {EventTarget | null} t
   */
  function blockHost(t) {
    if (!(t instanceof Element)) return null;
    if (t.hasAttribute('data-fl-block')) return t;
    return t.closest('[data-fl-block]');
  }

  /**
   * @param {Node | null} node
   * @param {string | null} blockId
   */
  function stillInBlock(node, blockId) {
    if (!(node instanceof Element) || !blockId) return false;
    const h = blockHost(node);
    return Boolean(h && blockIdOf(h) === blockId);
  }

  document.addEventListener(
    'pointerover',
    (ev) => {
      const host = tipHost(ev.target);
      if (!host) return;
      popBlock(host);
      if (host === activeTarget && tipEl && !tipEl.hidden) return;
      window.clearTimeout(showTimer);
      const { clientX, clientY } = ev;
      showTimer = window.setTimeout(() => {
        showTip(host, clientX, clientY);
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
      if (stillInBlock(related, blockIdOf(host))) return;
      if (related instanceof Element && tipHost(related) === host) return;
      hide();
    },
    true,
  );

  document.addEventListener(
    'pointermove',
    (ev) => {
      const host = tipHost(ev.target);
      if (host) popBlock(host);
      if (!activeTarget || !tipEl || tipEl.hidden) return;
      if (host !== activeTarget) return;
      place(ev.clientX, ev.clientY);
    },
    true,
  );

  document.addEventListener('scroll', hide, true);
  window.addEventListener('blur', hide);
})();