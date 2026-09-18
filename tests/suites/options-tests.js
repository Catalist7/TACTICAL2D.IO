
/* Настройки: выучка напарников и общий обзор. Плюс расталкивание бойцов. */
const DT = 1 / 60;
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
const shown = id => $(id).classList.contains('show');
const click = id => $(id).onclick && $(id).onclick();
const step = n => { for (let i = 0; i < n; i++) updateWorld(DT); };
const T = CFG.TILE;

Math.random = mulberry32(31337);
progress.tutorial = 'done';
progress.completed = 8;

/** Прямой коридор: 12 клеток по горизонтали и по клетке сверху и снизу. */
function lane() {
  for (let ty = 2; ty < MAP_H - 2; ty++)
    for (let tx = 2; tx < MAP_W - 14; tx++) {
      let ok = true;
      for (let i = 0; i < 12 && ok; i++)
        for (let j = -1; j <= 1; j++) if (!walkable(tx + i, ty + j)) ok = false;
      if (ok) return { x0: (tx + .5) * T, y: (ty + .5) * T };
    }
  return null;
}

startLevel(0);                 // карта загружена: дальше lane() работает в любом блоке
const LANE = lane();
returnToMenu();

function squadOf(list) {
  progress.squad = list.map(([cls, level]) => ({ cls, level }));
  startLevel(0);
  beginLive();
  bots.forEach(b => { b.alive = false; });
  hostages.forEach(h => { h.alive = false; h.rescued = true; });
  return allies;
}

// ── Значения по умолчанию и хранение ──────────────────────────────────────
{
  say(OPTIONS.length === 2 && OPTIONS.map(o => o.id).join() === 'squadSkill,sharedVision',
      'в настройках два пункта: выучка напарников и общий обзор');
  say(OPTIONS.every(o => o.choices.length === 2 && o.name && o.desc),
      'у каждого пункта есть название, пояснение и два варианта');

  say(setting('squadSkill') === 'medium' && !squadStrong(), 'по умолчанию напарники средние');
  say(setting('sharedVision') === 'off' && !sharedVision(), 'по умолчанию общий обзор выключен');

  say(setOption('squadSkill', 'strong') && squadStrong(), 'выучку можно переключить на сильную');
  say(!setOption('squadSkill', 'гениальные'), 'неизвестное значение не принимается');
  say(squadStrong(), 'и настройку не портит');
  say(!setOption('чтоугодно', 'strong'), 'неизвестный пункт не принимается');

  setOption('sharedVision', 'on');
  saveProgress();
  progress.settings = { squadSkill: 'medium', sharedVision: 'off' };
  loadProgress();
  say(squadStrong() && sharedVision(), 'настройки переживают перезагрузку');

  localStorage.setItem(PROGRESS_KEY, JSON.stringify({ completed: 3,
    settings: { squadSkill: 'ниндзя', sharedVision: 'on', цвет: 'синий' } }));
  progress.settings = { squadSkill: 'medium', sharedVision: 'off' };
  loadProgress();
  say(setting('squadSkill') === 'medium', 'мусорное значение из сохранения отброшено');
  say(sharedVision(), 'а годное — принято');
  say(!('цвет' in progress.settings), 'лишние поля в настройки не попадают');

  // Старое сохранение без настроек: играем на значениях по умолчанию.
  localStorage.setItem(PROGRESS_KEY, JSON.stringify({ completed: 3 }));
  progress.settings = { squadSkill: 'medium', sharedVision: 'off' };
  loadProgress();
  say(!squadStrong() && !sharedVision(), 'сохранение без настроек даёт значения по умолчанию');
}

