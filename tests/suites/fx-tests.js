
const DT = 1 / 60;
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
progress.tutorial = 'done';
const T = CFG.TILE;
const kinds = arr => arr.reduce((m, o) => (m[o.kind || o.settle || 'ход'] = (m[o.kind || o.settle || 'ход'] || 0) + 1, m), {});
const bloodP = () => particles.filter(p => p.settle === 'blood');
const settle = ms => { for (let i = 0; i < ms; i++) updateWorld(DT); };

startLevel(0); beginLive();
// Для замеров бой замораживаем: живой бот стреляет в ответ, и его попадания
// подмешивали бы свою кровь в подсчёты. Флаг снимаем без killEntity, чтобы
// раунд не закончился.
const freeze = () => { bots.forEach(b => { b.alive = false; }); hostages.forEach(h => { h.alive = false; }); };
const target = () => { const b = bots[0]; b.alive = true; b.hp = 100; b.armor = 0; return b; };

// ── Кровь из раны ────────────────────────────────────────────────────────
{
  freeze();
  const bot = target();
  particles = []; decals = [];
  player.x = bot.x - 60; player.y = bot.y; player.ang = 0;
  const hp0 = bot.hp;
  hitscan(player.x, player.y, 0, WEAPONS.usp, player);
  say(bot.hp < hp0, 'попадание по террористу засчитано');
  say(bloodP().length >= 4, `из раны летят брызги: ${bloodP().length} капель`);
  say(decals.some(d => d.kind === 'blood'), 'в месте попадания остаётся пятно');
  say(particles.every(p => p.color && p.size > 0 && p.decay > 0), 'у каждой капли есть цвет, размер и время жизни');

  const before = decals.length;
  bot.alive = false;               // дальше стреляет только тест
  settle(60);
  say(bloodP().length === 0 && decals.filter(d => d.kind === 'blood').length > before - 1,
      `капли осели пятнами: пятен ${decals.filter(d => d.kind === 'blood').length}`);
}

// ── Искры по бетону, щепки по ящику ──────────────────────────────────────
{
  const find = material => {
    for (let ty = 2; ty < MAP_H - 2; ty++)
      for (let tx = 2; tx < MAP_W - 2; tx++)
        if (cell(tx, ty) === FLOOR && cell(tx + 1, ty) === material &&
            !bots.some(b => Math.hypot(b.x - (tx + .5) * T, b.y - (ty + .5) * T) < 120))
          return { x: (tx + .5) * T, y: (ty + .5) * T };
    return null;
  };
  const wall = find(WALL), crate = find(CRATE);
  say(wall && crate, 'на карте нашлись бетонная стена и ящик для проверки');

  particles = []; decals = [];
  hitscan(wall.x, wall.y, 0, WEAPONS.usp, player);
  const sparks = particles.filter(p => p.glow);
  say(sparks.length >= 6, `по бетону летят искры: ${sparks.length}`);
  say(particles.length > sparks.length, 'вместе с искрами поднимается пыль');
  say(decals.some(d => d.kind === 'bullet'), 'на бетоне остаётся отметина от пули');
  say(!particles.some(p => p.settle === 'blood'), 'от стены кровь не идёт');

  particles = []; decals = [];
  hitscan(crate.x, crate.y, 0, WEAPONS.usp, player);
  const chips = particles.filter(p => p.settle === 'chip');
  say(chips.length >= 6 && !particles.some(p => p.glow), `из ящика летят щепки без искр: ${chips.length}`);
  settle(60);
  say(decals.some(d => d.kind === 'chip'), 'щепки остаются лежать на полу');
}

// ── Гильзы ───────────────────────────────────────────────────────────────
{
  particles = []; decals = [];
  player.cooldown = 0; player.reloading = 0;
  player.active = 'pistol';
  fireWeapon(player, 0);
  const shells = particles.filter(p => p.settle === 'shell');
  say(shells.length === 1, 'на выстрел вылетает одна гильза');
  say(flashes.length > 0 && flashes[flashes.length - 1].r > 0, 'выстрел даёт вспышку-свет');
  settle(60);
  say(decals.some(d => d.kind === 'shell'), 'гильза остаётся лежать на полу');

  particles = [];
  player.active = 'melee'; player.cooldown = 0;
  fireWeapon(player, 0);
  say(!particles.some(p => p.settle === 'shell'), 'у ножа гильз нет');
  player.active = 'pistol';
}

