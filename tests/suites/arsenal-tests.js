
const DT = 1/60;
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
// Как в настоящем цикле: после завершения операции кадры больше не идут.
const step = n => { for (let i = 0; i < n; i++) { if (!state.running) break; updateRound(DT); updateWorld(DT); } };
const shown = id => $(id).classList.contains('show');
const click = id => $(id).onclick && $(id).onclick();
// Правила арсенала для опытного игрока; ограничения обучения — в sim-tutorial.
progress.tutorial = 'done';

// ── Гранат и раундовой закупки в игре больше нет ─────────────────────────
for (const gone of ['throwSelectedNade', 'cycleNade', 'throwNade', 'explodeNade',
                    'updateProjectiles', 'drawSmoke', 'buildBuyMenu', 'openBuyMenu', 'buyOpen']) {
  say(typeof globalThis[gone] === 'undefined' && typeof eval(`typeof ${gone}`) === 'string'
      ? eval(`typeof ${gone}`) === 'undefined' : true, `в коде не осталось ${gone}`);
}
say(!('he' in player) && player.nades === undefined, 'у игрока нет гранат');
say(typeof CFG.PAY_FIRST_CLEAR === 'number' && CFG.WIN_REWARD === undefined,
    'экономика раунда заменена выплатами за операцию');

// ── Экран арсенала ───────────────────────────────────────────────────────
say(!$('btnArsenal').disabled, 'кнопка Арсенал активна');
click('btnArsenal');
say(shown('arsenalScreen'), 'кнопка открывает арсенал');
say($('arsenalSlots').children.length === 3, 'показаны три слота: основное, пистолет, броня');

// ── Вкладки ──────────────────────────────────────────────────────────────
{
  const tabs = () => $('arsenalTabs').children;
  const names = () => [...$('arsenalCatalog').children].map(c => c.children[0].children[0].textContent);
  const onTab = () => [...tabs()].filter(b => b.classList.contains('on')).map(b => b.dataset.tab);
  say(tabs().length === 6 && [...tabs()].map(b => b.textContent).join(', ') ===
      'Пистолеты, ПП, Винтовки, Снайперские, Дробовики, Броня',
      `вкладки сверху: ${[...tabs()].map(b => b.textContent).join(', ')}`);
  say(onTab().join() === 'pistols', 'первый раз арсенал открывается на пистолетах');
  say(names().join(', ') === 'Glock-18, P250, USP-S, Five-SeveN, Desert Eagle',
      `на вкладке только пистолеты: ${names().join(', ')}`);
  let seen = 0;
  for (const t of CATALOG) {
    [...tabs()].find(b => b.dataset.tab === t.tab).onclick();
    const want = t.ids ? t.ids.map(id => WEAPONS[id].name) : ARMOR_TYPES.map(a => a.name);
    const ok = onTab().join() === t.tab && names().join('|') === want.join('|');
    seen += names().length;
    say(ok, `вкладка «${t.label}»: ${names().join(', ')}`);
  }
  say(seen === Object.keys(WEAPONS).length - 1 + ARMOR_TYPES.length,
      `по вкладкам разложено всё: ${seen} карточек, нож не продаётся`);
  say([...tabs()].every(b => !b.classList.contains('pulse')), 'после обучения вкладки не мигают');

  // Покупка перерисовывает арсенал, но вкладку не сбрасывает.
  [...tabs()].find(b => b.dataset.tab === 'snipers').onclick();
  const saved = { money: progress.money, owned: [...progress.owned], equipped: { ...progress.equipped } };
  progress.money = 2000; buyWeapon('ssg08');
  say(owns('ssg08') && onTab().join() === 'snipers' && names().includes('SSG 08'),
      'после покупки остаёмся на той же вкладке');
  const card = [...$('arsenalCatalog').children].find(c => c.children[0].children[0].textContent === 'SSG 08');
  say(card.classList.contains('equipped') && card.actionButton.textContent === 'Экипировано',
      'купленная снайперская сразу экипирована');
  progress.money = saved.money; progress.owned = saved.owned; progress.equipped = saved.equipped; applyLoadout();

  click('btnArsenalBack');
  click('btnArsenal');
  say(onTab().join() === 'snipers', 'вернулся в арсенал — открыта та же вкладка');
}
click('btnArsenalBack');
say(shown('menuScreen'), 'из арсенала можно вернуться в меню');

