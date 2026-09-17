// Та же заглушка, но с подсчётом вызовов canvas — чтобы оценить нагрузку отрисовки.
globalThis.__calls = 0;
(function () {
  const noop = () => { globalThis.__calls++; };
  const gradient = { addColorStop: () => {} };
  const ctxHandler = {
    get(target, prop) {
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => { globalThis.__calls++; return gradient; };
      if (prop === 'measureText') return () => ({ width: 10 });
      if (prop in target) return target[prop];
      return noop;
    },
    set(target, prop, v) { target[prop] = v; return true; },
  };
  const makeCtx = () => new Proxy({}, ctxHandler);
  function makeEl(tag = 'div') {
    const cls = new Set();
    const el = {
      tagName: tag, dataset: {}, style: {}, width: 0, height: 0,
      textContent: '', disabled: false, hidden: false, children: [],
      classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c),
        toggle: (c, on) => { (on === undefined ? !cls.has(c) : on) ? cls.add(c) : cls.delete(c); } },
      getContext: () => makeCtx(),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1440, height: 900 }),
      addEventListener: () => {}, removeEventListener: () => {},
      appendChild(c) { this.children.push(c); return c; },
      querySelector: () => makeEl('span'), querySelectorAll: () => [],
    };
    // Настоящий DOM при записи innerHTML выбрасывает потомков — заглушка тоже обязана,
    // иначе список уровней перерисовывается поверх старого и тесты врут.
    let html = '';
    Object.defineProperty(el, 'innerHTML', {
      get: () => html,
      set(v) { html = String(v); if (html === '') el.children.length = 0; },
    });
    return el;
  }
  const registry = {};
  globalThis.document = { getElementById: id => (registry[id] ||= makeEl()), createElement: t => makeEl(t), addEventListener: () => {} };
  globalThis.window = globalThis;
  globalThis.innerWidth = 1440; globalThis.innerHeight = 900; globalThis.devicePixelRatio = 2;
  globalThis.addEventListener = () => {};

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
  globalThis.location = { search: '' };
})();
