// Заглушка DOM, где холст не рисует, а записывает вызовы в SVG.
// Нужна, чтобы увидеть настоящий кадр игры картинкой, без браузера.
(function () {
  const noop = () => {};
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const num = v => (Math.round(v * 100) / 100);

  function makeRecorder(el) {
    const out = [];
    let defs = 0;
    const st = () => rec.stack[rec.stack.length - 1];
    const rec = {
      out, defsOut: [],
      stack: [{ m: [1, 0, 0, 1, 0, 0], alpha: 1, fill: '#000', stroke: '#000', lw: 1, font: '', align: 'left' }],
      path: [], px: 0, py: 0,
    };
    const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
                           a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
                           a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
    const mstr = m => `matrix(${m.map(num).join(' ')})`;
    const clipAttr = s => (s.clip ? ` clip-path="url(#${s.clip})"` : '');
    const emit = (tag, attrs, body = '') => {
      const s = st();
      const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
      out.push(`<g transform="${mstr(s.m)}" opacity="${num(s.alpha)}"${clipAttr(s)}><${tag} ${a}>${body}</${tag}></g>`
        .replace(`<${tag} ${a}></${tag}>`, `<${tag} ${a}/>`));
    };
    const paint = (isFill) => {
      const s = st();
      const d = rec.path.join(' ');
      if (!d) return;
      emit('path', isFill
        ? { d, fill: s.fill, 'fill-rule': 'nonzero' }
        : { d, fill: 'none', stroke: s.stroke, 'stroke-width': num(s.lw) });
    };
    const ctx = {
      canvas: el,
      get fillStyle() { return st().fill; }, set fillStyle(v) { st().fill = v; },
      get strokeStyle() { return st().stroke; }, set strokeStyle(v) { st().stroke = v; },
      get lineWidth() { return st().lw; }, set lineWidth(v) { st().lw = v; },
      get globalAlpha() { return st().alpha; }, set globalAlpha(v) { st().alpha = v; },
      set font(v) { st().font = v; }, get font() { return st().font; },
      set textAlign(v) { st().align = v; }, get textAlign() { return st().align; },
      globalCompositeOperation: 'source-over', lineCap: 'butt', lineJoin: 'miter',
      save() { rec.stack.push({ ...st() }); },
      restore() { if (rec.stack.length > 1) rec.stack.pop(); },
      setTransform(a, b, c, d, e, f) { st().m = [a, b, c, d, e, f]; },
      resetTransform() { st().m = [1, 0, 0, 1, 0, 0]; },
      translate(x, y) { st().m = mul(st().m, [1, 0, 0, 1, x, y]); },
      scale(x, y) { st().m = mul(st().m, [x, 0, 0, y, 0, 0]); },
      rotate(a) { st().m = mul(st().m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]); },
      beginPath() { rec.path = []; },
      closePath() { rec.path.push('Z'); },
      moveTo(x, y) { rec.path.push(`M${num(x)} ${num(y)}`); rec.px = x; rec.py = y; },
      lineTo(x, y) { rec.path.push(`L${num(x)} ${num(y)}`); rec.px = x; rec.py = y; },
      arc(x, y, r, a0, a1) {
        const x0 = x + Math.cos(a0) * r, y0 = y + Math.sin(a0) * r;
        rec.path.push(`M${num(x0)} ${num(y0)}`);
        rec.path.push(`A${num(r)} ${num(r)} 0 1 1 ${num(x - Math.cos(a0) * r)} ${num(y - Math.sin(a0) * r)}`);
        rec.path.push(`A${num(r)} ${num(r)} 0 1 1 ${num(x0)} ${num(y0)}`);
      },
      ellipse(x, y, rx, ry, rot) {
        const c = Math.cos(rot), s = Math.sin(rot);
        const p = (dx, dy) => `${num(x + dx * c - dy * s)} ${num(y + dx * s + dy * c)}`;
        rec.path.push(`M${p(-rx, 0)}`);
        rec.path.push(`A${num(rx)} ${num(ry)} ${num(rot * 180 / Math.PI)} 1 1 ${p(rx, 0)}`);
        rec.path.push(`A${num(rx)} ${num(ry)} ${num(rot * 180 / Math.PI)} 1 1 ${p(-rx, 0)}`);
      },
      arcTo(x1, y1, x2, y2) { rec.path.push(`L${num(x1)} ${num(y1)}`); },
      quadraticCurveTo(cx, cy, x, y) { rec.path.push(`Q${num(cx)} ${num(cy)} ${num(x)} ${num(y)}`); },
      bezierCurveTo(c1x, c1y, c2x, c2y, x, y) { rec.path.push(`C${num(c1x)} ${num(c1y)} ${num(c2x)} ${num(c2y)} ${num(x)} ${num(y)}`); },
      rect(x, y, w, h) { rec.path.push(`M${num(x)} ${num(y)}h${num(w)}v${num(h)}h${num(-w)}Z`); },
      fill() { paint(true); },
      stroke() { paint(false); },
      // Отсечение: область уходит в clipPath и действует до restore, как в холсте.
      clip() {
        const s = st();
        const id = `c${el.__id}_${defs++}`;
        rec.defsOut.push({ raw: `<clipPath id="${id}" clipPathUnits="userSpaceOnUse">` +
          `<path d="${rec.path.join(' ')}" transform="${mstr(s.m)}"/></clipPath>` });
        s.clip = id;
        rec.path = [];
      },
      fillRect(x, y, w, h) { emit('rect', { x: num(x), y: num(y), width: num(w), height: num(h), fill: st().fill }); },
      strokeRect(x, y, w, h) { emit('rect', { x: num(x), y: num(y), width: num(w), height: num(h),
        fill: 'none', stroke: st().stroke, 'stroke-width': num(st().lw) }); },
      clearRect: noop,
      setLineDash: noop, getLineDash: () => [],
      fillText(t, x, y) {
        const size = /(\d+)px/.exec(st().font);
        emit('text', { x: num(x), y: num(y), fill: st().fill,
          'font-size': size ? size[1] : 12, 'font-family': 'ui-monospace, Menlo, monospace',
          'text-anchor': st().align === 'center' ? 'middle' : st().align === 'right' ? 'end' : 'start' },
          esc(t));
      },
      strokeText: noop,
      measureText: t => ({ width: String(t).length * 6 }),
      createRadialGradient(x0, y0, r0, x1, y1, r1) {
        const id = `g${el.__id}_${defs++}`;
        const stops = [];
        rec.defsOut.push({ id, x1, y1, r1, stops });
        return { addColorStop: (o, c) => stops.push([o, c]), __id: id };
      },
      createLinearGradient(x1, y1, x2, y2) {
        const id = `l${el.__id}_${defs++}`;
        const stops = [];
        rec.defsOut.push({ id, linear: true, x1, y1, x2, y2, stops });
        return { addColorStop: (o, c) => stops.push([o, c]), __id: id };
      },
      // Вложенный холст вставляем целиком, но под текущим преобразованием —
      // иначе слой карты игнорирует камеру, а миникарта растекается на экран.
      drawImage(src, dx = 0, dy = 0, dw, dh) {
        if (!src || !src.__rec) return;
        const s = st();
        const sx = dw ? dw / (src.width || 1) : 1, sy = dh ? dh / (src.height || 1) : 1;
        const m = mul(s.m, [sx, 0, 0, sy, dx, dy]);
        out.push(`<g transform="${mstr(m)}" opacity="${num(s.alpha)}">${src.__rec.out.join('')}</g>`);
        rec.defsOut.push(...src.__rec.defsOut);
      },
    };
    // Градиент как fillStyle: SVG-заливка по ссылке.
    const realFill = Object.getOwnPropertyDescriptor(ctx, 'fillStyle');
    Object.defineProperty(ctx, 'fillStyle', {
      get: realFill.get,
      set(v) { st().fill = v && v.__id ? `url(#${v.__id})` : v; },
    });
    el.__rec = rec;
    return ctx;
  }

  let ids = 0;
  const listeners = { window: {}, canvas: {} };
  function makeEl(tag = 'div', bucket = null) {
    const cls = new Set();
    const el = {
      tagName: tag, dataset: {}, style: {}, width: 1440, height: 900,
      textContent: '', disabled: false, hidden: false, children: [], __id: ids++,
      classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c),
        toggle: (c, on) => { (on === undefined ? !cls.has(c) : on) ? cls.add(c) : cls.delete(c); } },
      getContext() { return this.__ctx || (this.__ctx = makeRecorder(this)); },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1440, height: 900 }),
      addEventListener(type, fn) { if (bucket) (bucket[type] ||= []).push(fn); },
      removeEventListener: noop,
      appendChild(c) { this.children.push(c); return c; },
      querySelector: () => makeEl('span'), querySelectorAll: () => [],
    };
    Object.defineProperty(el, 'className', {
      get: () => [...cls].join(' '),
      set(v) { cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach(c => cls.add(c)); },
    });
    let html = '';
    Object.defineProperty(el, 'innerHTML', { get: () => html, set(v) { html = String(v); if (!html) el.children.length = 0; } });
    return el;
  }
  const registry = {};
  globalThis.document = {
    getElementById: id => (registry[id] ||= makeEl('canvas', id === 'game' ? listeners.canvas : null)),
    createElement: t => makeEl(t),
    addEventListener: noop,
  };
  globalThis.window = globalThis;
  globalThis.innerWidth = 1440; globalThis.innerHeight = 900; globalThis.devicePixelRatio = 1;
  globalThis.addEventListener = noop;
  const store = {};
  globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }, clear: noop };
  globalThis.performance = globalThis.performance || { now: () => Date.now() };
  globalThis.requestAnimationFrame = () => 0;
  globalThis.location = { search: '' };

  globalThis.svgOf = (el, w, h, bg) => {
    const r = el.__rec;
    const defs = r.defsOut.map(g => g.raw ? g.raw : g.linear
      ? `<linearGradient id="${g.id}" gradientUnits="userSpaceOnUse" x1="${num(g.x1)}" y1="${num(g.y1)}" x2="${num(g.x2)}" y2="${num(g.y2)}">` +
        g.stops.map(([o, c]) => `<stop offset="${num(o)}" stop-color="${c}"/>`).join('') + '</linearGradient>'
      : `<radialGradient id="${g.id}" gradientUnits="userSpaceOnUse" cx="${num(g.x1)}" cy="${num(g.y1)}" r="${num(g.r1)}">` +
      g.stops.map(([o, c]) => `<stop offset="${num(o)}" stop-color="${c}"/>`).join('') + '</radialGradient>').join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<defs>${defs}</defs><rect width="100%" height="100%" fill="${bg}"/>${r.out.join('')}</svg>`;
  };
})();