// ── Новые стволы стреляют ────────────────────────────────────────────────
{
  const fresh = ['p250', 'fiveseven', 'mac10', 'ump45', 'p90', 'galil', 'famas', 'aug', 'ssg08', 'scar20', 'mag7', 'xm1014'];
  say(fresh.every(id => WEAPONS[id] && GUN_SHAPES[id]), `добавлено ${fresh.length} стволов с моделями`);
  for (const id of fresh) {
    progress.owned.push(id); equipWeapon(id);
    startLevel(0); beginLive();
    const w = WEAPONS[id];
    player.active = w.slot;
    const target = bots[0];
    player.x = target.x - 90; player.y = target.y; player.ang = 0;
    player.cooldown = 0; player.reloading = 0; player.spread = 0;
    const mag0 = ammoOf(player, id).mag;
    let crash = null;
    try { fireWeapon(player, player.ang); } catch (e) { crash = e; }
    say(!crash && ammoOf(player, id).mag === mag0 - 1 && player.slots[w.slot] === id,
        crash ? `ПАДЕНИЕ ${w.name}: ${crash.message}` : `${w.name} в бою: выстрел, в магазине ${ammoOf(player, id).mag}/${w.mag}`);
  }
  equipWeapon('ak');
}

// ── Стартовый пак куплен сразу ───────────────────────────────────────────
say(STARTER.every(owns), `стартовый пак уже в наличии: ${STARTER.map(id => WEAPONS[id].name).join(', ')}`);
say(!owns('mp5') && !owns('ak') && !owns('awp'), 'основное оружие, включая ПП, надо покупать');

// ── Нельзя купить дороже кошелька ────────────────────────────────────────
progress.money = 100;
buyWeapon('ak');
say(!owns('ak') && progress.money === 100, 'покупка дороже кошелька не проходит');

// ── Покупка списывает, добавляет и экипирует ─────────────────────────────
progress.money = 3000;
buyWeapon('ak');
say(owns('ak'), 'AK куплен');
say(progress.money === 3000 - WEAPONS.ak.price, `списано ${money(WEAPONS.ak.price)}, осталось ${money(progress.money)}`);
say(progress.equipped.rifle === 'ak' && LOADOUT.ct.rifle === 'ak', 'купленное сразу экипировано');

// ── Экипировка переключается между купленным ─────────────────────────────
equipWeapon('mp5');
say(progress.equipped.rifle === 'ak', 'некупленный ПП экипировать нельзя');
progress.money = 1500; buyWeapon('mp5');
equipWeapon('mp5');
say(progress.equipped.rifle === 'mp5' && LOADOUT.ct.rifle === 'mp5', 'купленный ПП можно выбрать вместо AK');
equipWeapon('ak');

// ── Экипированное попадает в бой и не теряется при гибели ────────────────
progress.money = 2000;
buyArmor('kevlar');
say(progress.armorEquipped === 'kevlar' && progress.money === 2000 - 650, 'кевлар куплен и надет');
startLevel(0);
say(player.slots.rifle === 'ak' && player.armor === 100 && player.armorMax === 100,
    'в бой игрок выходит с AK и бронёй');
beginLive();
killEntity(player, bots[0]);
step(2 + Math.ceil(CFG.END_TIME / DT) + 5);
say(player.slots.rifle === 'ak' && player.armor === 100 && owns('ak'),
    'гибель ничего не отняла');

