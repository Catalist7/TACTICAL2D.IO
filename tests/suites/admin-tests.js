
/* Панель разработчика: секретный вызов, команды и их влияние на игру. */
const DT = 1 / 60;
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
const step = n => { for (let i = 0; i < n; i++) updateWorld(DT); };
const key = (k, mod = {}) => {
  const e = { key: k, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false,
              preventDefault() { this.prevented = true; }, ...mod };
  for (const fn of __listeners.window.keydown || []) fn(e);
  return e;
};
const keyUp = k => { for (const fn of __listeners.window.keyup || []) fn({ key: k }); };
const run = line => runAdminCommand(line);

Math.random = mulberry32(777);
progress.tutorial = 'done';

// ── Секретный вызов ───────────────────────────────────────────────────────
{
  say(!admin.open && $('adminPanel').hidden !== false, 'по умолчанию панель скрыта');

  key('`', { ctrlKey: true, shiftKey: true });
  say(admin.open && $('adminPanel').hidden === false, 'Ctrl+Shift+` открывает панель');
  key('escape');
  say(!admin.open && $('adminPanel').hidden === true, 'Esc закрывает');

  key('`', { ctrlKey: true, shiftKey: true });
  key('`', { ctrlKey: true, shiftKey: true });
  say(!admin.open, 'та же комбинация закрывает');

  // Случайное нажатие одной клавиши панель не открывает.
  key('`');
  keyUp('`');
  say(!admin.open, 'просто ` панель не открывает — это отладочный обзор');

  // Слово «admin» набирается подряд.
  for (const k of 'admin') { key(k); keyUp(k); }
  say(admin.open, 'набранное слово «admin» тоже открывает панель');
  key('escape');
  for (const k of 'фвьшт') { key(k); keyUp(k); }     // то же слово в русской раскладке
  say(admin.open, 'и в русской раскладке — «фвьшт»');
  key('escape');

  // Набор с паузой не срабатывает.
  for (const k of 'admi') { key(k); keyUp(k); }
  admin.typedAt -= 5000;
  key('n'); keyUp('n');
  say(!admin.open, 'если набирать медленно — не открывается');
  admin.typed = '';

  // Внутри слова встретилось лишнее — не считается.
  for (const k of 'adxmin') { key(k); keyUp(k); }
  say(!admin.open, 'слово с опечаткой не открывает');
  admin.typed = '';

  // То же слово, набранное в самой консоли, её не закрывает.
  openAdmin();
  for (const k of 'admin') { key(k); keyUp(k); }
  say(admin.open, 'слово, набранное в поле ввода, панель не закрывает');
  key('`', { ctrlKey: true, shiftKey: true });
  say(!admin.open, 'а комбинация закрывает и изнутри');
}

// ── Клавиши в игру не проваливаются ───────────────────────────────────────
{
  progress.completed = 5;
  startLevel(0); beginLive();
  player.x = SPAWN_CT.x; player.y = SPAWN_CT.y;
  const x0 = player.x;

  openAdmin();
  say(state.paused && admin.pausedByPanel, 'открытая панель ставит бой на паузу');
  key('d'); key('w');
  step(30);
  say(player.x === x0, 'буквы уходят в поле ввода, игрок не бежит');
  say(!keys['d'], 'клавиша не залипает в игре');

  // Мышь по полю не стреляет.
  const shots0 = tracers.length;
  for (const fn of __listeners.canvas.mousedown || []) fn({ button: 0 });
  say(!mouse.down, 'клик по полю при открытой панели игнорируется');

  closeAdmin();
  say(!state.paused, 'закрытие снимает паузу');
  key('d');
  step(30);
  say(player.x !== x0, 'после закрытия управление вернулось');
  keyUp('d');
}

