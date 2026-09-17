
const DT = 1/60;
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
// Как настоящий цикл: раунд, мир и наблюдение обучения; после завершения кадров нет.
const step = n => { for (let i = 0; i < n; i++) {
  if (!state.running || state.paused) break;
  updateRound(DT); updateWorld(DT); updateTutorial(); } };
const shown = id => $(id).classList.contains('show');
const click = id => $(id).onclick && $(id).onclick();

// ── Свежий игрок ─────────────────────────────────────────────────────────
say(progress.tutorial === 'level1', 'новый игрок начинает с обучения');
say(owns('usp') && owns('knife') && !owns('mp5'), 'бесплатно только нож и USP, ПП не выдан');
say(progress.equipped.rifle === null && LOADOUT.ct.rifle === null, 'основного ствола нет');

// ── Уровень 1 только с USP ───────────────────────────────────────────────
say(!levelUnlocked(1), 'вторая операция закрыта');
startLevel(0);
say(player.slots.rifle === null && player.active === 'pistol' && activeWeapon().id === 'usp',
    'на первую операцию игрок выходит только с USP');

// ── Кнопка выхода ────────────────────────────────────────────────────────
say(!$('btnExitMatch').hidden, 'в бою видна кнопка «Меню»');
click('btnExitMatch');
say(shown('exitConfirm') && state.paused, 'кнопка спрашивает подтверждение и ставит бой на паузу');
click('btnExitStay');
say(!shown('exitConfirm') && !state.paused && state.running, '«Остаться» возвращает в бой');
click('btnExitMatch');
press('Escape'); release('Escape');
say(!shown('exitConfirm') && !state.paused, 'Esc тоже закрывает подтверждение');

// ── Подсказки идут по действиям ──────────────────────────────────────────
say(/Цель/.test(currentTutorialHint()), `в подготовке: «${currentTutorialHint()}»`);
beginLive(); step(2);
say(/WASD/.test(currentTutorialHint()), 'бой начался — подсказка про движение');
keys['d'] = true; step(90); keys['d'] = false;
say(/ЛКМ/.test(currentTutorialHint()), 'прошёл — подсказка про стрельбу');
player.cooldown = 0; fireWeapon(player, player.ang, 0); step(2);
say(/нажми E/.test(currentTutorialHint()), 'выстрелил — подсказка про заложников');
hostages[0].following = true; step(2);
say(/зелёную зону/.test(currentTutorialHint()), 'увёл заложника — подсказка про эвакуацию');
hostages[0].rescued = true; step(2);
say(currentTutorialHint() === null, 'довёл — подсказки закончились');

// Выход через подтверждение.
click('btnExitMatch'); click('btnExitLeave');
say(shown('menuScreen') && !state.running && $('btnExitMatch').hidden, '«Выйти в меню» останавливает бой и прячет кнопку');
say(progress.tutorial === 'level1', 'брошенная операция обучение не засчитывает');

// ── Первое прохождение: доплата и путь в арсенал ─────────────────────────
progress.money = 0;
startLevel(0); beginLive();
hostages.forEach(h => { h.rescued = false; });
bots.forEach(b => { b.alive = false; });
step(2 + Math.ceil(CFG.END_TIME / DT) + 5);
say(shown('levelDone'), 'первая операция закрыта');
say(progress.tutorial === 'arsenal', 'обучение перешло к арсеналу');
say(progress.money === WEAPONS.mp5.price, `в кошельке ровно на ПП: ${money(progress.money)}`);
say(!$('doneNote').hidden && /Арсенал/.test($('doneNote').textContent), `итоги объясняют: «${$('doneNote').textContent}»`);
say($('btnNextLevel').hidden, 'кнопки «Дальше» нет — вторая операция закрыта');
say($('btnDoneMenu').classList.contains('pulse'), 'кнопка «В меню» подсвечена');
say($('btnExitMatch').hidden, 'кнопка выхода спрятана вне боя');

// ── Меню ведёт в арсенал, вторая операция закрыта ────────────────────────
click('btnDoneMenu');
say($('btnArsenal').classList.contains('pulse') && !$('menuHint').hidden,
    `меню подсвечивает Арсенал: «${$('menuHint').textContent}»`);
say(!levelUnlocked(1), 'вторая операция по-прежнему закрыта');
startLevel(1);
say(!state.running, 'запустить её нельзя');
say(levelUnlocked(0), 'первую можно переиграть');

