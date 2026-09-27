
/* 3D в арсенале: математика, сетки, сборка бойца и стволов, запасной путь. */
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
progress.tutorial = 'done';

/** Сетка годная: треугольники целые, чисел нет «не-числа», нормали единичные. */
function meshOk(m) {
  if (!m.p.length || m.p.length % 9 || m.p.length !== m.n.length) return 'длины';
  for (const v of m.p) if (!Number.isFinite(v)) return 'позиция не число';
  for (let i = 0; i < m.n.length; i += 3) {
    const l = Math.hypot(m.n[i], m.n[i + 1], m.n[i + 2]);
    if (!(Math.abs(l - 1) < 1e-3)) return `нормаль длины ${l}`;
  }
  return null;
}

// ── Математика ────────────────────────────────────────────────────────────
{
  const I = M4.id();
  const A = M4.chain(M4.t(1, 2, 3), M4.ry(0.7), M4.rx(-0.3));
  say(M4.mul(I, A).every((v, i) => Math.abs(v - A[i]) < 1e-12), 'единичная матрица ничего не меняет');
  const p = M4.point(M4.t(1, 2, 3), [1, 1, 1]);
  say(p[0] === 2 && p[1] === 3 && p[2] === 4, 'перенос переносит точку');
  const aimX = M4.aim([0, 0, 0], [0, -1, 0], [0, 0, 1], 'x');
  const ax = M4.dir(aimX, [1, 0, 0]);
  say(Math.abs(ax[1] + 1) < 1e-9, 'aim по оси x направляет ствол куда сказано');
  const aimY = M4.aim([0, 0, 0], [1, 1, 0], [0, 0, 1], 'y');
  const ay = M4.dir(aimY, [0, 1, 0]);
  say(Math.abs(ay[0] - Math.SQRT1_2) < 1e-9 && Math.abs(ay[1] - Math.SQRT1_2) < 1e-9, 'aim по оси y — для конечностей');
  const v = M4.lookAt([0, 0, 5], [0, 0, 0], [0, 1, 0]);
  const q = M4.point(v, [0, 0, 0]);
  say(Math.abs(q[2] + 5) < 1e-9, 'камера смотрит на точку перед собой');
  const E = solveElbow([0, 0, 0], [0.4, 0, 0], 0.3, 0.3, [0, -1, 0]);
  say(Math.abs(V3.len(E) - 0.3) < 1e-6 && E[1] < 0, 'локоть на длине плеча и в сторону, куда сказано');
}

// ── Построители сеток ─────────────────────────────────────────────────────
{
  const shapes = {
    'скруглённая коробка': rbox(0.1, 0.2, 0.3, 0.02), 'цилиндр': cyl(0.05, 0.04, 0.2),
    'сфера': sphere(0.1), 'капсула-конечность': limbMesh(0.3, 0.05, 0.04, 0.1), 'тор': torus(0.1, 0.02),
    'тело вращения': lathe([[0, 0], [0.05, 0.02], [0.04, 0.1], [0, 0.12]]),
    'выдавленный профиль': extrude([[0, 0], [0.1, 0], [0.1, 0.05], [0.05, 0.02], [0, 0.05]], 0.03),
    'трубка': tube([[0, 0, 0], [0.1, 0.1, 0], [0.2, 0.1, 0.1]], 0.01),
    'лофт': loft([{ y: 0, rx: 0.1, rz: 0.08 }, { y: 0.2, rx: 0.12, rz: 0.09, e: 3 }]),
  };
  const bad = Object.entries(shapes).map(([k, m]) => [k, meshOk(m)]).filter(([, e]) => e);
  say(!bad.length, 'все построители дают годную сетку' + (bad.length ? ` — ${bad[0][0]}: ${bad[0][1]}` : ''));
  say(earcut2([[0, 0], [2, 0], [2, 2], [1, 1], [0, 2]]).length === 3, 'вогнутый пятиугольник режется на три треугольника');
  // Скруглённая коробка точно в своих габаритах.
  const b = rbox(0.1, 0.2, 0.3, 0.02);
  let mx = 0; for (let i = 0; i < b.p.length; i += 3) mx = Math.max(mx, Math.abs(b.p[i]));
  say(Math.abs(mx - 0.05) < 1e-6, 'коробка не шире заданного');
  const data = bakeParts([part(b, MAT.metal, '#808080')]);
  say(data.length === (b.p.length / 3) * R3D_STRIDE, 'в буфер уходит каждая вершина');
}

