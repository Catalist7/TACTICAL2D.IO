
/* Отряд союзников: строй, бой, приказы, медик, щит, найм и баланс. */
const DT = 1 / 60;
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
const T = CFG.TILE;

Math.random = mulberry32(90210);
progress.tutorial = 'done';
progress.completed = 8;              // все слоты отряда открыты

const step = n => { for (let i = 0; i < n; i++) updateWorld(DT); };
const shown = id => $(id).classList.contains('show');
const clearBots = () => bots.forEach(b => { b.alive = false; });
const clearHostages = () => hostages.forEach(h => { h.alive = false; h.rescued = true; });

/** Отряд заданного состава и старт боя на первой карте. */
function squadOf(list) {
  progress.squad = list.map(([cls, level]) => ({ cls, level }));
  startLevel(0);
  beginLive();
  clearBots();
  clearHostages();
  return allies;
}

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

// ── Таблица баланса ───────────────────────────────────────────────────────
{
  say(ALLY_RANKS.length === 10 && ALLY_RANKS[0] === 'Рядовой' && ALLY_RANKS[9] === 'Генерал',
      `звания с первого по десятый: ${ALLY_RANKS[0]} → ${ALLY_RANKS[9]}`);
  say(allyRank(1) === 'Рядовой' && allyRank(5) === 'Мл. лейтенант' && allyRank(10) === 'Генерал',
      'звание считается по уровню');
  say(ALLY_CLASSES.map(c => c.id).join() === 'assault,medic,shield', 'три класса: штурмовик, медик, щитоносец');
  say(allyClass('assault').max === 2 && allyClass('medic').max === 1 && allyClass('shield').max === 1,
      'лимиты: штурмовиков двое, медик и щитоносец по одному');

  for (const c of ALLY_CLASSES) {
    const grow = a => a.every((v, i) => i === 0 || v >= a[i - 1]);
    say(c.hp.length === 10 && c.dmg.length === 10 && c.guns.length === 10 && c.armor.length === 10,
        `${c.name}: таблица на все десять уровней`);
    say(grow(c.hp) && grow(c.dmg) && grow(c.armor) && grow(c.gunLv),
        `${c.name}: с уровнем ничего не проседает`);
    say(c.guns.every(id => WEAPONS[id]), `${c.name}: все стволы из общего списка оружия`);
  }

  const a1 = allyStats('assault', 1), a10 = allyStats('assault', 10);
  say(a1.hp === 110 && a1.dmg === 0.72 && a1.weapon === 'p250' && a1.armor === 0,
      `первый уровень: ${a1.hp} HP, урон ${a1.dmg}, ${WEAPONS[a1.weapon].name}, без брони`);
  say(a1.hp > CFG.BOT_HP && a1.dmg > CFG.ENEMY_DAMAGE && a1.aim < skillForRound(1).aim &&
      a1.react < skillForRound(1).react,
      `рядовой сильнее рядового врага: ${a1.hp} против ${CFG.BOT_HP} HP, урон ${a1.dmg} против ` +
      `${CFG.ENEMY_DAMAGE}, разброс ${a1.aim} против ${skillForRound(1).aim.toFixed(3)}`);
  say(a10.weaponLv === 7 && a10.armor === 250 && a10.weapon === 'aug',
      `генерал: ${WEAPONS[a10.weapon].name} ур. ${a10.weaponLv}, броня ${a10.armor} — жилет 4-го уровня`);
  say(a10.armor === ARMOR_TYPES[3].points, 'броня десятого уровня совпадает с «Тяжёлым бронекостюмом»');
  say(a10.dmg === 0.90 && a10.dmg < 1, `даже генерал бьёт слабее игрока: ${a10.dmg} против 1`);
  say(a10.react > 0.3 && a10.aim > WEAPONS.aug.spread,
      `реакция и разброс всегда хуже игрока: ${a10.react}с и +${a10.aim} к разбросу ствола`);

  const s10 = allyStats('shield', 10), s9 = allyStats('shield', 9);
  say(s10.armor === 350 && s10.armor === ARMOR_TYPES[4].points, 'щитоносец получает жилет 5-го уровня');
  say(s9.armor === 180, 'и только на десятом: на девятом у него 180');
  say(ALLY_CLASSES.filter(c => c.armor[9] === 350).length === 1, 'больше ни у кого брони 350 нет');
  say(allyStats('shield', 1).shield === 110 && s10.shield === 350,
      `щит растёт со 110 до ${s10.shield}`);
  say(allyStats('medic', 1).heal === 14 && allyStats('medic', 10).heal === 32,
      'лечение медика растёт с 14 до 32');

  const costs = [];
  for (let l = 1; l < 10; l++) costs.push(allyUpgradeCost(l));
  const total = costs.reduce((a, b) => a + b, 0);
  say(costs.join() === '200,550,1000,1500,2050,2650,3300,3950,4700', `цены уровней: ${costs.join(', ')}`);
  say(costs.every((c, i) => i === 0 || c > costs[i - 1]), 'каждый следующий уровень дороже предыдущего');
  const steps = costs.map((c, i) => c - (costs[i - 1] || 0)).slice(1);
  say(steps.some((s, i) => i === 0 || s !== steps[i - 1]), 'рост цены нелинейный, не арифметическая прогрессия');
  say(total === 19900, `полная прокачка бойца — ${money(total)}`);
  say(total > 10 * CFG.PAY_FIRST_CLEAR, 'это дороже десяти операций: цель на всю игру');
  say(allyUpgradeCost(10) === 0, 'с десятого уровня улучшать некуда');
}