// ── Арсенал: только ПП ───────────────────────────────────────────────────
click('btnArsenal');
say(shown('arsenalScreen') && !$('arsenalTutorial').hidden, 'в арсенале баннер обучения');
const mp5Card = [...$('arsenalCatalog').children].find(c => c.children && c.children[0] &&
  c.children[0].children && c.children[0].children[0] && c.children[0].children[0].textContent === 'MP5-SD');
say(mp5Card && mp5Card.classList.contains('tut-target') && mp5Card.actionButton.classList.contains('pulse'),
    'карточка ПП и её кнопка подсвечены');
{
  const tab = id => [...$('arsenalTabs').children].find(b => b.dataset.tab === id);
  say(tab('smg').classList.contains('on') && !tab('smg').classList.contains('pulse'),
      'арсенал сам открылся на вкладке ПП');
  tab('rifles').onclick();
  say(!tab('smg').classList.contains('on') && tab('smg').classList.contains('pulse') &&
      [...$('arsenalTabs').children].filter(b => b.classList.contains('pulse')).length === 1,
      'ушёл на другую вкладку — мигает только вкладка ПП');
  const locked = [...$('arsenalCatalog').children].every(c => c.actionButton.disabled);
  say(locked, 'на винтовках покупать нельзя, пока не куплен ПП');
  tab('smg').onclick();
}
const cash = progress.money;
buyWeapon('deagle'); buyArmor('kevlar');
say(!owns('deagle') && progress.armorOwned.length === 0 && progress.money === cash,
    'другие покупки до ПП заблокированы — иначе не хватило бы денег');

// ── Покупка ПП завершает обучение ────────────────────────────────────────
buyWeapon('mp5');
say(owns('mp5') && progress.equipped.rifle === 'mp5', 'ПП куплен и экипирован');
say(progress.tutorial === 'done', 'обучение пройдено');
say(!$('arsenalTutorial').hidden && $('arsenalTutorial').classList.contains('ok'),
    `баннер «готово»: «${$('arsenalTutorial').textContent}»`);
say($('btnArsenalBack').classList.contains('pulse'), 'подсвечен выход в меню');
click('btnArsenalBack');
say(!$('btnArsenal').classList.contains('pulse') && $('menuHint').hidden, 'меню больше не подсвечивает');
say(levelUnlocked(1), 'вторая операция открыта');
startLevel(1);
say(state.running && player.slots.rifle === 'mp5', 'во вторую операцию — с ПП');
returnToMenu();

// ── Повтор первой операции — без подсказок ───────────────────────────────
startLevel(0);
say(currentTutorialHint() === null, 'повтор первой операции без обучения');
returnToMenu();

// ── Сохранение и старые сохранения ───────────────────────────────────────
saveProgress();
progress.tutorial = 'level1';
loadProgress();
say(progress.tutorial === 'done', 'стадия обучения переживает перезагрузку');

localStorage.setItem(PROGRESS_KEY, JSON.stringify({ completed: 1, money: 900, owned: ['knife', 'usp', 'mp5'],
  equipped: { melee: 'knife', pistol: 'usp', rifle: 'mp5' }, armor: 0 }));
progress.tutorial = 'level1'; progress.owned = ['knife', 'usp'];
loadProgress();
say(progress.tutorial === 'done', 'старое сохранение с ПП обучение не запускает');

localStorage.setItem(PROGRESS_KEY, JSON.stringify({ completed: 1, money: 900, owned: ['knife', 'usp'],
  equipped: { melee: 'knife', pistol: 'usp' }, armor: 0 }));
progress.tutorial = 'done'; progress.owned = ['knife', 'usp']; progress.equipped.rifle = null;
loadProgress();
say(progress.tutorial === 'arsenal', 'сохранение после первой операции без ПП ведёт в арсенал');

// ── Пустой основной слот ничего не роняет ────────────────────────────────
progress.equipped.rifle = null; applyLoadout();
let crash = null;
try { renderArsenal(); drawArsenalFigure(); startLevel(0); for (let i = 0; i < 120; i++) render(); }
catch (e) { crash = e; }
say(!crash, crash ? 'ПАДЕНИЕ: ' + crash.message : 'арсенал, превью и бой без основного ствола работают');
