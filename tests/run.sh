#!/bin/sh
# Собирает и прогоняет все наборы тестов. Нужен только node и python3.
#   ./tests/run.sh           — все наборы
#   ./tests/run.sh fx-tests  — один набор
set -e
cd "$(dirname "$0")"
python3 build.py > /dev/null

list="self-check level-tests switch-tests loadout-tests pen-tests arsenal-tests \
gen-level-tests gen-validate tutorial-tests hints-tests armor-tests fx-tests bot-tests upgrade-tests props-tests decay-tests \
integration-tests ai-tests draw-tests ttk-tests"
[ -n "$1" ] && list="$1"

pass=0; fail=0
for name in $list; do
  out=$(node "build/$name.js" 2>&1) || true
  p=$(printf '%s\n' "$out" | grep -c '✓' || true)
  f=$(printf '%s\n' "$out" | grep -c '✗' || true)
  printf '%s\n' "$out" > "build/$name.out.txt"
  printf '%-18s ✓%-5s ✗%s\n' "$name" "$p" "$f"
  [ "$f" -gt 0 ] && printf '%s\n' "$out" | grep '✗' | sed 's/^/    /'
  pass=$((pass + p)); fail=$((fail + f))
done
echo "ИТОГО: $pass пройдено, $fail провалов"
[ "$fail" -eq 0 ]