// ── Экран настроек ────────────────────────────────────────────────────────
{
  returnToMenu();
  say(!$('btnSettings').disabled, 'кнопка «Настройки» в меню активна');
  click('btnSettings');
  say(shown('settingsScreen'), 'экран настроек открывается');

  const boxes = [...$('optionList').children];
  say(boxes.length === 2, 'на экране обе настройки');
  const box = id => boxes.find(b => b.dataset.option === id);

  const skill = box('squadSkill');
  say(!!skill && skill.choiceButtons.medium.classList.contains('on'),
      'текущий вариант подсвечен');
  skill.choiceButtons.strong.onclick();
  // Экран перерисовался — карточки берём заново.
  const again = id => [...$('optionList').children].find(b2 => b2.dataset.option === id);
  say(squadStrong() && again('squadSkill').choiceButtons.strong.classList.contains('on'),
      'клик по варианту переключает настройку и подсветку');
  say(!again('squadSkill').choiceButtons.medium.classList.contains('on'),
      'прежний вариант гаснет');

  again('sharedVision').choiceButtons.on.onclick();
  say(sharedVision(), 'общий обзор включается кликом');

  progress.settings = { squadSkill: 'medium', sharedVision: 'off' };
  loadProgress();
  say(squadStrong() && sharedVision(), 'выбор с экрана сразу попал в сохранение');

  click('btnSettingsBack');
  say(shown('menuScreen'), 'из настроек возвращаемся в меню');

  // Настройки не трогают деньги и снаряжение.
  const money0 = progress.money, owned0 = progress.owned.length;
  setOption('squadSkill', 'medium');
  say(progress.money === money0 && progress.owned.length === owned0,
      'переключение настроек не трогает кошелёк и арсенал');
}

// ── Никто не стоит внутри другого ─────────────────────────────────────────
{
  setOption('squadSkill', 'medium');
  setOption('sharedVision', 'off');
  const L = LANE;

  // Два врага в одной точке расходятся.
  progress.squad = [];
  startLevel(0); beginLive();
  hostages.forEach(h => { h.alive = false; h.rescued = true; });
  player.x = L.x0 - 300; player.y = L.y - 300;
  const [b1, b2] = bots;
  bots.forEach((b, i) => { b.alive = i < 2; });
  Object.assign(b1, { x: L.x0 + 4 * T, y: L.y, post: { x: L.x0 + 4 * T, y: L.y }, mode: 'guard' });
  Object.assign(b2, { x: L.x0 + 4 * T, y: L.y, post: { x: L.x0 + 4 * T, y: L.y }, mode: 'guard' });
  say(dist(b1.x, b1.y, b2.x, b2.y) < 1, 'ставим двух врагов ровно друг в друга');
  step(30);
  const apart = dist(b1.x, b1.y, b2.x, b2.y);
  say(apart >= b1.r + b2.r - 1, `разошлись: ${Math.round(apart)} px при сумме радиусов ${b1.r + b2.r}`);
  say(!hitsWall(b1.x, b1.y, b1.r) && !hitsWall(b2.x, b2.y, b2.r), 'и никого не вытолкнуло в стену');

  // Бойцы отряда тоже не слипаются.
  const squad = squadOf([['assault', 1], ['medic', 1], ['shield', 1], ['assault', 3]]);
  player.x = L.x0; player.y = L.y;
  squad.forEach(a => { a.x = L.x0; a.y = L.y; });
  step(60);
  let worst = Infinity;
  for (let i = 0; i < squad.length; i++)
    for (let j = i + 1; j < squad.length; j++)
      worst = Math.min(worst, dist(squad[i].x, squad[i].y, squad[j].x, squad[j].y));
  say(worst >= squad[0].r * 2 - 2, `бойцы отряда держат дистанцию: ближайшие в ${Math.round(worst)} px`);

  // Игрока не двигает никто.
  const px = player.x, py = player.y;
  squad.forEach(a => { a.x = player.x; a.y = player.y; });
  for (let i = 0; i < 10; i++) separateEntities();   // те же десять кадров, что в игре
  say(player.x === px && player.y === py, 'игрока расталкивание не сдвигает');
  say(squad.every(a => dist(a.x, a.y, player.x, player.y) >= a.r + player.r - 2),
      'а бойцы выходят из него сами');

  // Враг тоже не залезает в игрока.
  const foe = bots[0];
  Object.assign(foe, { alive: true, x: player.x, y: player.y });
  for (let i = 0; i < 10; i++) separateEntities();
  say(dist(foe.x, foe.y, player.x, player.y) >= foe.r + player.r - 2 &&
      player.x === px && player.y === py, 'враг выходит из игрока, а игрок стоит где стоял');
}

