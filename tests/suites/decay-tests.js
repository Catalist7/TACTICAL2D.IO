
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
progress.tutorial = 'done';
progress.completed = 14;
const T = CFG.TILE;

// ── Тень и палитра ───────────────────────────────────────────────────────
const hsl = hex => {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  const s = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
  return { s, l };
};
say(CFG.SHADOW === 0.8, `тень вне поля зрения гуще: ${CFG.SHADOW * 100}% (было 62%)`);
say(CFG.LIGHT_CUT > 0 && CFG.LIGHT_CUT < 1, `свет из окон снимает ${CFG.LIGHT_CUT * 100}% тени`);
{
  const drab = ['floorIn', 'floorOut', 'wall', 'wallTop', 'wallEdge', 'crate', 'crateTop'];
  const worst = drab.map(k => [k, hsl(COL[k]).s]).sort((a, b) => b[1] - a[1])[0];
  say(drab.every(k => hsl(COL[k]).s <= 0.3), `пол, стены и ящики выцветшие: насыщенность не выше 0.3 (максимум у ${worst[0]} — ${worst[1].toFixed(2)})`);
  say(['floorIn', 'floorOut', 'wall', 'crate'].every(k => hsl(COL[k]).l < 0.45),
      'основные поверхности тёмные — чтобы свет из окон было видно');
  say(Object.values(ROOM_TINT).every(t => parseFloat(t.split(',')[3]) <= 0.12), 'налёт помещений едва заметный — не больше 0.12');
  say(['mark', 'rescue', 'hazard', 'ct', 't'].every(k => hsl(COL[k]).s >= 0.5),
      'разметка, эвакуация и цвета команд остались яркими');
}

const maps = [
  { i: 0, label: '«Офис»' }, { i: 1, label: '«Комбинат»' },
  { i: 2, label: 'операция 3' }, { i: 4, label: 'операция 5' }, { i: 8, label: 'операция 9' },
];
let totalWindows = 0, totalBreaches = 0, totalBeams = 0;

for (const { i, label } of maps) {
  startLevel(i);
  const before = Array.from(grid).join('');
  mapLayer = null; ceilingLayer = null; MAP_DECAY = null;
  buildMapLayer(); buildCeilingLayer();
  const { openings, ceiling } = MAP_DECAY;
  say(Array.from(grid).join('') === before, `${label}: сетка карты не изменилась — окна и балки только рисуются`);

  const windows = openings.filter(o => o.kind === 'window'), breaches = openings.filter(o => o.kind === 'breach');
  totalWindows += windows.length; totalBreaches += breaches.length; totalBeams += ceiling.length;
  say(windows.length >= (label === '«Офис»' ? 4 : 2), `${label}: ${windows.length} окон, ${breaches.length} проломов, ${ceiling.length} балок под потолком`);

  // Где окна.
  const marked = markedTiles();
  const wrong = openings.filter(o => {
    const ax = o.ny !== 0 ? 1 : 0, ay = o.nx !== 0 ? 1 : 0;
    return grid[gi(o.tx, o.ty)] !== WALL || marked.has(o.ty * MAP_W + o.tx) ||
      cell(o.tx + o.nx, o.ty + o.ny) !== FLOOR || cell(o.tx + 2 * o.nx, o.ty + 2 * o.ny) !== FLOOR ||
      cell(o.tx - o.nx, o.ty - o.ny) === FLOOR ||
      cell(o.tx + ax, o.ty + ay) !== WALL || cell(o.tx - ax, o.ty - ay) !== WALL;
  });
  say(wrong.length === 0, `${label}: все проёмы в наружных стенах, не у дверей и не на разметке`);
  say(openings.every((a, k) => openings.every((b, m) => m === k || Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty) >= 4)),
      `${label}: проёмы не лепятся друг к другу`);

  // Свет не проходит сквозь стены и ящики.
  let leaks = 0;
  for (const o of openings) {
    const pts = o.shaft.pts, k = pts.length / 2;
    for (let r = 0; r < k; r++) {
      const a = pts[r], b = pts[pts.length - 1 - r];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      for (let t = 4; t < d - 2; t += 4) {
        const x = a.x + (b.x - a.x) * t / d, y = a.y + (b.y - a.y) * t / d;
        if (solid(Math.floor(x / T), Math.floor(y / T))) { leaks++; break; }
      }
    }
  }
  say(leaks === 0, `${label}: лучи света обрываются на первой стене или ящике`);

  // Балки перекрытия: от стены до стены, над проходимым пространством, не над двором.
  const badBeams = ceiling.filter(b => {
    const horiz = b.y1 === b.y2;
    if (!horiz && b.x1 !== b.x2) return true;
    const line = Math.floor((horiz ? b.y1 : b.x1) / T);
    const from = Math.floor((horiz ? b.x1 : b.y1) / T), to = Math.floor((horiz ? b.x2 : b.y2) / T);
    const at = k => (horiz ? cell(k, line) : cell(line, k));
    for (let k = from + 1; k < to; k++) if (at(k) === WALL) return true;
    return at(from) !== WALL || at(to) !== WALL;
  });
  say(badBeams.length === 0, `${label}: каждая балка упирается концами в стены и не проходит сквозь них`);
  const yards = propZones().filter(z => z.kind === 'yard');
  say(ceiling.every(b => !yards.some(z => {
    const cx = (b.x1 + b.x2) / 2 / T, cy = (b.y1 + b.y2) / 2 / T;
    return cx >= z.x0 && cx <= z.x1 + 1 && cy >= z.y0 && cy <= z.y1 + 1;
  })), `${label}: над открытым двором перекрытия нет`);

  const snap = JSON.stringify(MAP_DECAY);
  startLevel(i); MAP_DECAY = null;
  say(JSON.stringify(mapDecay()) === snap, `${label}: окна, свет и балки на тех же местах при повторной загрузке`);
}
say(totalBreaches > 0, `проломы тоже встречаются: ${totalBreaches} на ${maps.length} картах`);

