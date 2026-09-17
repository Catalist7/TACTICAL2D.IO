
const DT = 1/60;
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
const step = n => { for (let i = 0; i < n; i++) { if (!state.running) break; updateRound(DT); updateWorld(DT); } };
const shown = id => $(id).classList.contains('show');
progress.tutorial = 'done';   // опытный игрок; обучение проверяется отдельно

// ── Ручные карты не тронуты ──────────────────────────────────────────────
say(MAPS.office.enemies.length === 7 && MAPS.office.hostages.length === 4 && MAPS.office.w === 44,
    'Офис как был: 44×30, 7 врагов, 4 заложника');
say(MAPS.plant.enemies.length === 10 && MAPS.plant.hostages.length === 4 && MAPS.plant.w === 64,
    'Комбинат как был: 64×24, 10 врагов, 4 заложника');
say(levelAt(0).map === 'office' && levelAt(1).map === 'plant', 'первые два уровня — ручные');

// ── Дальше — процедурные ─────────────────────────────────────────────────
const l3 = levelAt(2);
say(l3.generated && MAPS[l3.map] && MAPS[l3.map].generated, `уровень 3 сгенерирован: «${l3.name}», ${l3.brief}`);
say(levelAt(2) === l3, 'повторное обращение отдаёт ту же операцию из кэша');
{
  const again = generateMap(levelSeed(3), 3);
  say(JSON.stringify(again.ops) === JSON.stringify(MAPS[l3.map].ops), 'уровень 3 воспроизводится из сида байт в байт');
}
say(levelAt(49).generated && MAPS[levelAt(49).map].rooms.length === GEN.ROOMS_MAX,
    `уровень 50 тоже строится: ${MAPS[levelAt(49).map].w}×${MAPS[levelAt(49).map].h}, ${MAPS[levelAt(49).map].rooms.length} комнат, ${MAPS[levelAt(49).map].enemies.length} врагов`);

// ── Экран выбора растёт по мере прохождения ──────────────────────────────
progress.completed = 0;
openLevels();
say($('levelList').children.length === 2, 'в начале видно две операции');
progress.completed = 2;
openLevels();
{
  const cards = $('levelList').children;
  say(cards.length === 4, `пройдя две ручные, видишь 4 карточки`);
  say(!cards[2].disabled && cards[3].disabled, 'третья — сгенерированная — открыта, четвёртая закрыта');
}

// ── Сгенерированная операция играется и закрывается ──────────────────────
progress.completed = 2;
startLevel(2);
say(state.running && MAP_NAME === MAPS[l3.map].name, `операция 3 запущена на карте «${MAP_NAME}» ${MAP_W}×${MAP_H}`);
say(!KEY_TILE_FIXES.length, 'загрузчику не пришлось вырезать ни одной клетки');
say(bots.length === MAPS[l3.map].enemies.length && hostages.length === MAPS[l3.map].hostages.length,
    `в бою ${bots.length} врагов и ${hostages.length} заложника`);
beginLive();
let crash = null;
try { for (let i = 0; i < 1800; i++) { updateRound(DT); updateWorld(DT); render(); } } catch (e) { crash = e; }
say(!crash, crash ? 'ПАДЕНИЕ: ' + crash.message : '30 секунд боя с отрисовкой — без исключений');
say(bots.filter(b => b.alive).every(b => dist(b.x, b.y, b.post.x, b.post.y) <= CFG.BOT_LEASH + 2),
    'враги на сгенерированной карте держат поводок');

startLevel(2); beginLive();
bots.forEach(b => { b.alive = false; });
step(2 + Math.ceil(CFG.END_TIME / DT) + 5);
say(shown('levelDone') && progress.completed === 3, 'операция 3 закрыта, прогресс 3');
say(!$('btnNextLevel').hidden && /Операция 4/.test($('btnNextLevel').textContent),
    `итоги предлагают следующую: «${$('btnNextLevel').textContent}»`);

// ── Кэш и сохранение ─────────────────────────────────────────────────────
saveProgress();
progress.completed = 0;
loadProgress();
say(progress.completed === 3, 'прогресс за пределами двух ручных уровней переживает перезагрузку');