// ── Сильная выучка: сектора, углы, память ─────────────────────────────────
{
  const L = LANE;

  /** Куда смотрит боец, когда врага не видно, при заданной выучке. */
  function watchAngle(skill, place) {
    setOption('squadSkill', skill);
    const [a] = squadOf([['assault', 1]]);
    player.x = L.x0 + 5 * T; player.y = L.y;
    player.ang = -Math.PI / 2;                 // игрок смотрит вбок
    a.x = place.x; a.y = place.y; a.ang = -Math.PI / 2;
    a.order = { x: place.x, y: place.y };      // стоит на месте, чтобы мерить поворот
    step(120);
    return a;
  }

  /** Насколько далеко видно из точки в направлении ang. */
  const openness = (x, y, ang) => castRay(x, y, ang, CFG.VIEW_DIST);

  // Сильный боец держит самую открытую сторону, а не смотрит вслед игроку.
  {
    const a = watchAngle('strong', { x: L.x0 + 5 * T, y: L.y });
    say(a.watch !== null, 'сильный боец сам выбрал сектор осмотра');
    let best = 0;
    for (let i = 0; i < 64; i++) best = Math.max(best, openness(a.x, a.y, (i / 64) * TAU));
    const mine = openness(a.x, a.y, a.ang);
    say(mine > best * 0.7,
        `смотрит в открытую сторону: видно на ${Math.round(mine)} px при лучших ${Math.round(best)}`);
    say(mine > openness(a.x, a.y, player.ang) * 1.2,
        `и это не направление игрока: ${Math.round(mine)} против ${Math.round(openness(a.x, a.y, player.ang))} px`);
  }
  {
    const a = watchAngle('medium', { x: L.x0 + 5 * T, y: L.y });
    say(a.watch === null, 'средний боец сектор не выбирает');
    say(Math.abs(angDiff(a.ang, player.ang)) < 0.5, 'он просто держит направление игрока');
  }

  // Память отряда: враг, которого видел игрок, задаёт направление бойцу.
  {
    setOption('squadSkill', 'strong');
    const [a] = squadOf([['assault', 1]]);
    player.x = L.x0; player.y = L.y; player.ang = 0;
    a.x = L.x0; a.y = L.y; a.ang = Math.PI;
    a.order = { x: L.x0, y: L.y };
    const foe = bots[0];
    Object.assign(foe, { alive: true, hp: 100, x: L.x0 + 6 * T, y: L.y,
                         post: { x: L.x0 + 6 * T, y: L.y }, mode: 'guard',
                         skill: { ...skillForRound(1), react: 999 } });
    foe.setMode('guard');
    updateSquadIntel(0.016);
    say(squadIntel.some(s => s.bot === foe), 'враг, которого видит игрок, попал в разведку отряда');
    const spot = freshIntel(a.x, a.y);
    say(!!spot && dist(spot.x, spot.y, foe.x, foe.y) < 1, 'отметка стоит там, где врага видели');

    foe.alive = false;                        // враг скрылся, отметка ещё жива
    squadIntel = [{ bot: null, x: L.x0 + 6 * T, y: L.y, age: 0.2 }];
    a.ang = Math.PI;
    for (let i = 0; i < 60; i++) { updateWorld(DT); squadIntel[0].age = 0.2; }
    say(Math.abs(angDiff(a.ang, 0)) < 0.4,
        `боец развернулся туда, где отряд видел врага: отклонение ${Math.abs(angDiff(a.ang, 0)).toFixed(2)} рад`);

    squadIntel = [];
    step(120);
    say(squadIntel.length === 0, 'отметка исчезла — врага больше никто не видит');
  }

  // Двое бойцов держат разные стороны, а не смотрят в одну точку.
  {
    setOption('squadSkill', 'strong');
    const squad = squadOf([['assault', 1], ['assault', 3]]);
    player.x = L.x0 + 5 * T; player.y = L.y; player.ang = -Math.PI / 2;
    squad.forEach((a, i) => { a.x = L.x0 + (4 + i) * T; a.y = L.y; a.order = { x: a.x, y: a.y }; });
    step(180);
    const gap = Math.abs(angDiff(squad[0].ang, squad[1].ang));
    say(gap > 0.6, `двое держат разные сектора: между взглядами ${gap.toFixed(2)} рад`);
  }

  // Сильные реагируют быстрее своей таблицы.
  {
    const st = allyStats('assault', 1);
    setOption('squadSkill', 'strong');
    const [a] = squadOf([['assault', 1]]);
    const foe = bots[0];
    Object.assign(foe, { alive: true, hp: 100, x: a.x + 200, y: a.y, post: { x: a.x + 200, y: a.y } });
    a.ang = Math.atan2(foe.y - a.y, foe.x - a.x);
    a.update(DT);
    say(a.react < st.react, `сильный реагирует быстрее: ${a.react.toFixed(2)} против ${st.react} с`);
  }
  setOption('squadSkill', 'medium');
}