// ── Упавшие балки на полу ────────────────────────────────────────────────
{
  let beams = 0, bad = 0;
  for (let i = 2; i < 14; i++) {
    startLevel(i); MAP_PROPS = null;
    for (const p of mapProps()) {
      if (p.kind !== 'beam') continue;
      beams++;
      const half = 26 * p.s;
      for (const sgn of [1, -1]) {
        const x = p.x + Math.cos(p.a) * half * sgn, y = p.y + Math.sin(p.a) * half * sgn;
        if (cell(Math.floor(x / T), Math.floor(y / T)) !== FLOOR) bad++;
      }
    }
  }
  say(beams >= 5 && bad === 0, `упавших балок за 12 карт: ${beams}, у всех оба конца на полу`);
}

// ── Порядок отрисовки ────────────────────────────────────────────────────
{
  startLevel(2); beginLive();
  // Игра зовёт функции по имени из своей области видимости — подменяем их там же.
  const order = [];
  const real = { drawBots, drawDustMotes, drawCeilingBeams, drawFog, drawPlayer };
  drawBots = (...a) => { order.push('drawBots'); return real.drawBots(...a); };
  drawDustMotes = (...a) => { order.push('drawDustMotes'); return real.drawDustMotes(...a); };
  drawCeilingBeams = (...a) => { order.push('drawCeilingBeams'); return real.drawCeilingBeams(...a); };
  drawFog = (...a) => { order.push('drawFog'); return real.drawFog(...a); };
  drawPlayer = (...a) => { order.push('drawPlayer'); return real.drawPlayer(...a); };
  render();
  ({ drawBots, drawDustMotes, drawCeilingBeams, drawFog, drawPlayer } = real);
  const at = n => order.indexOf(n);
  say(at('drawBots') >= 0 && at('drawBots') < at('drawDustMotes') && at('drawDustMotes') < at('drawCeilingBeams') &&
      at('drawCeilingBeams') < at('drawFog') && at('drawFog') < at('drawPlayer'),
      `балки над ботами и под тенью, игрок поверх: ${order.join(' → ')}`);
}