// ── Ввод: история, Enter, неизвестная команда ─────────────────────────────
{
  openAdmin();
  const input = $('adminInput');
  input.value = 'help';
  key('enter');
  say(admin.log.some(r => r.text.includes('money')), 'help печатает список команд');

  const n = admin.log.length;
  input.value = 'абракадабра';
  key('enter');
  say(admin.log.length > n && admin.log.some(r => r.kind === 'bad'),
      'неизвестная команда отвечает ошибкой, а не молчит');
  say(/Может быть|Список/.test(run('m')), 'к ошибке предлагаются похожие команды');

  key('arrowup');
  say(input.value === 'абракадабра', 'стрелка вверх достаёт прошлую команду');
  key('arrowup');
  say(input.value === 'help', 'и ещё одну');
  key('arrowdown');
  say(input.value === 'абракадабра', 'стрелка вниз возвращает обратно');

  run('clear');
  say(admin.log.length === 0, 'clear очищает консоль');
  say(run('') === '', 'пустая строка ничего не делает');
  closeAdmin();
}

// ── Команды прогресса ─────────────────────────────────────────────────────
{
  run('reset confirm');
  say(progress.money === 0 && progress.owned.length === 2 && progress.squad.length === 0,
      'reset confirm стирает прогресс');
  say(/Напиши/.test(run('reset')), 'без confirm reset не срабатывает');

  run('money 50000');
  say(progress.money === 50000, 'money выдаёт сумму');
  run('money +1500');
  say(progress.money === 51500, 'money +N прибавляет');
  say(/число/.test(run('money сто')), 'нечисло отклоняется');

  run('unlock 9');
  say(progress.completed === 9 && progress.tutorial === 'done', 'unlock открывает операции и закрывает обучение');

  run('give ak');
  say(owns('ak') && progress.equipped.rifle === 'ak', 'give выдаёт и экипирует ствол');
  say(/нет такого ствола/.test(run('give базука')), 'несуществующий ствол отклоняется');
  run('give all');
  say(Object.keys(WEAPONS).every(id => owns(id)), 'give all выдаёт весь арсенал');

  run('upgrade ak 7');
  say(weaponLevel('ak') === 7, 'upgrade ставит уровень прокачки');
  run('upgrade all');
  say(weaponLevel('m4') === UPGRADE.MAX, 'upgrade all качает всё до максимума');

  run('armor heavy');
  say(progress.armorEquipped === 'heavy', 'armor выдаёт и надевает');
  run('armor off');
  say(progress.armorEquipped === null, 'armor off снимает');
  run('armor all');
  say(progress.armorOwned.length === ARMOR_TYPES.length, 'armor all выдаёт всю броню');

  run('tutorial squad');
  say(progress.tutorial === 'squad', 'tutorial переключает стадию');
  say(/стадии/.test(run('tutorial чтото')), 'чужая стадия отклоняется');
  run('tutorial done');

  // Всё сохраняется, а не живёт только в памяти.
  const money0 = progress.money;
  progress.money = 0;
  loadProgress();
  say(progress.money === money0, 'команды пишутся в сохранение');
}

// ── Команды отряда ────────────────────────────────────────────────────────
{
  run('squad clear');
  run('squad add medic 6');
  say(progress.squad.length === 1 && progress.squad[0].cls === 'medic' && progress.squad[0].level === 6,
      'squad add берёт бойца нужного класса и уровня');
  say(/классы/.test(run('squad add повар')), 'неизвестный класс отклоняется');
  run('squad level 1 10');
  say(progress.squad[0].level === 10, 'squad level повышает бойца');
  run('squad max');
  say(progress.squad.length === 4 && squadSlots() === 4 && progress.squad.every(a => a.level === 10),
      'squad max собирает полный отряд десятого уровня');
  say(/уже четверо/.test(run('squad add assault')), 'пятого не берём');
  run('squad clear');
  say(progress.squad.length === 0, 'squad clear распускает отряд');
  say(/add|level|clear/.test(run('squad чтото')), 'подсказка по подкомандам');
}

