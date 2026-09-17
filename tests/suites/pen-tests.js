
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
startLevel(0);
const T = CFG.TILE;
const GUNS = ['awp', 'ak', 'm4', 'mp5', 'usp', 'glock', 'deagle', 'nova', 'knife'];

/** Горизонтальный отрезок пола нужной длины. */
function openLane(need) {
  for (let ty = 2; ty < MAP_H - 2; ty++) {
    let run = 0;
    for (let tx = 2; tx < MAP_W - 2; tx++) {
      if (cell(tx, ty) === FLOOR) { run++; if (run >= need) return { tx: tx - run + 1, ty }; }
      else run = 0;
    }
  }
  return null;
}

/** Ставим преграду ровно в width клеток и смотрим, проходит ли ствол насквозь.
 *  Строим сами, а не ищем на карте: только так толщина известна точно. */
function passesThrough(kind, width, wid) {
  const lane = openLane(width + 4);
  const bx = lane.tx + 2, by = lane.ty;
  const saved = [];
  for (let i = 0; i < width; i++) { saved.push(grid[gi(bx + i, by)]); grid[gi(bx + i, by)] = kind; }
  const y = (by + 0.5) * T;
  const ox = (bx - 1) * T + 4;
  const maxD = (width + 2) * T;
  const tr = traceBullet(ox, y, 0, maxD, WEAPONS[wid].pen);
  for (let i = 0; i < width; i++) grid[gi(bx + i, by)] = saved[i];
  return tr.stop >= maxD - 0.5;
}

/** Клетка нужного типа с открытым верхним левым углом. */
function findCorner(kind) {
  for (let ty = 2; ty < MAP_H - 2; ty++)
    for (let tx = 2; tx < MAP_W - 2; tx++)
      if (cell(tx, ty) === kind &&
          cell(tx - 1, ty) === FLOOR && cell(tx, ty - 1) === FLOOR && cell(tx - 1, ty - 1) === FLOOR)
        return { tx, ty };
  return null;
}

/** Диагональ под 45° в d пикселях от вершины: хорда внутри клетки = 2·d·√2. */
function throughCorner(wid, corner, d) {
  const ang = -Math.PI / 4;
  const px = corner.tx * T + d, py = corner.ty * T + d;
  const ox = px - Math.cos(ang) * 46, oy = py - Math.sin(ang) * 46;
  const tr = traceBullet(ox, oy, ang, 92, WEAPONS[wid].pen);
  return { passed: tr.stop >= 92 - 0.5, material: tr.spans.reduce((a, s) => a + (s.to - s.from), 0) };
}

const wallCorner = findCorner(WALL), boxCorner = findCorner(CRATE);
say(!!wallCorner && !!boxCorner, `углы для проверок: бетон ${wallCorner.tx},${wallCorner.ty}, дерево ${boxCorner.tx},${boxCorner.ty}`);

// ── Дерево, ровно один блок ──────────────────────────────────────────────
for (const id of ['awp', 'ak', 'm4', 'mp5', 'usp', 'glock', 'deagle']) {
  say(passesThrough(CRATE, 1, id), `${WEAPONS[id].name} проходит блок дерева`);
}
say(!passesThrough(CRATE, 1, 'nova'), 'дробовик блок дерева насквозь не берёт');
say(!passesThrough(CRATE, 1, 'knife'), 'нож не берёт');

// ── Дерево, два блока: это ящик 2×2 на карте ─────────────────────────────
say(passesThrough(CRATE, 2, 'awp'), 'AWP проходит ящик 2×2 насквозь');
for (const id of ['ak', 'm4', 'mp5', 'usp', 'glock', 'deagle', 'nova']) {
  say(!passesThrough(CRATE, 2, id), `${WEAPONS[id].name} ящик 2×2 насквозь не берёт`);
}

// ── Бетон, ровно один блок: это перегородка на карте ─────────────────────
say(passesThrough(WALL, 1, 'awp'), 'AWP проходит бетонную перегородку насквозь');
for (const id of ['ak', 'm4', 'mp5', 'usp', 'glock', 'deagle', 'nova']) {
  say(!passesThrough(WALL, 1, id), `${WEAPONS[id].name} перегородку насквозь не берёт`);
}
say(!passesThrough(WALL, 2, 'awp'), 'две клетки бетона не берёт даже AWP');

// ── Лестница углов бетона: каждый класс со своим порогом ────────────────
// Хорда внутри клетки = 2·d·√2, поэтому d задаёт толщину материала.
const ladder = [
  { d: 3,  pass: ['awp', 'ak', 'm4', 'mp5', 'usp', 'glock', 'deagle', 'nova'], note: 'тончайший угол берут все' },
  { d: 4,  pass: ['awp', 'ak', 'm4', 'mp5', 'usp', 'glock', 'deagle'],          note: 'дробовик уже отваливается' },
  { d: 8,  pass: ['awp', 'ak', 'm4'],                                            note: 'остаются автоматы и AWP' },
  { d: 11, pass: ['awp'],                                                        note: 'на толстом углу — только AWP' },
];
for (const rung of ladder) {
  const chord = 2 * rung.d * Math.SQRT2;
  const actual = GUNS.filter(id => throughCorner(id, wallCorner, rung.d).passed);
  const same = actual.length === rung.pass.length && rung.pass.every(id => actual.includes(id));
  say(same, `угол бетона ${chord.toFixed(1)}px — ${rung.note} (${actual.map(id => WEAPONS[id].name).join(', ') || 'никто'})`);
}

// ── Угол дерева: дробовик берёт полблока ────────────────────────────────
say(throughCorner('nova', boxCorner, 6).passed, 'дробовик берёт угол дерева в 17px');
say(!throughCorner('nova', boxCorner, 8).passed, 'но 23px дерева ему уже много');

// ── Штраф ровно половина ────────────────────────────────────────────────
{
  const lane = openLane(6);
  const bx = lane.tx + 2, by = lane.ty;
  const saved = grid[gi(bx, by)];
  grid[gi(bx, by)] = CRATE;
  const y = (by + 0.5) * T;
  const target = bots[0];
  hostages.forEach(h => { h.alive = false; });
  const hit = fromX => {
    target.x = (bx + 2) * T; target.y = y;
    target.hp = 1000; target.armor = 0; target.helmet = false; target.alive = true;
    const before = target.hp;
    hitscan(fromX, y, 0, WEAPONS.ak, player);
    return before - target.hp;
  };
  const through = hit((bx - 1) * T + 4);
  const clean = hit((bx + 1) * T + 4);
  grid[gi(bx, by)] = saved;
  say(through > 0 && Math.abs(through / clean - CFG.PIERCE_DAMAGE) < 0.06,
      `сквозь дерево ${through.toFixed(0)} урона против ${clean.toFixed(0)} чистых — ровно половина`);
  say(cell(bx, by) === FLOOR, 'карта восстановлена после проверок');
}

// ── Обзор сквозь преграды остаётся закрытым ─────────────────────────────
{
  const ang = -Math.PI / 4;
  const px = wallCorner.tx * T + 4, py = wallCorner.ty * T + 4;
  say(!lineClear(px - Math.cos(ang) * 46, py - Math.sin(ang) * 46,
                 px + Math.cos(ang) * 46, py + Math.sin(ang) * 46),
      'угол простреливается, но видеть сквозь него нельзя');
}