// ── Слоты и найм ──────────────────────────────────────────────────────────
{
  progress.squad = [];
  progress.money = 100000;
  const slotsAt = n => { progress.completed = n; return squadSlots(); };
  say(slotsAt(0) === 0 && slotsAt(1) === 1 && slotsAt(2) === 2 && slotsAt(3) === 2 &&
      slotsAt(4) === 3 && slotsAt(5) === 3 && slotsAt(6) === 4 && slotsAt(99) === 4,
      'слоты открываются на операциях 1, 2, 4 и 6, больше четырёх не бывает');

  progress.completed = 1;
  say(squadHirePrice('assault') === 0, 'первый штурмовик бесплатный');
  const before = progress.money;
  say(hireAlly('assault') && progress.money === before, 'взяли даром');
  say(!canHire('assault'), 'второй слот ещё закрыт');
  say(!hireAlly('medic'), 'нанять некуда — отказ');

  progress.completed = 2;
  say(canHire('medic') && squadHirePrice('medic') === 2600, 'второй слот открыт, медик стоит $2 600');
  const m0 = progress.money;
  say(hireAlly('medic') && progress.money === m0 - 2600, 'медик нанят за свою цену');
  progress.completed = 6;
  say(hireAlly('assault') && !canHire('assault'), 'штурмовиков стало двое — лимит класса выбран');
  say(!hireAlly('medic'), 'второго медика не взять');
  say(hireAlly('shield') && progress.squad.length === 4, 'щитоносец занял четвёртый слот');
  say(!hireAlly('assault') && progress.squad.length === 4, 'пятому бойцу места нет');

  progress.money = 0;
  say(!upgradeAlly(0), 'без денег звание не поднять');
  progress.money = 1000;
  say(upgradeAlly(0) && allyLevel(0) === 2 && progress.money === 1000 - allyUpgradeCost(1),
      'улучшение списывает ровно цену уровня');

  // Сохранение и мусор в нём.
  saveProgress();
  progress.squad = [];
  loadProgress();
  say(progress.squad.length === 4 && allyLevel(0) === 2, 'отряд переживает перезагрузку');

  localStorage.setItem(PROGRESS_KEY, JSON.stringify({ completed: 6, squad: [
    { cls: 'assault', level: 3 }, { cls: 'ниндзя', level: 5 }, { cls: 'medic', level: 99 },
    { cls: 'medic', level: 2 }, { cls: 'shield', level: 0 }, { cls: 'assault', level: 1 },
    { cls: 'assault', level: 1 }] }));
  loadProgress();
  say(progress.squad.length === 4, 'из мусорного сохранения остаётся не больше четырёх');
  say(!progress.squad.some(a => a.cls === 'ниндзя'), 'неизвестный класс отброшен');
  say(progress.squad.filter(a => a.cls === 'medic').length === 1, 'лишний медик отброшен');
  say(progress.squad.filter(a => a.cls === 'assault').length === 2, 'штурмовиков не больше двух');
  say(progress.squad.every(a => a.level >= 1 && a.level <= 10), 'уровни зажаты в 1…10');

  progress.completed = 1;
  say(squadRoster().length === 1, 'закрытые слоты отряд не выпускают');
}

