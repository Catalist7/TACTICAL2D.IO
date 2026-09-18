
const DT = 1/60;
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
const step = n => { for (let i = 0; i < n; i++) { updateRound(DT); updateWorld(DT); } };
const shown = id => $(id).classList.contains('show');
const click = id => $(id).onclick && $(id).onclick();
// Здесь проверяется поток уровней опытного игрока; само обучение — в sim-tutorial.
progress.tutorial = 'done';

// ── Стартовое состояние ──────────────────────────────────────────────────
say(shown('menuScreen') && !state.running, 'игра открывается на главном экране, бой не идёт');
say(!$('btnArsenal').disabled && !$('btnSquad').disabled && !$('btnSettings').disabled,
    'все разделы меню открыты: Арсенал, Отряд, Настройки');
say(!$('btnPlay').disabled, 'кнопка Играть активна');

// ── Переход в выбор операции ─────────────────────────────────────────────
click('btnPlay');
say(shown('levelScreen') && !shown('menuScreen'), 'кнопка Играть открывает выбор операции');
const cards = $('levelList').children;
say(cards.length === visibleLevelCount(), `карточек: ${cards.length} — пройденные, доступная и одна закрытая впереди`);
say(!cards[0].disabled && cards[1].disabled, 'первая операция доступна, вторая закрыта');
click('btnBackMenu');
say(shown('menuScreen'), 'кнопка назад возвращает в меню');

// ── Закрытый уровень не запускается ──────────────────────────────────────
startLevel(1);
say(!state.running && !shown('levelDone'), 'запустить закрытую операцию нельзя');

// ── Первая операция играется ─────────────────────────────────────────────
startLevel(0);
say(state.running && MAP_NAME === MAPS[LEVELS[0].map].name,
    `первая операция запустилась на карте «${MAP_NAME}»`);
say(!shown('menuScreen') && !shown('levelScreen'), 'экраны меню убраны на время боя');

// ── Поражение операцию не заваливает ─────────────────────────────────────
beginLive();
killEntity(player, bots[0]);
step(2);
say(state.phase === 'end' && !state.levelDone, 'поражение не закрывает операцию');
step(Math.ceil(CFG.END_TIME / DT) + 5);
say(state.running && state.round === 2, 'после поражения просто идёт следующий раунд');

// ── Победа закрывает операцию и открывает следующую ──────────────────────
beginLive();
bots.forEach(b => { b.alive = false; });
step(2);
say(state.levelDone, 'победа в раунде засчитана операции');
step(Math.ceil(CFG.END_TIME / DT) + 5);
say(shown('levelDone') && !state.running, 'показан экран итогов, бой остановлен');
say(progress.completed === 1, `прогресс отмечен: пройдено ${progress.completed}`);
say($('doneStats').children.length === 4, 'на итогах четыре показателя');
say(!$('btnNextLevel').hidden, 'предложена следующая операция');

// ── Вторая операция теперь открыта ───────────────────────────────────────
click('btnDoneMenu');
say(shown('menuScreen') && !state.running, 'из итогов можно выйти в меню');
click('btnPlay');
say(!$('levelList').children[1].disabled, 'вторая операция открылась');
startLevel(1);
say(state.running && MAP_NAME === MAPS[LEVELS[1].map].name,
    `вторая операция идёт на карте «${MAP_NAME}»`);

// ── Выход в меню из паузы ────────────────────────────────────────────────
beginLive();
step(60);
click('btnMenuFromPause');
say(shown('menuScreen') && !state.running && !state.paused, 'из паузы можно выйти в меню');

// ── Прогресс переживает перезагрузку ─────────────────────────────────────
progress.completed = 0;
loadProgress();
say(progress.completed === 1, 'прогресс прочитан из хранилища после сброса в памяти');

// ── Недоступное хранилище не роняет игру ─────────────────────────────────
globalThis.__storeBroken = true;
let crashed = null;
try { loadProgress(); saveProgress(); } catch (e) { crashed = e; }
globalThis.__storeBroken = false;
say(!crashed, crashed ? 'ПАДЕНИЕ: ' + crashed.message : 'запрещённое хранилище не ломает игру');

// ── Механизм «та же карта, другая расстановка» ───────────────────────────
{
  const base = MAPS.plant.enemies;
  LEVELS.push({
    id: 'test', name: 'Проверка', map: 'plant', wins: 1,
    enemies: [base[0], base[1]],                 // вдвое меньше врагов на той же карте
    brief: 'временный уровень для проверки механизма',
  });
  progress.completed = LEVELS.length;
  startLevel(LEVELS.length - 1);
  say(MAP_NAME === MAPS.plant.name && bots.length === 2,
      `уровень переопределил расстановку: та же карта, ${bots.length} врага вместо ${base.length}`);
  say(bots.every(b => !hitsWall(b.x, b.y, b.r)), 'враги из переопределения стоят свободно');
  LEVELS.pop();
}
