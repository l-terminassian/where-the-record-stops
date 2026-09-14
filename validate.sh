#!/bin/sh
# One offline command: verifies the artifact rebuilds byte-for-byte, then runs every check.
# Exits non-zero if any step fails. No network access is required or attempted.
set -eu
cd "$(dirname "$0")"
STATUS=0

echo "== rebuild =="
TMP="${TMPDIR:-/tmp}/_wrs_rebuild.html"
cat head.html model.js ui.js tail.html > "$TMP"
if cmp -s "$TMP" explorer.html; then
  echo "explorer.html matches a fresh rebuild"
else
  echo "explorer.html does NOT match a rebuild from head.html model.js ui.js tail.html" >&2
  STATUS=1
fi
rm -f "$TMP"

echo "== assertions =="
./run_tests.sh | tail -1 || STATUS=1

echo "== contrast =="
python3 contrast_check.py | tail -1 || STATUS=1

echo "== routes and viewports =="
if [ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
  ./headless_checks.sh | tail -1 || STATUS=1
else
  echo "SKIPPED: headless checks need Google Chrome; every other check ran" >&2
  STATUS=1
fi

[ "$STATUS" -eq 0 ] && echo "== all checks passed ==" || echo "== FAILURES ABOVE ==" >&2
exit "$STATUS"
