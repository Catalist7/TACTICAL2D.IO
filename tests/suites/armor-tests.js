
const DT = 1 / 60;
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
progress.tutorial = 'done';
progress.money = 20000;

// ── Каталог брони ────────────────────────────────────────────────────────
say(ARMOR_TYPES.length === 5, `видов брони пять: ${ARMOR_TYPES.map(a => `${a.name} ${a.points}/${Math.round(a.speed * 100)}%`).join(', ')}`);
openArsenal();
[...$('arsenalTabs').children].find(b => b.dataset.tab === 'armor').onclick();
const cards = () => [...$('arsenalCatalog').children];
const cardOf = name => cards().find(c => c.children[0].children[0].textContent === name);
say(cards().length === 5, 'на вкладке «Броня» пять карточек');
{
  const statNames = cards()[4].children[2].children.map(r => r.children[0].textContent).join(', ');
  const vals = cards()[4].children[2].children.map(r => r.children[2].textContent).join(', ');
  say(statNames === 'Защита, Скорость' && vals === '350, 70%', `у сапёрного костюма полоски: ${statNames} — ${vals}`);
}

// ── Покупка, выбор, снятие ───────────────────────────────────────────────
buyArmor('assault');
say(ownsArmor('assault') && progress.armorEquipped === 'assault' && progress.money === 20000 - 1700,
    'штурмовой жилет куплен и сразу надет');
buyArmor('heavy');
say(progress.armorEquipped === 'heavy', 'тяжёлый бронекостюм куплен и надет вместо жилета');
say(cardOf('Тяжёлый бронекостюм').actionButton.textContent === 'Снять' &&
    cardOf('Штурмовой жилет').actionButton.textContent === 'Надеть' &&
    !cardOf('Штурмовой жилет').actionButton.disabled,
    'на надетой кнопка «Снять», на купленной — «Надеть»');
const moneyBefore = progress.money;
cardOf('Штурмовой жилет').actionButton.onclick();
say(progress.armorEquipped === 'assault' && progress.money === moneyBefore, 'купленную можно надеть снова бесплатно');
cardOf('Штурмовой жилет').actionButton.onclick();
say(progress.armorEquipped === null && ownsArmor('assault'), 'броню можно снять — она остаётся купленной');
say($('arsenalSlots').children[2].children[1].textContent === 'нет', 'в слоте брони — «нет»');
buyArmor('heavy');
say(progress.money === moneyBefore, 'второй раз ту же броню не продают');
equipArmor('eod');
say(progress.armorEquipped === null, 'некупленную надеть нельзя');

// ── Перед раундом броня целая, скорость по виду ──────────────────────────
equipArmor('heavy');
startLevel(0);
say(player.armor === 250 && player.armorMax === 250 && player.armorSpeed === 0.8,
    `в бою тяжёлый бронекостюм: ${player.armor} очков, скорость ${player.armorSpeed * 100}%`);

// ── Урон: всё в броню, пока есть очки ────────────────────────────────────
beginLive();
{
  const bot = bots[0];
  player.hp = 100;
  const dmg = WEAPONS.ak.dmg * damageScale(bot);
  let lost = 0, shots = 0;
  while (player.armor >= dmg && shots < 100) { lost += applyDamage(player, dmg, WEAPONS.ak.pierce, bot); shots++; }
  say(player.hp === 100 && lost === 0 && shots === Math.floor(250 / dmg + 1e-9),
      `пока держалась броня, AK врага попал ${shots} раз — здоровье ${player.hp}, от брони осталось ${player.armor.toFixed(1)}`);
  const rest = player.armor;
  const hit = applyDamage(player, dmg, WEAPONS.ak.pierce, bot);
  say(near(hit, dmg - rest) && near(player.hp, 100 - hit) && player.armor === 0,
      `попадание, пробившее остаток брони (${rest.toFixed(1)}), снимает здоровье только сверх него: −${hit.toFixed(1)}`);
  const next = applyDamage(player, dmg, WEAPONS.ak.pierce, bot);
  say(near(next, dmg), `дальше урон идёт в здоровье целиком: −${next.toFixed(1)}`);
  // Пробитие брони у ствола на игрока больше не влияет.
  player.hp = 100; player.armor = 100;
  const a = applyDamage(player, 30, 0.95, bot), b = applyDamage(player, 30, 0.1, bot);
  say(a === 0 && b === 0 && near(player.armor, 40), 'бронебойный и обычный ствол одинаково упираются в броню');
}

// ── Смерть не отнимает броню: следующий раунд — снова полная ─────────────
{
  killEntity(player, bots[0]);
  for (let i = 0; i < 2 + Math.ceil(CFG.END_TIME / DT) + 5; i++) { updateRound(DT); updateWorld(DT); }
  say(player.alive && player.armor === 250 && progress.armorEquipped === 'heavy',
      `после гибели новый раунд в целой броне: ${player.armor}`);
}

// ── Террористы: прежняя частичная броня ──────────────────────────────────
{
  const bot = bots[0];
  bot.alive = true; bot.hp = 100; bot.armor = CFG.ARMOR_MAX; bot.helmet = false;
  const taken = applyDamage(bot, 40, 0.5, player);
  say(near(taken, 20) && bot.hp === 80, `броня террориста, как раньше, пропускает часть урона: −${taken}`);
}

