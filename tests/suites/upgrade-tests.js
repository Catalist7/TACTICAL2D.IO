
const DT = 1 / 60;
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
progress.tutorial = 'done';
progress.completed = 12;
Math.random = mulberry32(99);

// ── Время раунда ─────────────────────────────────────────────────────────
startLevel(0);
say(CFG.ROUND_TIME === 210, `раунд длиннее на минуту: ${fmtTime(CFG.ROUND_TIME)} (было 2:30)`);
beginLive();
say(state.timer === 210, 'бой начинается с 3:30 на таймере');

// ── Уровни прокачки: сами характеристики ─────────────────────────────────
{
  const baseSnapshot = JSON.stringify(WEAPONS, (k, v) => (k === 'pen' ? undefined : v));
  const ak = WEAPONS.ak, ak10 = upgradedWeapon('ak', 10);
  say(upgradedWeapon('ak', 1) === ak, 'первый уровень — это базовый ствол без изменений');
  say(ak10.dmg === Math.round(ak.dmg * 1.35) && near(ak10.rpm, ak.rpm * 1.15) &&
      near(ak10.spread, ak.spread * 0.7) && near(ak10.recoil, ak.recoil * 0.7) &&
      ak10.mag === Math.round(ak.mag * 1.3) && near(ak10.reload, ak.reload * 0.75) &&
      near(ak10.pierce, Math.min(0.98, ak.pierce + 0.15)),
      `AK ур. 10: урон ${ak.dmg}→${ak10.dmg}, темп ${ak.rpm}→${ak10.rpm.toFixed(0)}, магазин ${ak.mag}→${ak10.mag}, ` +
      `перезарядка ${ak.reload}→${ak10.reload.toFixed(2)} с, бронебойность ${ak.pierce}→${ak10.pierce.toFixed(2)}`);
  say(ak10.pen === ak.pen, 'пробитие стен и ящиков прокачка не меняет');
  say(ak10.id === 'ak' && ak10.name === ak.name, 'прокачанный ствол — тот же ствол');

  let monotonic = true;
  for (const id of Object.keys(WEAPONS)) {
    if (WEAPONS[id].slot === 'melee') continue;
    for (let lv = 2; lv <= 10; lv++) {
      const a = upgradedWeapon(id, lv - 1), b = upgradedWeapon(id, lv);
      if (b.dmg < a.dmg || b.rpm <= a.rpm || b.spread >= a.spread || b.mag < a.mag ||
          b.reload >= a.reload || b.pierce < a.pierce || b.pierce > 0.98) monotonic = false;
    }
  }
  say(monotonic, 'у всех 20 стволов каждый уровень не хуже предыдущего, бронебойность не выше 0.98');
  say(upgradedWeapon('ak', 15) === upgradedWeapon('ak', 10), 'выше десятого уровня не растёт');
  say(upgradedWeapon('knife', 10) === WEAPONS.knife, 'нож не прокачивается');
  say(JSON.stringify(WEAPONS, (k, v) => (k === 'pen' ? undefined : v)) === baseSnapshot,
      'базовые стволы после расчёта всех уровней не изменились');
}

// ── Цена ─────────────────────────────────────────────────────────────────
{
  const full = id => { let sum = 0; for (let lv = 1; lv < 10; lv++) sum += Math.round(WEAPONS[id].price * 0.1 * lv / 10) * 10; return sum; };
  say(full('ak') === 12150 && full('usp') === 2250, `полная прокачка: AK ${money(full('ak'))}, USP ${money(full('usp'))}`);
  say(Object.keys(WEAPONS).filter(id => WEAPONS[id].slot !== 'melee')
        .every(id => Math.abs(full(id) - 4.5 * WEAPONS[id].price) <= 50),
      'у каждого ствола полная прокачка стоит около 4.5 его цены');
}

