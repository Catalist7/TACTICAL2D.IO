// Заглушка с НАСТОЯЩЕЙ регистрацией слушателей — чтобы проверять путь от клавиши.
(function () {
  const noop = () => {};
  const gradient = { addColorStop: noop };
  const ctxHandler = {
    get(t, p) {
      if (p === 'createRadialGradient' || p === 'createLinearGradient') return () => gradient;
      if (p === 'measureText') return () => ({ width: 10 });
      if (p in t) return t[p];
      return noop;
    },
    set(t, p, v) { t[p] = v; return true; },
  };
  const listeners = { window: {}, canvas: {} };
  globalThis.__listeners = listeners;

  function makeEl(tag = 'div', bucket = null) {
    const cls = new Set();
    const el = {
      tagName: tag, dataset: {}, style: {}, width: 0, height: 0,
      textContent: '', disabled: false, hidden: false, children: [],
      classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c),
        toggle: (c, on) => { (on === undefined ? !cls.has(c) : on) ? cls.add(c) : cls.delete(c); } },
      value: '', scrollTop: 0, scrollHeight: 0,
      focus: noop, blur: noop, select: noop,
      getContext: () => new Proxy({}, ctxHandler),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1440, height: 900 }),
      addEventListener(type, fn) { if (bucket) (bucket[type] ||= []).push(fn); },
      removeEventListener: noop,
      appendChild(c) { this.children.push(c); return c; },
      querySelector: () => makeEl('span'), querySelectorAll: () => [],
    };
    // Настоящий DOM при записи innerHTML выбрасывает потомков — заглушка тоже обязана,
    // иначе список уровней перерисовывается поверх старого и тесты врут.
    // className и classList — одно и то же множество классов, как в браузере.
    Object.defineProperty(el, 'className', {
      get: () => [...cls].join(' '),
      set(v) { cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach(c => cls.add(c)); },
    });
    let html = '';
    Object.defineProperty(el, 'innerHTML', {
      get: () => html,
      set(v) { html = String(v); if (html === '') el.children.length = 0; },
    });
    return el;
  }
  const registry = {};
  globalThis.document = {
    getElementById: id => (registry[id] ||= makeEl('div', id === 'game' ? listeners.canvas : null)),
    createElement: t => makeEl(t),
    addEventListener: noop,
  };
  globalThis.window = globalThis;
  // Медиазапросы: по умолчанию «не телефон», тест может подменить.
  globalThis.__coarsePointer = false;
  globalThis.matchMedia = q => ({
    matches: /coarse/.test(String(q)) ? globalThis.__coarsePointer : false,
    media: String(q), addEventListener: noop, removeEventListener: noop,
  });
  globalThis.innerWidth = 1440; globalThis.innerHeight = 900; globalThis.devicePixelRatio = 1;
  globalThis.addEventListener = (type, fn) => { (listeners.window[type] ||= []).push(fn); };

  // Хранилище: по умолчанию работает, но можно сломать для проверки устойчивости.
  const _store = {};
  globalThis.__storeBroken = false;
  globalThis.localStorage = {
    getItem(k) { if (globalThis.__storeBroken) throw new Error('storage disabled'); return k in _store ? _store[k] : null; },
    setItem(k, v) { if (globalThis.__storeBroken) throw new Error('storage disabled'); _store[k] = String(v); },
    removeItem(k) { delete _store[k]; },
    clear() { for (const k in _store) delete _store[k]; },
  };
  globalThis.performance = globalThis.performance || { now: () => Date.now() };
  globalThis.requestAnimationFrame = () => 0;
  globalThis.location = { search: '?test=1' };

  // Синтетические события, как их шлёт браузер.
  globalThis.press = key => {
    const e = { key, preventDefault: noop, button: 0 };
    (listeners.window.keydown || []).forEach(fn => fn(e));
  };
  globalThis.release = key => {
    const e = { key, preventDefault: noop, button: 0 };
    (listeners.window.keyup || []).forEach(fn => fn(e));
  };
})();