// ── Скорость: бег, тихий шаг, прицеливание ───────────────────────────────
{
  // Горизонтальный коридор без стен, где можно пробежать секунду.
  let lane = null;
  for (let ty = 2; ty < MAP_H - 2 && !lane; ty++)
    for (let tx = 2; tx < MAP_W - 12 && !lane; tx++) {
      let ok = true;
      for (let i = 0; i < 10 && ok; i++)
        for (let j = -1; j <= 1; j++) if (!walkable(tx + i, ty + j)) ok = false;
      if (ok) lane = { x: (tx + 1) * CFG.TILE, y: (ty + 0.5) * CFG.TILE };
    }
  const run = (armorId, mode) => {
    equipArmor(armorId);
    resetPlayerForRound();
    state.phase = PHASE.LIVE; state.paused = false; state.running = true;
    player.alive = true; player.x = lane.x; player.y = lane.y;
    mouse.right = mode === 'aim';
    keys.shift = mode === 'walk';
    keys.d = true;
    const x0 = player.x;
    let ratio = 0;
    for (let i = 0; i < 30; i++) { updatePlayer(DT); ratio = player.speed / playerTopSpeed(); }
    keys.d = false; keys.shift = false; mouse.right = false;
    return { v: (player.x - x0) / (30 * DT), ratio };
  };
  for (const a of ARMOR_TYPES) if (!ownsArmor(a.id)) { progress.money += a.price; buyArmor(a.id); }
  say(ARMOR_TYPES.every(a => ownsArmor(a.id)), 'для замеров куплена вся броня');
  const base = run(null, 'run');
  say(near(base.v, CFG.PLAYER_SPEED, 1), `без брони бег ${base.v.toFixed(0)} px/с`);
  for (const a of ARMOR_TYPES) {
    const r = run(a.id, 'run');
    if (progress.armorEquipped !== a.id) say(false, `${a.name} не надета для замера`);
    say(near(r.v, CFG.PLAYER_SPEED * a.speed, 1) && r.v > CFG.BOT_SPEED,
        `${a.name}: бег ${r.v.toFixed(0)} px/с (${Math.round(100 * r.v / base.v)}%), быстрее бота`);
    say(near(r.ratio, 1, 1e-9), `${a.name}: на полном бегу прицел расшатывается так же, как без брони`);
  }
  const walkEod = run('eod', 'walk'), walkNone = run(null, 'walk');
  say(near(walkEod.v, CFG.PLAYER_WALK * 0.7, 1) && near(walkNone.v, CFG.PLAYER_WALK, 1),
      `тихий шаг тоже медленнее: ${walkEod.v.toFixed(0)} против ${walkNone.v.toFixed(0)} px/с`);
  const aimEod = run('eod', 'aim');
  say(near(aimEod.v, CFG.PLAYER_SPEED * 0.7 * CFG.AIM_SLOW, 1),
      `с прицелом замедления перемножаются: ${aimEod.v.toFixed(0)} px/с`);
}

// ── Сохранение и старые сейвы ────────────────────────────────────────────
{
  equipArmor('assault');
  const owned = [...progress.armorOwned];
  progress.armorOwned = []; progress.armorEquipped = null;
  loadProgress();
  say(owned.every(ownsArmor) && progress.armorEquipped === 'assault', 'купленная и надетая броня читаются из сохранения');

  const load = obj => { localStorage.setItem(PROGRESS_KEY, JSON.stringify(obj));
    progress.armorOwned = []; progress.armorEquipped = null; loadProgress(); };
  load({ completed: 3, money: 10, owned: ['knife', 'usp'], armor: 2, tutorial: 'done' });
  say(ownsArmor('kevlar') && ownsArmor('helmet') && progress.armorEquipped === 'helmet',
      'старое сохранение «кевлар со шлемом» → куплены оба, надет шлем');
  load({ completed: 3, money: 10, owned: ['knife', 'usp'], armor: 1, tutorial: 'done' });
  say(ownsArmor('kevlar') && !ownsArmor('helmet') && progress.armorEquipped === 'kevlar',
      'старое сохранение «кевлар» → кевлар');
  load({ completed: 3, money: 10, owned: ['knife', 'usp'], armor: 0, tutorial: 'done' });
  say(progress.armorOwned.length === 0 && progress.armorEquipped === null, 'старое сохранение без брони → без брони');
  load({ completed: 3, money: 10, armorOwned: ['нет такой', 'eod', 'eod'], armorEquipped: 'heavy', tutorial: 'done' });
  say(progress.armorOwned.join() === 'eod' && progress.armorEquipped === null,
      'мусор в сохранении отброшен, некупленная броня не надевается');
}

// ── Табло ────────────────────────────────────────────────────────────────
{
  equipArmor('eod'); startLevel(0);
  const texts = [];
  ctx.fillText = t => texts.push(String(t));
  drawHealthPanel();
  say(texts.includes('САПЁРНЫЙ КОСТЮМ · 350'), `на табло: ${texts.filter(t => /КОСТЮМ|БРОН/.test(t)).join(', ')}`);
  texts.length = 0; equipArmor(null); startLevel(0); drawHealthPanel();
  say(texts.includes('БЕЗ БРОНИ'), 'без брони на табло «БЕЗ БРОНИ»');
}
