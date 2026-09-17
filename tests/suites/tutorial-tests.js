
const DT = 1/60;
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
// Как настоящий цикл: раунд, мир и наблюдение обучения; после завершения кадров нет.
const step = n => { for (let i = 0; i < n; i++) {
  if (!state.running || state.paused) break;
  updateRound(DT); updateWorld(DT); updateTutorial(); } };
const shown = id => $(id).classList.contains('show');
const click = id => $(id).onclick && $(id).onclick();
// Куда сейчас показывает стрелка обучения.
const arrowAt = () => { updateTutorialArrow(); return $('tutArrow').hidden ? null : $('tutArrow').target; };
const tabBtn = id => [...$('arsenalTabs').children].find(b => b.dataset.tab === id);
const cardNamed = name => [...$('arsenalCatalog').children].find(c => c.dataset.name === name);

// ── Свежий игрок ─────────────────────────────────────────────────────────
say(progress.tutorial === 'level1', 'новый игрок начинает с обучения');
say(owns('usp') && owns('knife') && !owns('mac10') && !owns('mp5'), 'бесплатно только нож и USP, ПП не выдан');
say(TUTORIAL_WEAPON === 'mac10' && TUTORIAL_ARMOR === 'kevlar', 'обучение просит MAC-10 и кевлар');
say(WEAPONS.mac10.price === Math.min(...CATALOG.find(t => t.tab === 'smg').ids.map(id => WEAPONS[id].price)) &&
    armorOf('kevlar').price === Math.min(...ARMOR_TYPES.map(a => a.price)),
    `это самый дешёвый ПП и самый дешёвый бронежилет: ${money(WEAPONS.mac10.price)} + ${money(armorOf('kevlar').price)}`);

// ── Стрелка ведёт с самого начала ────────────────────────────────────────
showScreen('menuScreen');
say(arrowAt() === $('btnPlay'), 'в меню стрелка показывает на «Играть»');
click('btnPlay');
say(arrowAt() === $('levelList').children[0], 'на экране операций — на первую операцию');
showScreen('menuScreen');
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
say(arrowAt() === null, 'в бою стрелки нет');
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
say(progress.money === tutorialCost() && tutorialCost() === 1900,
    `в кошельке ровно на ПП, бронежилет и первое звание бойца: ${money(progress.money)}`);
say(!$('doneNote').hidden && /Арсенал/.test($('doneNote').textContent) && /MAC-10/.test($('doneNote').textContent) &&
    /Кевлар/.test($('doneNote').textContent), `итоги объясняют: «${$('doneNote').textContent}»`);
say(arrowAt() === $('btnDoneMenu'), 'стрелка показывает на «В меню»');
say(!/\+\$0\b/.test($('doneNote').textContent), 'итоги не хвастаются доплатой в $0');
say($('btnNextLevel').hidden, 'кнопки «Дальше» нет — вторая операция закрыта');
say($('btnDoneMenu').classList.contains('pulse'), 'кнопка «В меню» подсвечена');
say($('btnExitMatch').hidden, 'кнопка выхода спрятана вне боя');

// ── Меню ведёт в арсенал, вторая операция закрыта ────────────────────────
click('btnDoneMenu');
say($('btnArsenal').classList.contains('pulse') && !$('menuHint').hidden && /MAC-10/.test($('menuHint').textContent),
    `меню подсвечивает Арсенал: «${$('menuHint').textContent}»`);
say(arrowAt() === $('btnArsenal'), 'стрелка показывает на «Арсенал»');
say(!levelUnlocked(1), 'вторая операция по-прежнему закрыта');
startLevel(1);
say(!state.running, 'запустить её нельзя');
say(levelUnlocked(0), 'первую можно переиграть');

// ── Арсенал: MAC-10, потом бронежилет ────────────────────────────────────
showScreen('menuScreen');
click('btnArsenal');
say(shown('arsenalScreen') && !$('arsenalTutorial').hidden && /MAC-10/.test($('arsenalTutorial').textContent),
    `в арсенале баннер обучения: «${$('arsenalTutorial').textContent}»`);