// ── Команды боя ───────────────────────────────────────────────────────────
{
  run('unlock 9');
  run('squad max');
  run('level 2');
  say(state.running && state.levelIndex === 1, 'level запускает операцию');
  say(allies.length === 4, 'отряд из команды сразу в бою');
  beginLive();

  run('god on');
  const hp0 = player.hp;
  applyDamage(player, 500, 1, bots[0]);
  say(player.hp === hp0 && player.alive, 'god on — урон не проходит');
  run('god off');
  const armor0 = player.armor;
  applyDamage(player, 10, 1, bots[0]);
  say(player.hp < hp0 || player.armor < armor0, 'god off — урон снова проходит');

  run('heal');
  say(player.hp === CFG.PLAYER_HP, 'heal лечит до полного');

  const w = activeWeapon();
  player.ammo[w.id].mag = 0;
  run('ammo');
  say(player.ammo[w.id].mag === w.mag, 'ammo пополняет магазин');

  run('speed 3');
  say(admin.speed === 3, 'speed меняет множитель');
  run('speed');
  say(admin.speed === 1, 'speed без числа возвращает обычную');

  run('noclip on');
  say(admin.noclip, 'noclip включается');
  {
    // Сквозь стену игрок проходит только с noclip.
    let wall = null;
    for (let ty = 1; ty < MAP_H - 1 && !wall; ty++)
      for (let tx = 1; tx < MAP_W - 1 && !wall; tx++)
        if (solid(tx, ty) && walkable(tx - 1, ty)) wall = { at: tc(tx, ty), from: tc(tx - 1, ty) };
    player.x = wall.from.x; player.y = wall.from.y;
    keys['d'] = true;
    step(40);
    keys['d'] = false;
    say(player.x > wall.at.x - 10, 'с noclip игрок проходит сквозь стену');
    run('noclip off');
    player.x = wall.from.x; player.y = wall.from.y;
    keys['d'] = true;
    step(40);
    keys['d'] = false;
    say(!hitsWall(player.x, player.y, player.r), 'без noclip стена снова держит');
  }

  // Курсор наводим на самого игрока: там точно не стена.
  camera.x = player.x; camera.y = player.y; mouse.x = 0; mouse.y = 0;
  const before = bots.filter(b => b.alive).length;
  run('spawn 3');
  say(bots.filter(b => b.alive).length > before, 'spawn ставит врагов под курсором');

  run('kill nearest');
  run('kill bots');
  say(bots.every(b => !b.alive), 'kill bots убирает всех');

  run('round restart');
  say(bots.some(b => b.alive) && state.phase === PHASE.BUY, 'round restart начинает раунд заново');
  beginLive();
  run('round time 12');
  say(Math.round(state.timer) === 12, 'round time ставит таймер');
  run('round lose');
  say(state.phase === PHASE.END, 'round lose заканчивает раунд');

  run('reveal on');
  say(state.debug, 'reveal включает обзор всей карты');
  run('reveal off');

  run('tp');
  say(dist(player.x, player.y, mouseWorld().x, mouseWorld().y) < 1, 'tp переносит под курсор');
}

// ── Настройки из консоли ──────────────────────────────────────────────────
{
  run('set squadSkill strong');
  say(squadStrong(), 'set меняет настройку');
  say(/значения/.test(run('set squadSkill очень')), 'чужое значение отклоняется');
  say(/squadSkill|sharedVision/.test(run('set чтото 1')), 'по неизвестной настройке — подсказка');
  run('set squadSkill medium');

  const out = run('status');
  say(/деньги/.test(out) && /отряд/.test(out) && /флаги/.test(out), 'status печатает сводку');
}

// ── Панель ничего не ломает ───────────────────────────────────────────────
{
  let crash = null;
  try {
    openAdmin();
    for (const line of ADMIN_COMMANDS.map(c => c.name)) submitAdmin(line);
    renderAdmin();
    closeAdmin();
    for (let i = 0; i < 60; i++) { updateWorld(DT); render(); }
  } catch (e) { crash = e; }
  say(!crash, crash ? 'ПАДЕНИЕ: ' + crash.message : 'все команды подряд отрабатывают без падений');
  say(admin.log.length <= 200, 'журнал консоли не растёт бесконечно');
}