// ── Строй: догоняет, не отстаёт, не застревает ────────────────────────────
{
  progress.completed = 8;
  const [a] = squadOf([['assault', 1]]);
  const L = lane();
  say(!!L, 'на карте нашёлся прямой коридор для замеров');

  player.x = L.x0; player.y = L.y;
  a.x = L.x0; a.y = L.y;
  step(30);
  say(dist(a.x, a.y, player.x, player.y) < SQUAD.FOLLOW + 40,
      `на месте боец держится рядом: ${Math.round(dist(a.x, a.y, player.x, player.y))} px`);
  say(SQUAD.FOLLOW <= 100 && SQUAD.FOLLOW_STOP <= 50, `строй плотный: радиус ${SQUAD.FOLLOW} px`);

  // Весь отряд держится вплотную, а не растягивается по карте.
  {
    const four = squadOf([['assault', 1], ['medic', 3], ['shield', 3], ['assault', 5]]);
    player.x = L.x0; player.y = L.y;
    four.forEach(o => { o.x = L.x0; o.y = L.y; });
    step(180);
    const far = Math.max(...four.map(o => dist(o.x, o.y, player.x, player.y)));
    say(far < 150, `вчетвером держатся рядом: дальний в ${Math.round(far)} px`);
  }

  // Игрок уходит на другой конец карты — боец догоняет.
  const one = squadOf([['assault', 1]])[0];
  player.x = SPAWN_CT.x; player.y = SPAWN_CT.y;
  one.x = L.x0 + 11 * T; one.y = L.y;
  const far0 = dist(one.x, one.y, player.x, player.y);
  step(60 * 12);
  const far1 = dist(one.x, one.y, player.x, player.y);
  say(far1 < far0 && far1 < SQUAD.FOLLOW + 60,
      `догнал через всю карту: ${Math.round(far0)} → ${Math.round(far1)} px`);
  say(!hitsWall(one.x, one.y, one.r), 'в стене не застрял');

  // Идём вдоль коридора: боец не отваливается.
  player.x = L.x0; player.y = L.y;
  one.x = L.x0; one.y = L.y;
  step(90);                      // дать отряду встать в строй перед замером
  let worst = 0;
  for (let i = 0; i < 60 * 6; i++) {
    player.x = Math.min(L.x0 + 11 * T, player.x + 120 * DT);
    player.y = L.y;
    updateWorld(DT);
    worst = Math.max(worst, dist(one.x, one.y, player.x, player.y));
  }
  say(worst < SQUAD.FOLLOW_RUN, `на ходу отстаёт не больше чем на ${Math.round(worst)} px`);

  // Проход не перекрывает: игрок проходит там, где стоит боец.
  one.x = player.x + 20; one.y = player.y;
  const px0 = player.x;
  for (let i = 0; i < 40; i++) moveEntity(player, 120 * DT, 0);
  say(player.x > px0 + 60, 'боец не перекрывает игроку дорогу — столкновений между своими нет');
}