say(tabBtn('smg').classList.contains('on'), 'арсенал сам открылся на вкладке ПП');
{
  const mac = cardNamed('MAC-10');
  say(mac && mac.classList.contains('tut-target') && mac.actionButton.classList.contains('pulse'),
      'карточка MAC-10 и её кнопка подсвечены');
  say(arrowAt() === mac.actionButton, 'стрелка показывает на «Купить» у MAC-10');
  // У заглушки все элементы в (0, 0) — задаём кнопке настоящее место на экране.
  mac.actionButton.getBoundingClientRect = () => ({ left: 400, top: 300, width: 220, height: 34 });
  arrowAt();
  say(!$('tutArrow').classList.contains('down') && $('tutArrow').style.left === '348px' && $('tutArrow').style.top === '302px',
      `у кнопки стрелка слева и по центру по высоте: ${$('tutArrow').style.left}, ${$('tutArrow').style.top}`);
  tabBtn('rifles').onclick();
  say(tabBtn('smg').classList.contains('pulse') && arrowAt() === tabBtn('smg'),
      'ушёл на винтовки — мигает вкладка ПП и стрелка показывает на неё');
  tabBtn('smg').getBoundingClientRect = () => ({ left: 400, top: 120, width: 60, height: 34 });
  arrowAt();
  say($('tutArrow').classList.contains('down') && $('tutArrow').style.left === '408px' && $('tutArrow').style.top === '82px',
      `на вкладку стрелка смотрит сверху, чтобы не закрыть соседнюю: ${$('tutArrow').style.left}, ${$('tutArrow').style.top}`);
  say([...$('arsenalCatalog').children].every(c => c.actionButton.disabled), 'на винтовках покупать нельзя');
  tabBtn('smg').onclick();
}
{
  const cash = progress.money;
  buyWeapon('mp5'); buyWeapon('deagle'); buyArmor('heavy');
  progress.owned.push('usp'); upgradeWeapon('usp');
  say(!owns('mp5') && !owns('deagle') && !progress.armorOwned.includes('heavy') && weaponLevel('usp') === 1 &&
      progress.money === cash, 'MP5, другие стволы, другая броня и прокачка во время обучения закрыты');
}

buyWeapon('mac10');
say(owns('mac10') && progress.equipped.rifle === 'mac10', 'MAC-10 куплен и экипирован');
say(progress.tutorial === 'arsenal' && !levelUnlocked(1), 'одного ствола мало — обучение не пройдено, вторая операция закрыта');
say(/Броня/.test($('arsenalTutorial').textContent), `баннер ведёт дальше: «${$('arsenalTutorial').textContent}»`);
say(tabBtn('armor').classList.contains('pulse') && arrowAt() === tabBtn('armor'), 'мигает вкладка «Броня», стрелка на ней');

tabBtn('armor').onclick();
{
  const kev = cardNamed('Кевлар');
  say(kev.classList.contains('tut-target') && arrowAt() === kev.actionButton, 'стрелка показывает на «Купить» у кевлара');
  say([...$('arsenalCatalog').children].filter(c => c !== kev).every(c => c.actionButton.disabled),
      'другие бронежилеты купить нельзя');
}

// ── Бронежилет завершает обучение ────────────────────────────────────────
buyArmor('kevlar');
say(progress.armorEquipped === 'kevlar' && progress.tutorial === 'squad',
    'кевлар куплен и надет, обучение перешло к отряду');
say(progress.money === allyUpgradeCost(1), 'осталось ровно на первое улучшение бойца');
say(!$('arsenalTutorial').hidden && $('arsenalTutorial').classList.contains('ok'),
    `баннер «готово»: «${$('arsenalTutorial').textContent}»`);
say($('btnArsenalBack').classList.contains('pulse') && arrowAt() === $('btnArsenalBack'), 'стрелка показывает на «В меню»');
click('btnArsenalBack');

// ── Отряд: бесплатный боец и первое звание ───────────────────────────────
say(!$('btnArsenal').classList.contains('pulse') && $('btnSquad').classList.contains('pulse'),
    'меню ведёт дальше — в «Отряд»');
