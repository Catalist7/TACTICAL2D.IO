const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
const T = CFG.TILE;

function bfsGrid(sx, sy) {
  const d = new Int32Array(MAP_W * MAP_H).fill(-1);
  const q = [[sx, sy]]; d[gi(sx, sy)] = 0;
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy;
      if (!walkable(nx, ny) || d[gi(nx, ny)] >= 0) continue;
      d[gi(nx, ny)] = d[gi(x, y)] + 1; q.push([nx, ny]);
    }
  }
  return d;
}

/** Метрики стиля — те же, что считались для ручных карт на шаге 1.
 *  У «Комбината» помещения — секции, у змейки — комнаты. */
function metrics(id) {
  const m = MAPS[id];
  loadMap(id);
  let floor = 0, crate = 0;
  for (let i = 0; i < grid.length; i++) grid[i] === FLOOR ? floor++ : grid[i] === CRATE ? crate++ : 0;
  const d = bfsGrid(...m.spawnCT);
  const far = Math.max(...d);
  const hs = m.hostages.map(([x, y]) => d[gi(x, y)]);
  const es = m.enemies.map(([x, y]) => d[gi(x, y)]);
  const nn = m.enemies.map(([x, y], i) => Math.min(...m.enemies.filter((_, j) => j !== i)
    .map(([a, b]) => Math.hypot(a - x, b - y))));
  let areas, openings;
  if (m.rooms) {
    areas = m.rooms.map(r => (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1));
    openings = m.doors.map(dd => dd.openings.length);
  } else {
    areas = (m.sections || []).map(sec => (sec.x1 - sec.x0 + 1) * 20);
    openings = (m.gates || []).map(gx => { let r = 0, run = 0;
      for (let y = 0; y < MAP_H; y++) { if (walkable(gx, y)) run++; else { if (run) r++; run = 0; } } return r; });
  }
  return {
    size: `${MAP_W}×${MAP_H}`,
    cratePct: 100 * crate / (floor + crate),
    rooms: areas.length,
    area: `${Math.min(...areas)}–${Math.max(...areas)}`,
    openings: openings.join(','),
    hostages: m.hostages.length,
    hostSteps: [Math.min(...hs), Math.max(...hs)],
    hostPct: [Math.min(...hs), Math.max(...hs)].map(v => Math.round(100 * v / far)),
    enemies: m.enemies.length,
    enemyMin: Math.min(...es),
    spacing: Math.round(Math.min(...nn)),
    guards: m.enemies.filter(([x, y]) => Math.min(...m.hostages.map(([a, b]) => bfsGrid(x, y)[gi(a, b)])) <= 6).length,
  };
}

// ── 20 карт через настоящий загрузчик игры ───────────────────────────────
const report = [];
let allOk = true;
const cases = [];
for (let k = 0; k < 20; k++) cases.push({ seed: 1000 + k * 7919, level: 3 + (k % 10) });

for (const { seed, level } of cases) {
  const id = `gen-test-${seed}`;
  MAPS[id] = generateMap(seed, level);
  loadMap(id);
  const m = MAPS[id];
  const problems = [];

  // Объекты в стенах: загрузчик сам фиксирует, если ему пришлось что-то вырезать.
  if (KEY_TILE_FIXES.length) problems.push('объекты в стенах: ' + KEY_TILE_FIXES.join(' '));
  // Проверяем и до вырезания: пересобираем сетку без clearKeyTiles.
  grid.fill(WALL); m.build();
  const pts = [m.spawnCT, ...m.hostages, ...m.enemies.map(e => [e[0], e[1]])];
  const inWall = pts.filter(([x, y]) => cell(x, y) !== FLOOR);
  if (inWall.length) problems.push('в стене/ящике: ' + inWall.map(p => p.join(',')).join(' '));
  const keys = pts.map(p => p[0] + ',' + p[1]);
  if (new Set(keys).size !== keys.length) problems.push('объекты друг на друге');

  if (m.hostages.length < 2 || m.hostages.length > 3) problems.push('заложников ' + m.hostages.length);

  const d = bfsGrid(...m.spawnCT);
  const lost = m.hostages.filter(([x, y]) => d[gi(x, y)] < 0);
  if (lost.length) problems.push('нет пути до заложников: ' + lost.map(p => p.join(',')).join(' '));
  const [rx, ry, rw, rh] = m.rescue;
  if (d[gi(rx + 1, ry + 2)] < 0) problems.push('нет пути до эвакуации');

  const close = m.enemies.filter(([x, y]) => d[gi(x, y)] < 17);
  if (close.length) problems.push('враги ближе 17 шагов: ' + close.map(e => `${e[0]},${e[1]}=${d[gi(e[0], e[1])]}`).join(' '));
  const unreachable = m.enemies.filter(([x, y]) => d[gi(x, y)] < 0);
  if (unreachable.length) problems.push('недостижимые враги');

  // Детерминизм: тот же seed — байт в байт та же карта.
  const again = generateMap(seed, level);
  const sig = x => JSON.stringify([x.ops, x.hostages, x.enemies, x.marks, x.w]);
  if (sig(again) !== sig(m)) problems.push('seed не воспроизводит карту');

  if (problems.length) allOk = false;
  report.push({ seed, level, ok: !problems.length, problems, w: m.w, e: m.enemies.length, h: m.hostages.length });
}

for (const r of report) {
  console.log(`${r.ok ? '✓' : '✗'} seed ${String(r.seed).padStart(6)} ур.${String(r.level).padStart(2)}: ${r.w}×24, врагов ${String(r.e).padStart(2)}, заложников ${r.h}${r.ok ? '' : ' — ' + r.problems.join('; ')}`);
}
say(allOk, `все 20 карт прошли проверку: путь до заложников, 2–3 заложника, нет объектов в стенах, враги ≥17 шагов, seed воспроизводим`);