// ── Дуэль один на один: рядовой выигрывает с первого уровня ───────────────
{
  /** Боец уровня lv против террориста со стволом gun на дистанции d. */
  function duel(lv, gun, d, seed) {
    Math.random = mulberry32(seed);
    const [a] = squadOf([['assault', lv]]);
    const L = lane();
    player.x = L.x0 - 400; player.y = L.y - 400;     // игрок далеко и не вмешивается
    a.x = L.x0; a.y = L.y; a.ang = 0; a.order = { x: L.x0, y: L.y };
    const b = bots[0];
    Object.assign(b, { alive: true, hp: CFG.BOT_HP, armor: 0, x: L.x0 + d, y: L.y,
                       ang: Math.PI, facing: Math.PI, post: { x: L.x0 + d, y: L.y },
                       mode: 'guard', cooldown: 0, reloading: 0, skill: skillForRound(1) });
    giveWeapon(b, gun);
    b.setMode('guard');
    for (let i = 0; i < 60 * 20; i++) {
      updateWorld(DT);
      if (!b.alive) return true;
      if (a.down) return false;
    }
    return false;
  }

  for (const gun of ['ak', 'mp5', 'nova']) {
    let wins = 0;
    for (let s = 0; s < 8; s++) if (duel(1, gun, 240, 7000 + s * 31)) wins++;
    say(wins >= 7, `рядовой выигрывает дуэль против ${WEAPONS[gun].name}: ${wins} из 8`);
  }
  let close = 0;
  for (let s = 0; s < 6; s++) if (duel(1, 'ak', 140, 8000 + s * 47)) close++;
  say(close >= 5, `и вблизи против AK-47: ${close} из 6`);

  Math.random = mulberry32(90210);
}

// ── Бой: стреляет по врагам, не по своим ──────────────────────────────────
{
  const [a] = squadOf([['assault', 10]]);
  const L = lane();
  player.x = L.x0; player.y = L.y;
  a.x = L.x0 + T; a.y = L.y;

  const foe = bots[0];
  Object.assign(foe, { alive: true, hp: 100, armor: 0, x: L.x0 + 7 * T, y: L.y,
                       post: { x: L.x0 + 7 * T, y: L.y }, mode: 'guard', skill: skillForRound(1) });
  foe.setMode('guard');
  const hp0 = foe.hp;
  step(60 * 6);
  say(foe.hp < hp0, `союзник сам открыл огонь: у врага ${Math.round(foe.hp)} из ${hp0} HP`);

  // По игроку и заложнику — не стреляет.
  const pHp = player.hp;
  const h = hostages[0];
  Object.assign(h, { alive: true, hp: 100, rescued: false, x: L.x0 + 4 * T, y: L.y });
  Object.assign(foe, { alive: true, hp: 1000, x: L.x0 + 7 * T, y: L.y,
                       skill: { ...skillForRound(1), react: 999 } });
  foe.setMode('guard');
  player.x = L.x0 + 3 * T; player.y = L.y;
  step(60 * 5);
  say(player.hp === pHp, 'по игроку на линии огня не стреляет');
  say(h.hp === 100, 'по заложнику на линии огня не стреляет');
  say(!bulletTargets(a).includes(player), 'игрок вообще не цель для пуль союзника');
  say(!bulletTargets(player).includes(a), 'и союзник не цель для пуль игрока');
  h.alive = false; h.rescued = true;
}

// ── Враги видят союзников ─────────────────────────────────────────────────
{
  const [a] = squadOf([['assault', 1]]);
  const L = lane();
  player.x = L.x0 + 11 * T; player.y = L.y + T * 3;
  a.x = L.x0 + 2 * T; a.y = L.y;
  const foe = bots[0];
  Object.assign(foe, { alive: true, hp: 100, armor: 0, x: L.x0 + 5 * T, y: L.y, ang: Math.PI,
                       post: { x: L.x0 + 5 * T, y: L.y }, facing: Math.PI, mode: 'guard',
                       skill: skillForRound(1), cooldown: 0, react: 0 });
  foe.setMode('guard');
  say(bulletTargets(foe).includes(a), 'союзник — законная цель для врага');
  say(foe.pickTarget() === a, 'из игрока и отряда враг берёт того, кого видит');
  const hp0 = a.hp;
  step(60 * 8);
  say(a.hp < hp0 || a.armor < a.armorMax || a.down, `враг ведёт огонь по союзнику: ${Math.round(a.hp)} HP`);
}