// ── Лужа под телом ───────────────────────────────────────────────────────
{
  decals = []; particles = [];
  const bot = target();
  killEntity(bot, player);
  const pool = decals.find(d => d.kind === 'pool');
  say(pool && pool.r < pool.rMax, 'под убитым появляется лужа и она ещё маленькая');
  say(particles.filter(p => p.settle === 'blood').length >= 10, 'смерть даёт брызги во все стороны');
  settle(120);
  say(pool.r === pool.rMax, `лужа растеклась до ${pool.rMax.toFixed(0)} px`);
}

// ── Кровь держится дольше следов пуль ────────────────────────────────────
{
  decals = [{ x: 100, y: 100, kind: 'blood', life: 1, decay: 0.012, r: 5, seed: 0.3 },
            { x: 100, y: 100, kind: 'bullet', life: 1, decay: 0.06, r: 2.6, seed: 0.3 }];
  settle(30 * 60);
  say(decals.length === 1 && decals[0].kind === 'blood',
      `через 30 секунд след от пули исчез, кровь осталась (${decals[0].life.toFixed(2)} от яркости)`);
}

// ── Потолки: долгая перестрелка не копит мусор бесконечно ────────────────
{
  freeze();
  particles = []; decals = [];
  for (let i = 0; i < 400; i++) {
    player.cooldown = 0; player.reloading = 0;
    const am = ammoOf(player, player.slots.pistol); am.mag = 10;
    fireWeapon(player, i * 0.37);
    updateWorld(DT);
  }
  say(particles.length <= PARTICLE_CAP, `частиц не больше потолка: ${particles.length} ≤ ${PARTICLE_CAP}`);
  say(decals.length <= 260, `отметин не больше потолка: ${decals.length} ≤ 260`);
  say(Object.keys(kinds(decals)).length >= 2, `на полу разный мусор: ${JSON.stringify(kinds(decals))}`);
}

// ── Новый раунд начинается с чистого пола ────────────────────────────────
{
  startLevel(0);
  say(particles.length === 0 && decals.length === 0 && corpses.length === 0,
      'в новом раунде ни крови, ни гильз с прошлого');
}

// ── Палитра ──────────────────────────────────────────────────────────────
{
  const kindsAll = Object.keys(ROOM_NAMES);
  say(kindsAll.every(k => ROOM_TINT[k]), `оттенок задан для всех помещений: ${kindsAll.join(', ')}`);
  say(new Set(Object.values(ROOM_TINT)).size === kindsAll.length, 'оттенки не повторяются');
  say(Object.values(ROOM_TINT).every(t => /^rgba\(\d+,\s?\d+,\s?\d+,\.\d+\)$/.test(t)), 'оттенки полупрозрачные');
  say(Object.values(ROOM_TINT).every(t => parseFloat(t.split(',')[3]) <= 0.2),
      'оттенок не забивает пол — прозрачность не выше 0.2');
  say(MAPS.plant.sections.every(sec => ROOM_TINT[KIND_BY_NAME[sec.name]]),
      'секции «Комбината» тоже получают оттенок');
  const gen = MAPS[levelAt(2).map];
  say(gen.rooms.every(r => ROOM_TINT[r.kind]), 'у сгенерированной карты оттенок есть у каждой комнаты');
  say(COL.floorIn !== COL.floorOut, 'пол внутри и во дворе разного цвета');
  say(hexAlpha('#ffe3a0', 0.5) === 'rgba(255,227,160,0.500)' && hexAlpha('#000000', 5) === 'rgba(0,0,0,1.000)',
      'прозрачность цвета считается и зажимается');
  say(Object.keys(TRACER_COL).every(k => /^#[0-9a-f]{6}$/.test(TRACER_COL[k])), 'у каждого класса оружия свой цвет трассера');
  say(new Set(['awp', 'ak', 'usp', 'nova'].map(id => TRACER_COL[PEN_CLASS[id]])).size === 4,
      'снайперка, винтовка, пистолет и дробовик стреляют разными по цвету трассерами');
}

// ── Отрисовка с эффектами не падает ──────────────────────────────────────
{
  startLevel(0); beginLive();
  freeze();
  const bot = target();
  player.x = bot.x - 60; player.y = bot.y;
  for (let i = 0; i < 8; i++) hitscan(player.x, player.y, 0, WEAPONS.ak, player);
  killEntity(bots[1], player);
  let crash = null, drawn = 0;
  const realArc = ctx.arc;
  ctx.arc = (...a) => { drawn++; return realArc && realArc.call ? undefined : undefined; };
  try { for (let i = 0; i < 20; i++) { updateWorld(DT); render(); } } catch (e) { crash = e; }
  ctx.arc = realArc;
  say(!crash, crash ? 'ПАДЕНИЕ отрисовки: ' + crash.message : `кадр с кровью и искрами рисуется (${drawn} фигур за 20 кадров)`);
  say(drawn > 100, 'частицы и пятна действительно рисуются');
}
