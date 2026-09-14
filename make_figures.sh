#!/bin/sh
# Regenerates the appendix figures offscreen from explorer.html. Captures nothing from the desktop.
set -e
cd "$(dirname "$0")"
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CH" ] || { echo "Chrome not found at $CH"; exit 1; }
mkdir -p figures

build(){ python3 - "$1" "$2" <<'PY'
import sys
name,action=sys.argv[1],sys.argv[2]
src=open('explorer.html').read()
css='<style>header,footer,.navregion,.toolrow{display:none!important}main{padding-top:18px!important}body{background:#fff!important}</style>'
js='<script>setTimeout(function(){%s;var b=document.createElement("div");b.id="__h";b.style.display="none";b.textContent=Math.ceil(document.documentElement.scrollHeight);document.body.appendChild(b);},700);</script>'%action
open('/tmp/_fig_%s.html'%name,'w').write(src+css+js)
PY
}
height(){ "$CH" --headless --disable-gpu --no-sandbox --virtual-time-budget=3000 --window-size=1440,900 \
  --dump-dom "file:///tmp/_fig_$1.html$2" 2>/dev/null \
  | sed -n 's/.*<div id="__h"[^>]*>\([0-9]*\)<\/div>.*/\1/p' | head -1; }
shot(){ build "$1" "$4"; H=$(height "$1" "$2"); [ -n "$H" ] || { echo "probe failed: $1"; exit 1; }
  "$CH" --headless --disable-gpu --no-sandbox --hide-scrollbars --virtual-time-budget=3500 \
    --window-size=1440,"$H" --screenshot="figures/$3.png" "file:///tmp/_fig_$1.html$2" >/dev/null 2>&1
  echo "  figures/$3.png  1440x$H"; }

CHANGE='var s=document.querySelector("select[data-p=\"publication_authorization\"]");if(s){s.value="absent";s.dispatchEvent(new Event("change"));}'
shot b1  "#/evidence"               B1_evidence_boundary        ""
shot b2a "#/pathway"                B2a_unknown_baseline        ""
shot b2b "#/pathway"                B2b_unknown_after_change    "$CHANGE"
shot b3  "#/safeguards/governance"  B3_governance_comparison    ""
rm -f /tmp/_fig_*.html
echo "figures written from explorer.html md5 $(md5 -q explorer.html)"