// ── Балки рисуются одним готовым слоем ───────────────────────────────────
{
  startLevel(4); beginLive();
  ceilingLayer = null;
  const images = [];
  const real = ctx.drawImage;
  ctx.drawImage = (img, ...rest) => { images.push(img); };
  drawCeilingBeams(); drawCeilingBeams(); drawCeilingBeams();
  ctx.drawImage = real;
  say(images.length === 3 && images.every(im => im === ceilingLayer), 'слой балок строится один раз и переиспользуется каждый кадр');
}

// ── Свет в тени и враги ──────────────────────────────────────────────────
{
  startLevel(4); beginLive();
  const o = mapDecay().openings[0];
  const lit = { x: o.shaft.cx + Math.cos(o.shaft.ang) * 60, y: o.shaft.cy + Math.sin(o.shaft.ang) * 60 };
  // Камера на окне: пятно в кадре.
  const z = zoom();
  camera.x = lit.x - view.w / z / 2; camera.y = lit.y - view.h / z / 2;
  const calls = [];
  const rec = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => calls.push([k, t.globalAlpha])), set: (t, k, v) => { t[k] = v; return true; } });
  cutLightFromFog(rec);
  const fills = calls.filter(([k]) => k === 'fill');
  say(fills.length >= 1 && fills.every(([, alpha]) => alpha === CFG.LIGHT_CUT),
      `пятно света в кадре вычитается из тени с силой ${CFG.LIGHT_CUT}: заливок ${fills.length}`);
  camera.x = -100000; camera.y = -100000;
  calls.length = 0; cutLightFromFog(rec);
  say(calls.filter(([k]) => k === 'fill').length === 0, 'пятна за кадром не рисуются');

  // Враг стоит в луче, но вне конуса — его не видно. Ищем точку в луче, с которой
  // игрок из глубины помещения видит врага, если повернётся к нему.
  bots.forEach(b => { b.alive = false; });
  const bot = bots[0]; bot.alive = true; player.alive = true;
  let placed = false;
  for (const op of mapDecay().openings) {
    const { cx, cy, ang } = op.shaft;
    for (const d of [40, 60, 80]) {
      const bx = cx + Math.cos(ang) * d, by = cy + Math.sin(ang) * d;
      for (const back of [120, 100, 80]) {
        const px = bx + Math.cos(ang) * back, py = by + Math.sin(ang) * back;
        if (solid(Math.floor(px / T), Math.floor(py / T)) || !lineClear(px, py, bx, by)) continue;
        bot.x = bx; bot.y = by; player.x = px; player.y = py;
        placed = true; break;
      }
      if (placed) break;
    }
    if (placed) break;
  }
  say(placed, 'нашлась точка в луче, видная из глубины помещения');
  const count = () => { let n = 0; const real = drawOperative; drawOperative = () => { n++; }; drawBots(); drawOperative = real; return n; };
  const toBot = Math.atan2(bot.y - player.y, bot.x - player.x);
  player.ang = toBot + Math.PI;                      // спиной к врагу
  say(!playerSees(bot.x, bot.y) && count() === 0, 'враг в луче света за спиной игрока не рисуется');
  player.ang = toBot;                                // лицом
  say(playerSees(bot.x, bot.y) && count() === 1, 'повернулся — враг в луче виден и нарисован');
}

// ── Пыль в лучах ─────────────────────────────────────────────────────────
{
  startLevel(4); beginLive();
  const o = mapDecay().openings[0];
  const z = zoom();
  camera.x = o.shaft.cx - view.w / z / 2; camera.y = o.shaft.cy - view.h / z / 2;
  const arcs = () => { const pts = []; const real = ctx.arc; ctx.arc = (x, y) => pts.push(`${x.toFixed(1)},${y.toFixed(1)}`); drawDustMotes(); ctx.arc = real; return pts; };
  const realNow = performance.now;
  performance.now = () => 1000; const a = arcs();
  performance.now = () => 2500; const b = arcs();
  camera.x = -100000; camera.y = -100000; const off = arcs();
  performance.now = realNow;
  say(a.length >= DECAY.MOTES && a.length % DECAY.MOTES === 0, `в лучах в кадре пылинки: ${a.length}`);
  say(a.join() !== b.join(), 'пылинки плывут со временем');
  say(off.length === 0, 'лучи за кадром не тратят ни одного вызова');
}