say(!$('menuHint').hidden && /Отряд/.test($('menuHint').textContent),
    `подсказка про отряд: «${$('menuHint').textContent}»`);
say(arrowAt() === $('btnSquad'), 'стрелка показывает на «Отряд»');
say(!levelUnlocked(1), 'вторая операция закрыта, пока отряд не собран');
click('btnSquad');
say(shown('squadScreen') && !$('squadTutorial').hidden, 'экран отряда с баннером обучения');
{
  const hire = [...$('squadList').children].find(c => c.dataset.name === 'hire-assault');
  say(!!hire && hire.classList.contains('tut-target') && arrowAt() === hire.actionButton,
      'стрелка показывает на бесплатного штурмовика');
  hire.actionButton.onclick();
}
say(progress.squad.length === 1 && progress.squad[0].cls === 'assault' && progress.squad[0].level === 1,
    'штурмовик 1-го уровня в отряде');
say(progress.money === allyUpgradeCost(1), 'первый боец достался даром');
say(progress.tutorial === 'squad', 'найма мало — обучение ещё идёт');
{
  const card = $('squadList').children[0];
  say(arrowAt() === card.upgradeButton, 'стрелка показывает на «Улучшить»');
  card.upgradeButton.onclick();
}
say(progress.squad[0].level === 2 && progress.tutorial === 'done', 'боец повышен, обучение пройдено');
say(progress.money === 0, 'денег хватило ровно на всё обучение');
say($('btnSquadBack').classList.contains('pulse') && arrowAt() === $('btnSquadBack'), 'стрелка ведёт назад в меню');
click('btnSquadBack');
say($('menuHint').hidden, 'подсказок в меню больше нет');
say(arrowAt() === $('btnPlay'), 'стрелка ведёт в «Играть»');
click('btnPlay');
say(levelUnlocked(1) && arrowAt() === $('levelList').children[1], 'вторая операция открыта, стрелка на ней');
startLevel(1);
say(state.running && player.slots.rifle === 'mac10' && player.armor === 100, 'во вторую операцию — с MAC-10 и в кевларе');
returnToMenu();
say(arrowAt() === null, 'после старта второй операции стрелок больше нет');

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

localStorage.setItem(PROGRESS_KEY, JSON.stringify({ completed: 1, money: 650, owned: ['knife', 'usp', 'mac10'],
  tutorial: 'arsenal', armorOwned: [] }));
progress.owned = ['knife', 'usp']; progress.armorOwned = [];
loadProgress();
say(progress.tutorial === 'arsenal', 'сохранение посреди обучения с одним MAC-10 — обучение продолжается');

localStorage.setItem(PROGRESS_KEY, JSON.stringify({ completed: 1, money: 0, owned: ['knife', 'usp', 'mac10'],
  tutorial: 'arsenal', armorOwned: ['kevlar'], armorEquipped: 'kevlar' }));
loadProgress();
say(progress.tutorial === 'squad', 'сохранение, где куплены оба, ведёт к отряду');
say(tutorialLocksPurchase('ak') && tutorialLocksPurchase('upgrade'),
    'на шаге отряда арсенал на паузе: ни покупок, ни прокачки');

localStorage.setItem(PROGRESS_KEY, JSON.stringify({ completed: 1, money: 0, owned: ['knife', 'usp', 'mac10'],
  tutorial: 'squad', armorOwned: ['kevlar'], armorEquipped: 'kevlar', squad: [{ cls: 'assault', level: 2 }] }));
loadProgress();
say(progress.tutorial === 'squad' && progress.squad.length === 1,
    'стадия отряда переживает перезагрузку вместе с отрядом');

// ── Пустой основной слот ничего не роняет ────────────────────────────────
progress.equipped.rifle = null; applyLoadout();
let crash = null;
try { renderArsenal(); drawArsenalFigure(); startLevel(0); for (let i = 0; i < 120; i++) render(); }
catch (e) { crash = e; }
say(!crash, crash ? 'ПАДЕНИЕ: ' + crash.message : 'арсенал, превью и бой без основного ствола работают');
