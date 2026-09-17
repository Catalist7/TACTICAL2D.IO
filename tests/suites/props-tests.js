
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
progress.tutorial = 'done';
progress.completed = 12;
const T = CFG.TILE;

const maps = [
  { i: 0, label: '«Офис»' }, { i: 1, label: '«Комбинат»' },
  { i: 2, label: 'операция 3' }, { i: 4, label: 'операция 5' }, { i: 8, label: 'операция 9' },
];

for (const { i, label } of maps) {
  startLevel(i);
  const gridBefore = Array.from(grid).join('');
  mapLayer = null; MAP_PROPS = null;
  buildMapLayer();
  const props = MAP_PROPS;
  const items = props.filter(p => !p.wear), wear = props.filter(p => p.wear);
  say(items.length > 0 && wear.length > 0, `${label}: ${items.length} предметов и ${wear.length} трещин и пятен`);
  say(Array.from(grid).join('') === gridBefore, `${label}: сетка карты не изменилась — ходить и стрелять мусор не мешает`);

  // Где лежит.
  const marked = new Set();
  for (const m of MAP_MARKS) if (m.kind !== 'zone')
    for (let y = m.y; y < m.y + (m.h || 1); y++) for (let x = m.x; x < m.x + (m.w || 1); x++) marked.add(`${x},${y}`);
  const keep = [SPAWN_CT, ...HOSTAGE_POS, ...ENEMY_POSTS.map(p => p.at)];
  const bad = props.filter(p => {
    const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
    return cell(tx, ty) !== FLOOR || marked.has(`${tx},${ty}`) ||
      (p.x > RESCUE.x - 24 && p.x < RESCUE.x + RESCUE.w + 24 && p.y > RESCUE.y - 24 && p.y < RESCUE.y + RESCUE.h + 24) ||
      keep.some(k => Math.hypot(k.x - p.x, k.y - p.y) < PROPS.CLEAR);
  });
  say(bad.length === 0, `${label}: всё на полу, не на разметке, не в эвакуации и не у старта, заложников и постов`);
  let crowded = 0;
  for (let a = 0; a < items.length; a++)
    for (let b = a + 1; b < items.length; b++)
      if (Math.hypot(items[a].x - items[b].x, items[a].y - items[b].y) < PROPS.GAP) crowded++;
  say(crowded === 0, `${label}: предметы не громоздятся друг на друга`);
  say(items.every(p => (PROP_SETS[p.zone] || PROP_SETS.default)[p.kind]) &&
      wear.every(p => p.kind === 'crack' || p.kind === 'stain'),
      `${label}: каждый предмет из набора своего помещения`);

  // Одинаково при повторной загрузке.
  const snap = JSON.stringify(props);
  startLevel(i); MAP_PROPS = null;
  say(JSON.stringify(mapProps()) === snap, `${label}: при повторной загрузке мусор лежит там же`);
}

// ── Плотность в комнатах змейки ──────────────────────────────────────────
{
  startLevel(4); MAP_PROPS = null;
  const props = mapProps();
  const counts = ROOMS.map(r => props.filter(p => !p.wear &&
    p.x >= r.x0 * T && p.x < (r.x1 + 1) * T && p.y >= r.y0 * T && p.y < (r.y1 + 1) * T).length);
  say(counts.every(n => n >= 5 && n <= 14), `в каждой комнате умеренно: ${counts.join(', ')} предметов`);
}

// ── Набор по назначению помещения ────────────────────────────────────────
{
  const byZone = {};
  for (let i = 2; i < 14; i++) {
    startLevel(i); MAP_PROPS = null;
    for (const p of mapProps()) if (!p.wear) (byZone[p.zone] ||= new Set()).add(p.kind);
  }
  say(byZone.yard && (byZone.yard.has('tire') || byZone.yard.has('tires')) && byZone.yard.has('rocks'),
      `во дворах есть покрышки и камни: ${[...byZone.yard].join(', ')}`);
  say(byZone.workshop && byZone.workshop.has('scrap') && byZone.workshop.has('barrel'),
      `в цехах металлолом и бочки: ${[...byZone.workshop].join(', ')}`);
  say(byZone.warehouse && byZone.warehouse.has('planks') && byZone.warehouse.has('cardboard'),
      `на складах поддоны и картон: ${[...byZone.warehouse].join(', ')}`);
  say(byZone.control && byZone.control.has('papers') && byZone.control.has('monitor'),
      `в диспетчерских бумаги и разбитые мониторы: ${[...byZone.control].join(', ')}`);
  const all = new Set(Object.values(byZone).flatMap(set => [...set]));
  say(Object.keys(PROP_DRAW).filter(k => k !== 'crack' && k !== 'stain').every(k => all.has(k)),
      `за 12 карт встречаются все ${Object.keys(PROP_DRAW).length - 2} видов мусора`);
}

// ── Отрисовка ────────────────────────────────────────────────────────────
{
  let calls = 0, crash = null;
  const rec = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => { calls++; }), set: (t, k, v) => { t[k] = v; return true; } });
  try {
    for (const kind of Object.keys(PROP_DRAW)) {
      const before = calls;
      PROP_DRAW[kind](rec, mulberry32(7));
      if (calls === before) throw new Error(`${kind} ничего не нарисовал`);
    }
  } catch (e) { crash = e; }
  say(!crash, crash ? `ПАДЕНИЕ: ${crash.message}` : `все ${Object.keys(PROP_DRAW).length} видов рисуются`);

  const order = [];
  const saved = { ...PROP_DRAW };
  for (const k of Object.keys(PROP_DRAW)) PROP_DRAW[k] = () => order.push(k);
  drawProps(rec, mapProps());
  Object.assign(PROP_DRAW, saved);
  const firstItem = order.findIndex(k => k !== 'crack' && k !== 'stain');
  say(order.slice(firstItem).every(k => k !== 'crack' && k !== 'stain'), 'трещины и пятна рисуются под предметами');

  say(blobPath.length === 2 && typeof roughBlob === 'function',
      'помощник мусора не перекрывает одноимённый помощник моделей бойцов');
}