// ── Общий обзор ───────────────────────────────────────────────────────────
{
  const L = LANE;
  const [a] = squadOf([['assault', 1]]);
  // Игрок отвернулся и стоит далеко, боец смотрит на точку.
  player.x = L.x0; player.y = L.y; player.ang = Math.PI;
  a.x = L.x0 + 6 * T; a.y = L.y; a.ang = 0;
  const spot = { x: L.x0 + 9 * T, y: L.y };

  setOption('sharedVision', 'off');
  say(!playerSees(spot.x, spot.y), 'с выключенным обзором точку за спиной игрок не видит');
  say(allySees(a, spot.x, spot.y), 'а боец её видит');

  setOption('sharedVision', 'on');
  say(playerSees(spot.x, spot.y), 'с включённым — видит и игрок');
  a.alive = false;
  say(!playerSees(spot.x, spot.y), 'раненый боец глазами отряда быть перестаёт');
  a.alive = true;

  // Врага, которого видит только боец, теперь рисуют.
  const foe = bots[0];
  Object.assign(foe, { alive: true, hp: 100, x: spot.x, y: spot.y,
                       post: { x: spot.x, y: spot.y }, skill: { ...skillForRound(1), react: 999 } });
  say(playerSees(foe.x, foe.y), 'врага в конусе бойца видно на экране');
  setOption('sharedVision', 'off');
  say(!playerSees(foe.x, foe.y), 'с выключенной настройкой — снова не видно');

  // Туман: конусы бойцов вырезаются только при включённой настройке.
  const realPoly = buildVisionPolygon;
  let calls = 0;
  buildVisionPolygon = function (...args) { calls++; return realPoly.apply(null, args); };
  drawFog(0, 0);
  const off = calls;
  setOption('sharedVision', 'on');
  calls = 0;
  drawFog(0, 0);
  const on = calls;
  buildVisionPolygon = realPoly;
  say(off === 2, `без общего обзора туман строит только конусы игрока: ${off}`);
  say(on === off + 2 * allies.filter(x => x.alive).length,
      `с общим обзором добавляются конусы бойцов: ${on}`);

  setOption('sharedVision', 'off');
}

// ── Кадр и производительность ─────────────────────────────────────────────
{
  const squad = squadOf([['assault', 1], ['medic', 5], ['shield', 10], ['assault', 10]]);
  setOption('squadSkill', 'strong');
  setOption('sharedVision', 'on');
  let crash = null;
  try { for (let i = 0; i < 120; i++) { updateWorld(DT); render(); } }
  catch (e) { crash = e; }
  say(!crash, crash ? 'ПАДЕНИЕ: ' + crash.message : 'сильная выучка и общий обзор рисуются без падений');
  say(squad.every(x => !hitsWall(x.x, x.y, x.r)), 'за две секунды никто не оказался в стене');
  setOption('squadSkill', 'medium');
  setOption('sharedVision', 'off');
}