// ── Приказы ───────────────────────────────────────────────────────────────
{
  const [a] = squadOf([['assault', 1]]);
  const L = lane();
  player.x = L.x0; player.y = L.y;
  a.x = L.x0; a.y = L.y;
  const spot = { x: L.x0 + 9 * T, y: L.y };

  say(a.mode === 'follow' && !a.order, 'по умолчанию боец в авто');
  selectAlly(0);
  say(a.selected && squadSelected().length === 1, 'клавиша 5 выделяет первого бойца');
  beginSquadOrder();
  say(squadCmd.pending, 'F ждёт клик по карте');

  placeSquadOrder(spot.x, spot.y);
  say(!!a.order && !squadCmd.pending, 'клик поставил точку удержания');
  say(squadCmd.fireLock > 0, 'этим кликом игрок не стреляет');
  step(60 * 12);
  say(dist(a.x, a.y, spot.x, spot.y) < 60, `дошёл до точки: ${Math.round(dist(a.x, a.y, spot.x, spot.y))} px`);

  // Игрок уходит — боец держит точку, а не бежит следом.
  player.x = SPAWN_CT.x; player.y = SPAWN_CT.y;
  step(60 * 6);
  say(dist(a.x, a.y, spot.x, spot.y) < 60, 'держит позицию, даже когда игрок ушёл');

  squadAuto();
  say(!a.order && !a.selected, 'G вернул отряд в авто');
  step(60 * 12);
  say(dist(a.x, a.y, player.x, player.y) < SQUAD.FOLLOW + 60, 'и боец снова в строю');

  // Приказ по стене не проходит.
  selectAllAllies();
  say(a.selected, 'клавиша 9 выделяет весь отряд');
  let wall = null;
  for (let ty = 0; ty < MAP_H && !wall; ty++)
    for (let tx = 0; tx < MAP_W && !wall; tx++) if (solid(tx, ty)) wall = tc(tx, ty);
  say(!placeSquadOrder(wall.x, wall.y) && !a.order, 'точку в стене приказом не сделать');
}

// ── Медик: лечит и поднимает ──────────────────────────────────────────────
{
  const [med, mate] = squadOf([['medic', 4], ['assault', 1]]);
  const L = lane();
  player.x = L.x0; player.y = L.y;
  med.x = L.x0 + 20; med.y = L.y;
  mate.x = L.x0 + 40; mate.y = L.y;

  player.hp = 40;
  med.healCd = 0;
  step(4);
  say(player.hp === 40 + med.stats.heal, `медик подлечил игрока: +${med.stats.heal} HP`);
  const full = player.hp;
  med.healCd = 0;
  mate.hp = 10;
  step(4);
  say(mate.hp > 10, 'лечит и своих');
  say(player.hp === full, 'берёт самого раненого, а не всех сразу');

  player.hp = 50; med.healCd = 0;
  player.x = L.x0 + 8 * T;   // дальше радиуса лечения
  step(4);
  say(player.hp === 50, 'через полкарты не лечит');
  player.x = L.x0;

  // Подъём: на четвёртом уровне нельзя, на пятом можно.
  mate.hp = 1;
  applyDamage(mate, 50, 0, bots[0]);
  say(mate.down && !mate.alive, 'боец под огнём падает раненым, а не гибнет');
  say(!corpses.some(c => c.kind === 'ally'), 'трупа союзника на карте не остаётся');
  med.x = mate.x + 10; med.y = mate.y;
  step(60 * 5);
  say(mate.down, 'медик четвёртого уровня поднять не может');

  med.level = SQUAD.REVIVE_LEVEL;
  med.x = mate.x + 10; med.y = mate.y;
  step(60 * 5);
  say(!mate.down && mate.alive && mate.hp > 0, `медик пятого уровня поднял бойца: ${Math.round(mate.hp)} HP`);

  // Второй раз за раунд — нет.
  applyDamage(mate, 999, 0, bots[0]);
  med.x = mate.x + 10; med.y = mate.y;
  step(60 * 6);
  say(mate.down, 'второго подъёма за раунд не бывает');

  // Новый раунд — все снова в строю.
  startRound(); beginLive(); clearBots(); clearHostages();
  say(allies.every(a => a.alive && !a.down && a.hp === a.hpMax), 'в новом раунде отряд целый');
  say(progress.squad.length === 2, 'и состав не потерян');
}