// ── Арсенал: кнопка «Улучшить» ───────────────────────────────────────────
const tabBtn = tab => [...$('arsenalTabs').children].find(b => b.dataset.tab === tab);
const cardOf = name => [...$('arsenalCatalog').children].find(c => c.children[0].children[0].textContent === name);
{
  progress.money = 100000;
  if (!owns('ak')) buyWeapon('ak');
  openArsenal(); tabBtn('rifles').onclick();
  let card = cardOf('AK-47');
  say(card.children[0].children[1].textContent === 'ур. 1/10', 'у купленного AK на карточке «ур. 1/10»');
  say(card.upgradeButton && card.upgradeButton.textContent === 'Улучшить до 2 — $270' && !card.upgradeButton.disabled,
      `кнопка: «${card.upgradeButton && card.upgradeButton.textContent}»`);
  say(!cardOf('M4A1').upgradeButton, 'некупленный ствол прокачать нельзя — кнопки нет');

  const m0 = progress.money;
  card.upgradeButton.onclick();
  card = cardOf('AK-47');
  say(weaponLevel('ak') === 2 && progress.money === m0 - 270, 'улучшили: уровень 2, списано $270');
  say(card.children[0].children[1].textContent === 'ур. 2/10' && card.upgradeButton.textContent === 'Улучшить до 3 — $540',
      'карточка обновилась: «ур. 2/10», следующий уровень $540');
  say(card.children[2].children[0].children[2].textContent === String(upgradedWeapon('ak', 2).dmg),
      `полоска урона показывает прокачанный: ${card.children[2].children[0].children[2].textContent}`);

  // На любом уровне характеристики на карточке — короткие числа, без хвостов дробей.
  {
    let clean = true, sample = '';
    for (const id of ['ak', 'm4', 'p90', 'nova', 'awp']) {
      if (!owns(id)) progress.owned.push(id);
      for (let lv = 1; lv <= 10; lv++) {
        for (const [, , value] of weaponBars(upgradedWeapon(id, lv)))
          if (!/^\d+(×\d+)?$|^\d+\.\d\/\d\.\d$/.test(value)) { clean = false; sample = `${id} ур.${lv}: ${value}`; }
      }
    }
    say(clean, clean ? 'характеристики на карточках без длинных дробей на всех уровнях' : `длинная дробь: ${sample}`);
  }
  for (let i = 0; i < 20; i++) upgradeWeapon('ak');
  card = cardOf('AK-47');
  say(weaponLevel('ak') === 10 && card.upgradeButton.disabled && card.upgradeButton.textContent === 'Максимальный уровень',
      'выше десятого не улучшить: «Максимальный уровень»');
  say(progress.money === m0 - 12150, `на весь путь до 10 ушло ${money(m0 - progress.money)}`);

  progress.money = 10;
  if (!owns('usp')) progress.owned.push('usp');
  const lv = weaponLevel('usp');
  upgradeWeapon('usp');
  tabBtn('pistols').onclick();
  say(weaponLevel('usp') === lv && cardOf('USP-S').upgradeButton.disabled, 'без денег улучшение не проходит, кнопка неактивна');

  progress.money = 100000; progress.tutorial = 'arsenal';
  upgradeWeapon('usp');
  say(weaponLevel('usp') === lv, 'во время обучения прокачка закрыта');
  progress.tutorial = 'done';
}

