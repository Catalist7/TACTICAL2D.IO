
const DT = 1/60;
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
const step = n => { for (let i = 0; i < n; i++) { updateRound(DT); updateWorld(DT); } };

// ── Игрок начинает с пака, ничего не покупая ─────────────────────────────
startLevel(0);
say(player.slots.rifle === null && player.slots.pistol === LOADOUT.ct.pistol,
    `в руках сразу только ${WEAPONS[player.slots.pistol].name}`);
say(ammoOf(player, player.slots.pistol).mag === WEAPONS[LOADOUT.ct.pistol].mag,
    'магазин полный с первого кадра');
say(player.active === 'pistol', 'основного ствола нет — в руках пистолет');

// ── Бесплатное — только пак ──────────────────────────────────────────────
say(owns(LOADOUT.ct.pistol) && !owns('mp5'), 'USP числится купленным, ПП — нет');
progress.tutorial = 'done';   // дальше — правила пака для опытного игрока

// ── Погиб: пак возвращается, купленное сверху теряется ───────────────────
progress.money = 6000;
buyWeapon('ak'); buyArmor('helmet');
startLevel(0);
say(player.slots.rifle === 'ak' && player.armor === 130 && player.armorMax === 130,
    'докупили AK и броню со шлемом — всё в бою');
beginLive();
killEntity(player, bots[0]);
step(2 + Math.ceil(CFG.END_TIME / DT) + 5);
say(player.slots.rifle === 'ak' && player.armor === 130,
    'после смерти арсенальное снаряжение никуда не делось');

// ── Выжил: своё оружие сохраняется, пак его не затирает ──────────────────
beginLive();
bots.forEach(b => { b.alive = false; });        // выигрываем раунд живым
LEVELS[0].wins = 99;                            // чтобы операция не закрылась
step(2 + Math.ceil(CFG.END_TIME / DT) + 5);
say(player.slots.rifle === 'ak', 'выживший с AK его не потерял');
say(player.slots.pistol === LOADOUT.ct.pistol, 'пистолет из пака при этом на месте');
LEVELS[0].wins = 1;

// ── Пустой слот добирается из пака ───────────────────────────────────────
state.survivedLastRound = true;
player.slots.rifle = null;
resetPlayerForRound();
say(player.slots.rifle === LOADOUT.ct.rifle, 'пустой слот добирается из пака (сейчас там экипированный AK)');

// ── Оружие террористов ───────────────────────────────────────────────────
startLevel(0);
say(bots.every(b => LOADOUT.t.includes(b.weapon)),
    `у всех врагов оружие из пака: ${bots.map(b => WEAPONS[b.weapon].name).join(', ')}`);

const counts = {};
for (let i = 0; i < 4000; i++) { const w = botLoadout(); counts[w] = (counts[w] || 0) + 1; }
const shares = LOADOUT.t.map(id => counts[id] / 4000);
say(LOADOUT.t.every(id => counts[id] > 0),
    'за 4000 раздач встречаются все четыре ствола');
say(shares.every(p => Math.abs(p - 0.25) < 0.03),
    'распределение равномерное: ' + LOADOUT.t.map((id, i) =>
      `${WEAPONS[id].name} ${(shares[i] * 100).toFixed(0)}%`).join(', '));

// ── Рост оружия по раундам действительно убран ───────────────────────────
{
  const seen = new Set();
  for (let r = 1; r <= 10; r++) { state.round = r; for (let i = 0; i < 60; i++) seen.add(botLoadout()); }
  say(seen.size === LOADOUT.t.length && [...seen].every(id => LOADOUT.t.includes(id)),
      'в любом раунде выпадают те же четыре ствола, не сильнее');
}
