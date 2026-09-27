# Снимки кадра

Эти инструменты рисуют игру без браузера: холст подменяется пером,
которое записывает вызовы рисования в SVG. Так видно настоящий кадр,
а не только числа в тестах.

    python3 tests/build.py
    node tests/build/frame-fight.js   tests/build/frame.svg     # бой на сгенерированной карте
    node tests/build/frame-closeup.js tests/build/closeup.svg   # ближний план: кровь, искры, гильзы
    node tests/build/frame-barrels.js tests/build/barrel-a.svg tests/build/barrel-b.svg   # бочка у поста: до и после взрыва
    node tests/build/figure-sheet.js 'tests/build/figure-{n}.svg'   # боец из арсенала: все виды брони
    node tests/build/guns-sheet.js                              # силуэты всех стволов
    node tests/build/arsenal-snapshot.js armor                  # экран арсенала как HTML

SVG открывается любым просмотрщиком; на macOS растеризуется командой
`qlmanage -t -s 1200 -o . tests/build/frame.svg`.

Туман войны вырезает конус режимом наложения, которого в SVG нет, поэтому
инструменты кадра его отключают.

## Трёхмерный арсенал

WebGL в node не работает, поэтому бойца и превью стволов снимает настоящий
браузер без окна — Playwright с Chromium, установленный вне проекта:

    npm i playwright && npx playwright install chromium
    node tests/tools/arsenal-3d-shots.js index.html shots/ none,assault,eod 0,1.57,3.14 ak,m4,nova
    CLOSE=1 node tests/tools/arsenal-3d-shots.js index.html shots/ heavy 0.3 m4   # крупный план

Геометрию и сборку без браузера проверяет набор `r3d-tests`.