// ── Щит ───────────────────────────────────────────────────────────────────
{
  const [sh] = squadOf([['shield', 5]]);
  const st = allyStats('shield', 5);
  say(sh.shieldMax === st.shield && sh.shield === st.shield, `щит на пятом уровне: ${sh.shield}`);

  const front = { x: sh.x + 100, y: sh.y, kind: 'bot', team: 't' };
  sh.ang = 0;
  const hp0 = sh.hp, armor0 = sh.armor;
  applyDamage(sh, 40, 0.5, front);
  say(sh.shield === st.shield - 40 && sh.hp === hp0 && sh.armor === armor0,
      `урон спереди целиком ушёл в щит: ${sh.shield} из ${st.shield}`);

  const back = { x: sh.x - 100, y: sh.y, kind: 'bot', team: 't' };
  const shield1 = sh.shield;
  applyDamage(sh, 30, 0.5, back);
  say(sh.shield === shield1, 'удар в спину щит не трогает');
  say(sh.armor < armor0 || sh.hp < hp0, 'он проходит в броню и здоровье');

  sh.shield = 10;
  const armor2 = sh.armor;
  applyDamage(sh, 60, 0.5, front);
  say(sh.shield === 0 && sh.armor < armor2, 'щит кончился — остаток пошёл дальше');

  startRound(); beginLive(); clearBots(); clearHostages();
  say(allies[0].shield === allies[0].shieldMax, 'к новому раунду щит целый');
}

// ── Оружие и урон союзника ────────────────────────────────────────────────
{
  const [a] = squadOf([['assault', 9]]);
  const st = allyStats('assault', 9);
  const w = weaponOf(a);
  say(w.id === 'm4' && w.level === st.weaponLv, `в руках ${w.name} с прокачкой ${w.level}`);
  say(w.dmg > WEAPONS.m4.dmg, `прокачанный ствол бьёт сильнее базового: ${w.dmg} против ${WEAPONS.m4.dmg}`);
  say(damageScale(a) === st.dmg && damageScale(a) < 1, `множитель урона союзника ${damageScale(a)}`);
  say(a.ammo[w.id].mag === w.mag, 'магазин заряжен по прокачанному стволу');

  // Броня союзника гасит урон полностью, как у игрока.
  const foe = { x: a.x + 50, y: a.y, kind: 'bot', team: 't' };
  a.ang = 0; a.armor = a.armorMax;
  const hp0 = a.hp;
  applyDamage(a, 50, 0.5, foe);
  say(a.hp === hp0 && a.armor === a.armorMax - 50, 'броня союзника держит урон целиком, как у игрока');
}

// ── Ликвидации отряда засчитываются и оплачиваются ────────────────────────
{
  const [a] = squadOf([['assault', 5]]);
  progress.money = 0;
  player.kills = 0; player.squadKills = 0;

  // Врага снял боец.
  const foe = bots[0];
  Object.assign(foe, { alive: true, hp: 100, x: a.x + 120, y: a.y });
  killEntity(foe, a);
  say(player.kills === 1, 'ликвидация бойцом засчитана игроку');
  say(player.squadKills === 1, 'и отдельно записана как отрядная');
  say(progress.money === CFG.PAY_KILL, `за неё заплатили: ${money(progress.money)}`);

  // Врага снял игрок — платят столько же.
  const foe2 = bots[1];
  Object.assign(foe2, { alive: true, hp: 100, x: player.x + 120, y: player.y });
  killEntity(foe2, player);
  say(player.kills === 2 && player.squadKills === 1, 'своя ликвидация в отрядные не попадает');
  say(progress.money === CFG.PAY_KILL * 2, 'за свою платят столько же');

  // За заложника и за своих денег нет.
  const before = progress.money;
  const h = hostages[0];
  Object.assign(h, { alive: true, hp: 100, rescued: false });
  killEntity(h, player);
  say(progress.money === before && player.kills === 2, 'за заложника денег и зачёта нет');
  applyDamage(a, 9999, 1, bots[2] || bots[0]);
  say(progress.money === before && player.kills === 2, 'за раненого своего тоже');

  // Деньги сохраняются сразу, не только по итогам операции.
  const money0 = progress.money;
  progress.money = 0;
  loadProgress();
  say(progress.money === money0, 'заработанное в бою попадает в сохранение сразу');

  // За полную зачистку набегает ощутимо, но меньше выплаты за операцию.
  const perRound = CFG.PAY_KILL * ENEMY_POSTS.length;
  say(perRound > 0 && perRound < CFG.PAY_FIRST_CLEAR,
      `зачистка карты даёт ${money(perRound)} — меньше выплаты за операцию ${money(CFG.PAY_FIRST_CLEAR)}`);
}