// ── Змейка: направления, одиночные проходы, нельзя срезать ────────────────
{
  const dirs = new Set(); let singles = 0, doors = 0, shortcuts = 0, pairs = 0;
  for (const { seed, level } of cases) {
    const m = generateMap(seed, level);
    const id = 'gen-snake-' + seed; MAPS[id] = m; loadMap(id);
    for (let i = 1; i < m.rooms.length; i++) {
      const [ax, ay] = m.rooms[i - 1].cell, [bx, by] = m.rooms[i].cell;
      dirs.add(bx > ax ? 'вправо' : bx < ax ? 'влево' : by > ay ? 'вниз' : 'вверх');
    }
    singles += m.doors.filter(dd => dd.single).length; doors += m.doors.length;
    // Соседние по сетке, но не по маршруту комнаты: стена между ними глухая.
    for (let a = 0; a < m.rooms.length; a++) for (let b = a + 2; b < m.rooms.length; b++) {
      const A = m.rooms[a], B = m.rooms[b];
      if (Math.abs(A.cell[0] - B.cell[0]) + Math.abs(A.cell[1] - B.cell[1]) !== 1) continue;
      pairs++;
      let open = 0;
      if (A.cell[1] === B.cell[1]) { const gx = Math.max(A.x0, B.x0) - 1; for (let y = A.y0; y <= A.y1; y++) if (walkable(gx, y)) open++; }
      else { const gy = Math.max(A.y0, B.y0) - 1; for (let x = A.x0; x <= A.x1; x++) if (walkable(x, gy)) open++; }
      if (open) shortcuts++;
    }
    delete MAPS[id];
  }
  say(dirs.size === 4, `на 20 картах маршрут идёт во все стороны: ${[...dirs].join(', ')}`);
  say(singles > 0 && singles < doors, `одиночных проходов ${singles} из ${doors} рубежей — случайно на каждом`);
  say(pairs > 0 && shortcuts === 0, `змейку не срезать: ${pairs} пар соседних не по маршруту комнат, проходов между ними ${shortcuts}`);
}

// ── Разные сиды — разные карты ───────────────────────────────────────────
{
  const a = generateMap(1, 3), b = generateMap(2, 3);
  say(JSON.stringify(a.ops) !== JSON.stringify(b.ops), 'разные seed дают разные карты');
}

// ── Рост сложности с уровнем ─────────────────────────────────────────────
{
  const byLevel = [3, 4, 5, 6, 7, 8, 9, 10, 12, 20].map(L => {
    const m = generateMap(levelSeed(L), L); const id = 'gen-L' + L; MAPS[id] = m;
    const mt = metrics(id);
    return { L, w: `${m.w}×${m.h}`, e: m.enemies.length, secs: m.rooms.length, steps: mt.hostSteps[1] };
  });
  console.log('\n  уровень → размер, комнат, врагов, шагов до дальнего заложника');
  byLevel.forEach(r => console.log(`    ${String(r.L).padStart(2)} → ${r.w}, ${r.secs}, ${r.e}, ${r.steps}`));
  const nondec = key => byLevel.every((r, i) => i === 0 || r[key] >= byLevel[i - 1][key]);
  say(nondec('e'), 'врагов с уровнем не становится меньше');
  say(nondec('secs'), 'комнат с уровнем не становится меньше');
  say(byLevel[byLevel.length - 1].steps > byLevel[0].steps * 1.3,
      `заложники дальше: ${byLevel[0].steps} шагов на уровне 3 → ${byLevel[byLevel.length - 1].steps} на уровне 20`);
}

// ── Стиль: сгенерированные против оригинала ──────────────────────────────
{
  const orig = metrics('plant');
  const gens = [3, 4].map(L => { const id = 'gen-L' + L; return { L, m: metrics(id) }; });
  const row = (name, f) => console.log(`  ${name.padEnd(30)} ${String(f(orig)).padEnd(16)} ${gens.map(g => String(f(g.m)).padEnd(16)).join('')}`);
  console.log(`\n  ${'метрика'.padEnd(30)} ${'Комбинат'.padEnd(16)} ${gens.map(g => ('генер. ур.' + g.L).padEnd(16)).join('')}`);
  row('размер', m => m.size);
  row('ящики от проходимого, %', m => m.cratePct.toFixed(1));
  row('помещений', m => m.rooms);
  row('площадь помещения', m => m.area);
  row('проходов на рубеже', m => m.openings);
  row('заложников', m => m.hostages);
  row('заложники от старта, шагов', m => m.hostSteps.join('–'));
  row('заложники, % от дальней точки', m => m.hostPct.join('–'));
  row('врагов', m => m.enemies);
  row('ближайший враг, шагов', m => m.enemyMin);
  row('мин. дистанция между врагами', m => m.spacing);
  row('охрана у заложников (≤6 шагов)', m => m.guards);
}

// ── Встроенная самопроверка игры на сгенерированных картах ───────────────
{
  for (const id of Object.keys(MAPS)) if (id.startsWith('gen-test-')) delete MAPS[id];
  const res = runTests();
  const genChecks = res.results.filter(r => r.name.startsWith('Комбинат-'));
  const bad = genChecks.filter(r => !r.pass);
  say(genChecks.length > 0 && bad.length === 0,
      `встроенная самопроверка игры на сгенерированных картах: ${genChecks.length - bad.length}/${genChecks.length}`);
  bad.forEach(r => console.log('    ✗ ' + r.name + (r.note ? ' — ' + r.note : '')));
}