// ── В бою: прокачка только у игрока ──────────────────────────────────────
{
  equipWeapon('ak');
  startLevel(0); beginLive();
  const ak10 = upgradedWeapon('ak', 10);
  say(player.slots.rifle === 'ak' && player.active === 'rifle', 'в бой вышли с прокачанным AK');
  say(ammoOf(player, 'ak').mag === ak10.mag && ammoOf(player, 'ak').reserve === ak10.reserve,
      `магазин ${ammoOf(player, 'ak').mag}, запас ${ammoOf(player, 'ak').reserve}`);
  say(activeWeapon() === ak10, 'стрельба, прицел и перезарядка берут характеристики уровня 10');

  bots.forEach(b => { b.alive = false; }); hostages.forEach(h => { h.alive = false; });
  const bot = bots[0]; bot.alive = true; bot.hp = 1000; bot.armor = 0;
  let lane = null;
  for (let ty = 2; ty < MAP_H - 2 && !lane; ty++)
    for (let tx = 2; tx < MAP_W - 6 && !lane; tx++) {
      let ok = true;
      for (let i = 0; i < 4; i++) if (!walkable(tx + i, ty)) ok = false;
      if (ok) lane = { x: (tx + .5) * CFG.TILE, y: (ty + .5) * CFG.TILE };
    }
  player.x = lane.x; player.y = lane.y; bot.x = lane.x + 2 * CFG.TILE; bot.y = lane.y;
  hitscan(player.x, player.y, 0, activeWeapon(), player);
  const dealt = 1000 - bot.hp;
  const falloff = 1 - 0.35 * ((2 * CFG.TILE - bot.r) / ak10.range);
  say(Math.abs(dealt - ak10.dmg * falloff) < 0.6, `попадание игрока: ${dealt.toFixed(1)} урона (база дала бы ${(WEAPONS.ak.dmg * falloff).toFixed(1)})`);

  player.cooldown = 0; player.reloading = 0;
  fireWeapon(player, 0);
  say(near(player.cooldown, 60 / ak10.rpm), `пауза между выстрелами ${player.cooldown.toFixed(3)} с вместо ${(60 / WEAPONS.ak.rpm).toFixed(3)}`);
  player.cooldown = 0; ammoOf(player, 'ak').mag = 0;
  startReload(player);
  say(near(player.reloading, ak10.reload), `перезарядка ${player.reloading.toFixed(2)} с вместо ${WEAPONS.ak.reload}`);
  for (let i = 0; i < Math.ceil(ak10.reload / DT) + 2; i++) updatePlayer(DT);
  say(ammoOf(player, 'ak').mag === ak10.mag, `после перезарядки в магазине ${ammoOf(player, 'ak').mag}`);

  bot.weapon = 'ak'; giveWeapon(bot, 'ak');
  say(weaponOf(bot) === WEAPONS.ak && ammoOf(bot, 'ak').mag === WEAPONS.ak.mag,
      'у террориста с тем же AK характеристики базовые');
}

// ── Панель оружия ────────────────────────────────────────────────────────
{
  const texts = [];
  const real = ctx.fillText;
  ctx.fillText = t => texts.push(String(t));
  drawWeaponPanel();
  ctx.fillText = real;
  say(texts.includes('AK-47 · ур. 10'), `на панели оружия: ${texts.find(t => t.startsWith('AK-47'))}`);
}

// ── Сохранение ───────────────────────────────────────────────────────────
{
  const saved = { ...progress.upgrades };
  progress.upgrades = {};
  loadProgress();
  say(weaponLevel('ak') === 10, 'уровни прокачки читаются из сохранения');

  localStorage.setItem(PROGRESS_KEY, JSON.stringify({
    completed: 12, money: 5, owned: ['knife', 'usp', 'ak'], tutorial: 'done',
    upgrades: { ak: 99, usp: '5', awp: 7, 'нет такого': 4, glock: 3 },
  }));
  progress.upgrades = {}; loadProgress();
  say(weaponLevel('ak') === 10 && weaponLevel('usp') === 1 && weaponLevel('awp') === 1 && weaponLevel('glock') === 1,
      'мусор отброшен: уровень зажат до 10, строка и некупленные стволы не считаются');
  progress.upgrades = saved;
}

// ── Броня террористов с 11-й операции ────────────────────────────────────
{
  startLevel(9);
  say(state.levelIndex === 9 && bots.length > 0 && bots.every(b => b.armor === 0),
      'на 10-й операции в первом раунде террористы без брони');
  startLevel(10);
  say(state.levelIndex === 10 && bots.length > 0 && bots.every(b => b.armor === CFG.ARMOR_MAX),
      `с 11-й операции все ${bots.length} террористов в бронежилетах с первого раунда`);
  say(/бронежилетах/.test(levelAt(10).brief) && !/бронежилетах/.test(levelAt(9).brief),
      `в описании 11-й операции предупреждение: «${levelAt(10).brief}»`);
  startLevel(0);
  say(bots.every(b => b.armor === 0), 'на первых операциях броню, как и раньше, дают только с 3-го раунда');
}