// ── Отряд не проходит уровень за игрока ───────────────────────────────────
{
  progress.squad = [{ cls: 'assault', level: 10 }, { cls: 'assault', level: 10 },
                    { cls: 'medic', level: 10 }, { cls: 'shield', level: 10 }];
  startLevel(0); beginLive();
  const total = bots.length;
  // Игрок стоит на спавне и не делает ничего: отряд воюет сам.
  for (let i = 0; i < 60 * 120 && bots.some(b => b.alive); i++) updateWorld(DT);
  const left = bots.filter(b => b.alive).length;
  say(left > 0, `за две минуты без игрока отряд не зачистил карту: осталось ${left} из ${total}`);
  say(player.kills === player.squadKills,
      'а те, что есть, все отрядные — игрок не сделал ни одной');
}

// ── Кадр и отрисовка ──────────────────────────────────────────────────────
{
  const squad = squadOf([['assault', 1], ['medic', 5], ['shield', 10], ['assault', 10]]);
  say(squad.length === 4, 'полный отряд из четырёх бойцов');
  const kits = squad.map(a => kitOf(a));
  say(kits.every(k => k && k.cloth && k.head), 'у каждого свой комплект');
  say(new Set(squad.map(a => kitOf(a).cloth)).size === 3, 'классы различаются цветом формы');
  say(kitOf(squad[0]).head !== kitOf(squad[3]).head && !kitOf(squad[0]).rig && !!kitOf(squad[3]).rig,
      'рядовой и генерал одеты по-разному: каска и разгрузка приходят с уровнем');

  let crash = null;
  try {
    squad[0].selected = true;
    squad[1].order = { x: player.x + 80, y: player.y };
    applyDamage(squad[3], 9999, 0, bots[0]);
    for (let i = 0; i < 90; i++) { updateWorld(DT); render(); }
  } catch (e) { crash = e; }
  say(!crash, crash ? 'ПАДЕНИЕ: ' + crash.message : 'кадр с выделением, приказом и раненым рисуется');

  // Миникарта показывает отряд: по кружку на бойца плюс точка приказа.
  {
    const rec = [];
    const realArc = ctx.arc;
    ctx.arc = function (...args) { rec.push(ctx.fillStyle); return realArc.apply(ctx, args); };
    drawMinimap();
    ctx.arc = realArc;
    const accents = ALLY_CLASSES.map(c => c.accent);
    say(accents.some(c => rec.includes(c)), 'на миникарте видно бойцов отряда');
    say(rec.includes('#ff5566'), 'и раненого отдельным цветом');
  }

  const box = squadPanelRect();
  say(!!box && box.x >= 0 && box.y > 0, 'панель отряда помещается на экране');
  render();
  // Клик по строке панели выделяет бойца, а не стреляет.
  squad.forEach(a => { a.selected = false; });
  const row = squadHitAreas[1];
  say(!!row, 'строки панели кликабельны');
  say(squadPanelClick(row.x + 5, row.y + 5), 'клик по панели перехвачен');
  say(squad[1].selected, 'и выделил второго бойца');
  say(!squadPanelClick(view.w - 5, view.h - 5), 'клик мимо панели панель не трогает');
}

