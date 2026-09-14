#!/bin/sh
# Logic and presentation assertions, run offline against model.js, ui.js and acceptance_tests.js.
# Exits non-zero if any assertion fails.
set -eu
cd "$(dirname "$0")"
RUNNER="${TMPDIR:-/tmp}/_wrs_run.js"
trap 'rm -f "$RUNNER"' EXIT
{ printf '%s\n' 'var OUT=[]; function LOG(s){OUT.push(String(s));}'
  cat model.js
  cat ui.js
  cat acceptance_tests.js
  printf '%s\n' 'console.log(OUT.join(String.fromCharCode(10)));'
} > "$RUNNER"
OUTPUT=$(osascript -l JavaScript "$RUNNER" 2>&1)   # osascript writes console.log to stderr
printf '%s\n' "$OUTPUT"
FAILED=$(printf '%s\n' "$OUTPUT" | sed -n 's/^TOTAL passed [0-9]*   failed \([0-9]*\)$/\1/p')
if [ -z "$FAILED" ]; then
  echo "run_tests.sh: could not read the assertion summary; treating as failure" >&2
  exit 2
fi
[ "$FAILED" -eq 0 ] || { echo "run_tests.sh: $FAILED assertion(s) failed" >&2; exit 1; }
