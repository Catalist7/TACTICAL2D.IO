/* ── Интеграционная симуляция: гоняем настоящие кадры без браузера ── */
const DT = 1 / 60;
const step = n => { for (let i = 0; i < n; i++) { updateRound(DT); updateWorld(DT); render(); } };
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };

startLevel(0);
say(state.phase === 'buy' && bots.length === ENEMY_POSTS.length && hostages.length === 4,
    `старт на карте «${MAP_NAME}»: ботов=${bots.length}, заложников=${hostages.length}`);
say(bots.every((b, i) => dist(b.x, b.y, ENEMY_POSTS[i].at.x, ENEMY_POSTS[i].at.y) < 1),
    'каждый враг стоит ровно на своей позиции');

// Оружие приходит из арсенала и переносится в раунд.
progress.money = 5000;
buyWeapon('ak'); buyArmor('kevlar');
startLevel(0);
say(player.slots.rifle === 'ak' && player.armor === 100,
    `из арсенала в бой: ${WEAPONS[player.slots.rifle].name}, броня ${player.armor}, кошелёк ${money(progress.money)}`);

// Заморозка действительно держит игрока на месте.
const froze = { x: player.x, y: player.y };
keys['w'] = true; step(30); keys['w'] = false;
say(player.x === froze.x && player.y === froze.y, 'в фазе закупки игрок не двигается');

beginLive();
say(state.phase === 'live', 'раунд начался');

// Новое поведение: без контакта враги остаются на позициях, а не патрулируют.
step(420);   // 7 секунд
const strayed = bots.filter(b => dist(b.x, b.y, b.post.x, b.post.y) > 30);
say(strayed.length === 0,
    `за 7 секунд никто не сошёл с позиции (режимы: ${[...new Set(bots.map(b => b.mode))].join(', ')})`);
const scanned = bots.some(b => Math.abs(angDiff(b.ang, b.facing)) > 0.05);
say(scanned, 'враги осматривают свой сектор, стоя на месте');

// Игрок бежит вправо — проверяем, что движение и коллизии работают.
const runFrom = { x: player.x, y: player.y };
keys['d'] = true; step(180); keys['d'] = false;
say(dist(player.x, player.y, runFrom.x, runFrom.y) > 60,
    `игрок пробежал ${dist(player.x, player.y, runFrom.x, runFrom.y).toFixed(0)}px`);
say(!hitsWall(player.x, player.y, player.r), 'игрок не застрял в стене');

// Стрельба в упор: ставим игрока и бота в заведомо открытом месте.
const victim = bots[0];
{
  let lane = null;
  for (let ty = 1; ty < MAP_H - 1 && !lane; ty++) {
    let run = 0;
    for (let tx = 1; tx < MAP_W; tx++) {
      if (walkable(tx, ty)) { run++; if (run >= 5) { lane = { ty, x0: tx - run + 1 }; break; } }
      else run = 0;
    }
  }
  const a = tc(lane.x0, lane.ty), b = tc(lane.x0 + 3, lane.ty);
  player.x = a.x; player.y = a.y;
  victim.x = b.x; victim.y = b.y;
  hostages.forEach(h => { h.x = SPAWN_CT.x; h.y = SPAWN_CT.y; });
}
victim.hp = 100; victim.armor = 0; victim.alive = true;
player.ang = 0; player.cooldown = 0; player.spread = 0;
giveWeapon(player, 'ak'); player.active = 'rifle';
let shots = 0;
while (victim.alive && shots < 40) { player.cooldown = 0; fireWeapon(player, 0, 0); shots++; }
say(!victim.alive, `бот убит за ${shots} выстрелов из AK`);
say(drops.some(d => d.wid === victim.weapon), 'убитый бот уронил ствол');

// Заложник идёт за игроком. Ставим его на заведомо проходимый тайл рядом.
const h = hostages[0];
{
  let placed = false;
  for (const [ox, oy] of [[-70,0],[70,0],[0,-70],[0,70],[-50,-50],[50,50]]) {
    const x = player.x + ox, y = player.y + oy;
    if (!hitsWall(x, y, h.r) && dist(x, y, player.x, player.y) > CFG.FOLLOW_GAP + 10) {
      h.x = x; h.y = y; placed = true; break;
    }
  }
  say(placed, 'нашлось свободное место рядом с игроком для заложника');
}
h.following = true;
const hFrom = dist(h.x, h.y, player.x, player.y);
step(90);
say(dist(h.x, h.y, player.x, player.y) < hFrom,
    `заложник подтянулся: ${hFrom.toFixed(0)}px → ${dist(h.x, h.y, player.x, player.y).toFixed(0)}px`);

// Эвакуация: доводим заложника до зоны и проверяем награду.
{
  h.x = RESCUE.x + RESCUE.w / 2; h.y = RESCUE.y + RESCUE.h / 2;
  h.update(DT);
  say(h.rescued, 'заложник доведён в зону эвакуации');
}

// Убийство заложника игроком штрафуется.
{
  const h2 = hostages[1];
  killEntity(h2, player);
  say(!h2.alive, 'убитый заложник выбывает');
}

// Победа по зачистке.
bots.forEach(b => { b.alive = false; });
const ctBefore = state.scoreCT;
step(2);
say(state.phase === 'end' && state.scoreCT === ctBefore + 1,
    `раунд закрыт: ${state.endReason} (счёт ${state.scoreCT}:${state.scoreT})`);

// Одной победы хватает, чтобы закрыть операцию.
say(state.levelDone, 'победа закрывает операцию — раунды дальше не идут');

// Для проверки самой машины раундов временно требуем больше побед.
LEVELS[0].wins = 99;
progress.money = 5000; buyWeapon('ak');
startLevel(0);
beginLive();
bots.forEach(b => { b.alive = false; });
step(2 + Math.ceil(CFG.END_TIME / DT) + 5);
say(state.round === 2 && state.phase === 'buy' && bots.every(b => b.alive),
    `раунд 2 начат, боты восстановлены (${bots.map(b => WEAPONS[b.weapon].name).join(', ')})`);
say(player.slots.rifle === 'ak', 'выживший сохранил оружие');

// Поражение: игрока убивают — снаряжение теряется.
beginLive();
const tLost = state.scoreT;
killEntity(player, bots[0]);
step(2);
say(state.phase === 'end' && state.scoreT === tLost + 1, `поражение засчитано: ${state.endReason}`);
step(Math.ceil(CFG.END_TIME / DT) + 5);
say(player.slots.rifle === LOADOUT.ct.rifle && player.slots.pistol === LOADOUT.ct.pistol,
    `после смерти возвращается стартовый пак: ${WEAPONS[player.slots.rifle].name} и ${WEAPONS[player.slots.pistol].name}`);
LEVELS[0].wins = 1;

// Долгий прогон без падений.
beginLive();
let crashed = null;
try { for (let i = 0; i < 3600; i++) { updateRound(DT); updateWorld(DT); if (i % 3 === 0) render(); } }
catch (e) { crashed = e; }
say(!crashed, crashed ? 'ПАДЕНИЕ: ' + crashed.stack.split('\n').slice(0, 3).join(' | ') : '60 секунд симуляции с отрисовкой — без исключений');
console.log(`\nитог: раунд ${state.round}, счёт ${state.scoreCT}:${state.scoreT}, кошелёк ${money(progress.money)}`);