// ── Экран «Отряд» ─────────────────────────────────────────────────────────
{
  returnToMenu();
  progress.completed = 2;
  progress.money = 12000;
  progress.squad = [{ cls: 'assault', level: 4 }];
  openSquad();
  say(shown('squadScreen'), 'экран отряда открывается из меню');
  say(/Слотов 1 из 2/.test($('squadSlotsNote').textContent) && /операции 4/.test($('squadSlotsNote').textContent),
      `заголовок считает слоты: «${$('squadSlotsNote').textContent}»`);

  const cards = [...$('squadList').children];
  const named = id => cards.find(c => c.dataset.name === id);
  const textOf = c => c.children.map(x => x.children && x.children.length
    ? x.children.map(y => y.textContent).join(' ') : x.textContent).join(' | ');
  say(cards.length === 4, 'карточка бойца и три карточки найма на свободный слот');

  const mine = named('ally0');
  say(!!mine && /Прапорщик/.test(textOf(mine)) && /ур\. 4\/10/.test(textOf(mine)),
      `у бойца звание и уровень: «${textOf(mine).split('|')[0].trim()}»`);
  say(/MP5-SD ур\. 3/.test(textOf(mine)) && /броня 100/.test(textOf(mine)),
      'в карточке видно оружие и броню этого уровня');
  say(mine.upgradeButton.textContent === `Улучшить до 5 — ${money(allyUpgradeCost(4))}`,
      `кнопка улучшения с ценой: «${mine.upgradeButton.textContent}»`);
  say(!mine.upgradeButton.disabled, 'денег хватает — кнопка открыта');

  const hireMedic = named('hire-medic');
  say(!!hireMedic && /\$2 600/.test(textOf(hireMedic)) && hireMedic.actionButton.textContent === 'Нанять',
      'медика можно нанять за свою цену');
  say(allyClass('medic').price < allyClass('assault').price * 1.1 &&
      allyClass('shield').price < allyClass('assault').price * 1.3,
      `найм не дороже штурмовика вдвое: медик ${money(allyClass('medic').price)}, ` +
      `щитоносец ${money(allyClass('shield').price)}`);
  say(named('hire-assault').actionButton.disabled &&
      /Лимит/.test(named('hire-assault').actionButton.textContent) === false ||
      named('hire-assault').actionButton.textContent === 'Нанять',
      'второй штурмовик доступен, пока лимит класса не выбран');

  hireMedic.actionButton.onclick();
  say(progress.squad.length === 2, 'найм с экрана работает');
  say([...$('squadList').children].length === 2, 'слоты кончились — карточек найма больше нет');

  const lvl0 = allyLevel(0);
  $('squadList').children[0].upgradeButton.onclick();
  say(allyLevel(0) === lvl0 + 1, 'улучшение с экрана поднимает уровень');

  progress.money = 0;
  renderSquad();
  say($('squadList').children[0].upgradeButton.disabled, 'без денег кнопка улучшения закрыта');

  progress.squad = [{ cls: 'assault', level: 10 }];
  progress.money = 99999;
  renderSquad();
  say($('squadList').children[0].upgradeButton.disabled &&
      /Максимальное звание/.test($('squadList').children[0].upgradeButton.textContent),
      'на десятом уровне улучшать некуда');

  progress.completed = 0;
  progress.squad = [];
  renderSquad();
  say(/Слотов 0 из 0/.test($('squadSlotsNote').textContent), 'до первой операции слотов нет');
  returnToMenu();
  say($('btnSquad') && !$('btnSquad').disabled, 'кнопка «Отряд» в меню доступна');
}

// ── Пустой отряд ничего не ломает ─────────────────────────────────────────
{
  progress.squad = [];
  startLevel(0); beginLive();
  say(allies.length === 0, 'без найма отряда нет');
  say(squadPanelRect() === null, 'панели отряда тоже нет');
  let crash = null;
  try {
    selectAllAllies(); beginSquadOrder(); squadAuto(); selectAlly(0);
    for (let i = 0; i < 60; i++) { updateWorld(DT); render(); }
  } catch (e) { crash = e; }
  say(!crash, crash ? 'ПАДЕНИЕ: ' + crash.message : 'игра без отряда работает как раньше');
}