// ── Выплаты ──────────────────────────────────────────────────────────────
{
  progress.completed = 0; progress.money = 0;
  startLevel(0); beginLive();
  killEntity(player, bots[0]);
  step(2);
  say(progress.money === CFG.PAY_ROUND_LOST,
      `за проигранный раунд заплатили сразу: ${money(progress.money)}`);

  step(Math.ceil(CFG.END_TIME / DT) + 5);
  beginLive();
  bots.forEach(b => { b.alive = false; });
  hostages.forEach(h => { h.rescued = false; });
  step(2 + Math.ceil(CFG.END_TIME / DT) + 5);
  const first = progress.money - CFG.PAY_ROUND_LOST;
  say(first === CFG.PAY_FIRST_CLEAR, `первое прохождение: ${money(first)}`);
  say(progress.completed === 1, 'операция отмечена пройденной');

  const before = progress.money;
  startLevel(0); beginLive();
  bots.forEach(b => { b.alive = false; });
  step(2 + Math.ceil(CFG.END_TIME / DT) + 5);
  const replay = progress.money - before;
  say(replay === CFG.PAY_REPLAY, `повторное прохождение платит меньше: ${money(replay)}`);
  say(CFG.PAY_REPLAY < CFG.PAY_FIRST_CLEAR, 'и это заметно меньше первого');
  say(CFG.PAY_FIRST_CLEAR === 1500 && CFG.PAY_REPLAY === 450,
      `за победу платят втрое больше прежнего: ${money(CFG.PAY_FIRST_CLEAR)} и ${money(CFG.PAY_REPLAY)}`);
}

// ── Заложники прибавляют к выплате ───────────────────────────────────────
{
  const before = progress.money;
  startLevel(0); beginLive();
  hostages.forEach(h => { h.rescued = true; });
  bots.forEach(b => { b.alive = false; });
  step(2 + Math.ceil(CFG.END_TIME / DT) + 5);
  const got = progress.money - before;
  say(got === CFG.PAY_REPLAY + hostages.length * CFG.PAY_HOSTAGE,
      `за ${hostages.length} заложников доплатили: всего ${money(got)}`);
}

// ── Сохранение ───────────────────────────────────────────────────────────
{
  const snapshot = { money: progress.money, owned: [...progress.owned], armor: progress.armorEquipped,
                     equipped: { ...progress.equipped } };
  progress.money = 0; progress.owned = ['knife']; progress.armorOwned = []; progress.armorEquipped = null;
  progress.equipped = { melee: 'knife', pistol: 'usp', rifle: 'mp5' };
  loadProgress();
  say(progress.money === snapshot.money && progress.armorEquipped === snapshot.armor,
      'кошелёк и броня прочитаны из хранилища');
  say(snapshot.owned.every(id => owns(id)), 'купленное оружие восстановлено');
  say(progress.equipped.rifle === snapshot.equipped.rifle, 'экипировка восстановлена');
  say(LOADOUT.ct.rifle === progress.equipped.rifle, 'и сразу перенесена в стартовый пак');
}

// ── Испорченное сохранение не ломает игру ────────────────────────────────
{
  localStorage.setItem(PROGRESS_KEY, '{"completed":99,"money":-5,"owned":["нет такого"],"armor":7}');
  loadProgress();
  say(STARTER.every(owns), 'стартовый пак нельзя потерять даже кривым сохранением');
  say(progress.money >= 0 && progress.armorOwned.every(id => armorOf(id)) && progress.completed >= 0 && progress.completed <= 100000,
      'значения зажаты в допустимые границы');
  globalThis.__storeBroken = true;
  let crash = null;
  try { loadProgress(); saveProgress(); buyWeapon('m4'); } catch (e) { crash = e; }
  globalThis.__storeBroken = false;
  say(!crash, crash ? 'ПАДЕНИЕ: ' + crash.message : 'запрещённое хранилище не ломает арсенал');
}

// ── Превью бойца рисуется ────────────────────────────────────────────────
{
  let crash = null;
  try { openArsenal(); for (let i = 0; i < 30; i++) drawArsenalFigure(); } catch (e) { crash = e; }
  say(!crash, crash ? 'ПАДЕНИЕ превью: ' + crash.message : 'фигура спецназовца рисуется без исключений');
  for (const id of Object.keys(WEAPONS).filter(id => WEAPONS[id].slot === 'rifle')) {
    progress.owned.push(id);
    equipWeapon(id);
    let e2 = null;
    try { drawArsenalFigure(); } catch (e) { e2 = e; }
    say(!e2, `превью с ${WEAPONS[id].name} рисуется`);
  }
}
