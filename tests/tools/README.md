# Снимки кадра

Эти инструменты рисуют игру без браузера: холст подменяется пером,
которое записывает вызовы рисования в SVG. Так видно настоящий кадр,
а не только числа в тестах.

    python3 tests/build.py
    node tests/build/frame-fight.js   tests/build/frame.svg     # бой на сгенерированной карте
    node tests/build/frame-closeup.js tests/build/closeup.svg   # ближний план: кровь, искры, гильзы
    node tests/build/guns-sheet.js                              # силуэты всех стволов
    node tests/build/arsenal-snapshot.js armor                  # экран арсенала как HTML

SVG открывается любым просмотрщиком; на macOS растеризуется командой
`qlmanage -t -s 1200 -o . tests/build/frame.svg`.

Туман войны вырезает конус режимом наложения, которого в SVG нет, поэтому
инструменты кадра его отключают.