// ── Стволы ────────────────────────────────────────────────────────────────
{
  const guns = Object.keys(WEAPONS).filter(id => WEAPONS[id].slot !== 'melee');
  const bad = [];
  for (const id of guns) {
    const g = buildGun(id);
    const err = g.parts.map(p => meshOk(p.mesh)).find(Boolean);
    if (g.parts.length < 8 || err) bad.push(`${id}: ${err || g.parts.length + ' деталей'}`);
  }
  say(!bad.length, `все ${guns.length} стволов собираются из деталей` + (bad.length ? ` — ${bad[0]}` : ''));
  const has = (id, f) => buildGun(id).feats.has(f);
  say(['awp', 'ssg08', 'scar20', 'aug'].every(id => has(id, 'scope')), 'у снайперских и AUG — прицел');
  say(has('nova', 'pump') && has('mag7', 'pump') && has('xm1014', 'tube'), 'у дробовиков — помпа и подствольная трубка');
  say(has('ak', 'curvedMag') && has('ak', 'woodStock'), 'у АК — изогнутый магазин и дерево');
  say(['aug', 'famas', 'p90'].every(id => has(id, 'bullpup')), 'буллпапы узнаются');
  say(has('mac10', 'wireStock') && has('p90', 'topMag') && has('mp5', 'suppressor'), 'MAC-10, P90 и MP5-SD со своими приметами');
  const len = id => { const b = buildGun(id).bounds; return b.max[0] - b.min[0]; };
  say(len('awp') > len('ak') && len('ak') > len('mp5') && len('mp5') > len('usp') && len('usp') > len('glock'),
      `длины в порядке: AWP ${len('awp').toFixed(2)} > AK ${len('ak').toFixed(2)} > MP5 > USP-S > Glock`);
}

// ── Боец ──────────────────────────────────────────────────────────────────
{
  const look = (armor, inHands = 'ak', holster = 'usp') => ({
    armor, head: armor === 'eod' ? 'bomb' : ['helmet', 'assault', 'heavy'].includes(armor) ? 'helmet' : 'cap',
    optic: armor === 'none' ? 'thermal' : 'nvg4', mask: armor !== 'eod', inHands, holster, knife: true,
  });
  const built = {};
  for (const a of ['none', 'kevlar', 'helmet', 'assault', 'heavy', 'eod']) built[a] = buildSoldier(look(a));
  const bad = Object.entries(built).map(([a, b]) => [a, b.parts.map(p => meshOk(p.mesh)).find(Boolean)]).filter(([, e]) => e);
  say(!bad.length, 'боец собирается в любой броне' + (bad.length ? ` — ${bad[0][0]}: ${bad[0][1]}` : ''));
  const lenses = b => b.halos.filter(h => h.lens).length;
  say(lenses(built.none) === 0 && built.none.feats.has('thermal'), 'без брони — тепловизор, линз ночного видения нет');
  say(['kevlar', 'helmet', 'assault', 'heavy', 'eod'].every(a => lenses(built[a]) === 4 && built[a].feats.has('nvg4')),
      'с любой бронёй — ровно четыре линзы');
  say(built.none.feats.has('mask') && built.assault.feats.has('mask'), 'лицо закрыто маской');
  say(built.kevlar.feats.has('softVest') && built.assault.feats.has('plateCarrier') && built.heavy.feats.has('heavy'),
      'жилеты отличаются: мягкий, плитоноска, тяжёлый');
  say(built.eod.feats.has('bombSuit') && built.eod.parts.length > built.heavy.parts.length * 1.3,
      `сапёрный детальнее тяжёлого: ${built.eod.parts.length} деталей против ${built.heavy.parts.length}`);
  say(built.assault.feats.has('holster') && built.assault.feats.has('knife'), 'кобура и нож на месте');
  const pistolOnly = buildSoldier(look('none', 'glock', null));
  say(!pistolOnly.feats.has('holster'), 'пистолет в руках — кобура пуста');
  // Всё стоит на полу и в росте человека.
  let minY = Infinity, maxY = -Infinity;
  for (const p of built.helmet.parts)
    for (let i = 0; i < p.mesh.p.length; i += 3) {
      const y = M4.point(p.m, [p.mesh.p[i], p.mesh.p[i + 1], p.mesh.p[i + 2]])[1];
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  say(minY > -0.01 && minY < 0.02 && maxY > 1.75 && maxY < 1.9, `стоит на полу, рост ${maxY.toFixed(2)} м`);
}

// ── Без WebGL арсенал живёт на плоском портрете ──────────────────────────
{
  let crash = null;
  try { openArsenal(); for (let i = 0; i < 5; i++) drawArsenalFigure(); renderArsenal(); } catch (e) { crash = e; }
  say(!crash, crash ? 'ПАДЕНИЕ: ' + crash.message : 'без WebGL арсенал открывается и рисуется');
  say(ARS3D.viewFailed && !ARS3D.view && ARS3D.cards.length === 0, 'трёхмерный рендер честно отключён, превью не созданы');
}
