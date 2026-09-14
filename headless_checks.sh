#!/bin/sh
# Headless browser verification. Renders offscreen — captures nothing from the desktop.
# Builds a probe harness around explorer.html, then sweeps every route at three viewports,
# reporting JS errors, page-level horizontal overflow, empty views, glossary focus handling
# and missing ARIA labels.
set -e
cd "$(dirname "$0")"
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CH" ] || { echo "Chrome not found at $CH"; exit 1; }

python3 - <<'PY'
src=open('explorer.html').read()
collector = '''<script>
window.__err=[];
window.addEventListener("error",function(e){window.__err.push("error: "+(e.message||e));});
window.addEventListener("unhandledrejection",function(e){window.__err.push("rejection: "+e.reason);});
(function(){var ce=console.error,cw=console.warn;
 console.error=function(){window.__err.push("console.error: "+[].join.call(arguments," "));ce.apply(console,arguments);};
 console.warn=function(){window.__err.push("console.warn: "+[].join.call(arguments," "));cw.apply(console,arguments);};})();
</script>
'''
probe = '''
<div id="__probe" style="display:none"></div>
<script>
setTimeout(function(){
  var r={};
  r.route=(location.hash||"#/").replace(/^#\\/?/,"")||"(home)";
  r.h1text=(document.querySelector("main h1")||{}).textContent||"";
  r.errors=window.__err.slice();
  r.hOverflow=(document.documentElement.scrollWidth>window.innerWidth+1);
  r.appHasContent=(document.getElementById("app").innerHTML.trim().length>200);
  r.controls=document.querySelectorAll("select[data-p]").length;
  r.h1=document.querySelectorAll("main h1").length;
  r.navRegions=document.querySelectorAll("main .navregion").length;
  r.primaries=document.querySelectorAll("main .navregion .btn-primary").length;
  r.headingOrder=(function(){var hs=[].slice.call(document.querySelectorAll("main h1,main h2,main h3"))
     .map(function(e){return +e.tagName[1];}); var ok=true,prev=0;
     hs.forEach(function(l){ if(prev&&l>prev+1) ok=false; prev=l; }); return ok;})();
  r.titleHasQuestion=document.title.indexOf("Where the Record Stops")>=0;
  r.navWraps=(function(){var n=document.querySelector("main .navregion"); if(!n) return false;
     var tops=[].slice.call(n.children)
       .filter(function(c){var b=c.getBoundingClientRect();return c.offsetParent&&b.height>4&&b.width>4;})
       .map(function(c){return Math.round(c.getBoundingClientRect().top);});
     return new Set(tops).size>2;})();
  r.focusableNodes=document.querySelectorAll('.nd[tabindex="0"]').length;
  r.focusableEdges=document.querySelectorAll('.ehit[tabindex="0"]').length;
  r.ariaLabelledNodes=document.querySelectorAll('.nd[aria-label]').length;
  try{
    var invoker=document.getElementById("navGloss"); invoker.focus();
    openGloss("reachable");
    r.glossOpen=!document.getElementById("glossary").hidden;
    r.glossFocusInside=document.activeElement && document.activeElement.id==="gClose";
    closeGloss();
    r.glossClosed=document.getElementById("glossary").hidden;
    r.focusRestored=document.activeElement && document.activeElement.id==="navGloss";
  }catch(e){ r.glossError=String(e); }
  document.getElementById("__probe").textContent=JSON.stringify(r);
},900);
</script>
'''
open('/tmp/_wrs_probe.html','w').write(collector+src+probe)
PY

FAILED=0
for r in "#/" "#/happened" "#/evidence" "#/pathway" "#/safeguards" "#/governance" "#/model" \
         "#/evidence/unknown" "#/safeguards/governance" "#/tour/pathway"; do
 for w in 1440 1180; do
  OUT=$("$CH" --headless --disable-gpu --no-sandbox --virtual-time-budget=2500 --window-size=$w,950 \
   --dump-dom "file:///tmp/_wrs_probe.html$r" 2>/dev/null | python3 -c "
import sys,re,json
d=sys.stdin.read(); m=re.search(r'id=\"__probe\"[^>]*>(.*?)</div>',d,re.S)
if not m: print('FAIL  probe did not run'); raise SystemExit(1)
r=json.loads(m.group(1)); bad=[]
if r['errors']: bad.append('JS ERRORS: '+str(r['errors']))
if r['hOverflow']: bad.append('PAGE OVERFLOW')
if not r['appHasContent']: bad.append('EMPTY VIEW')
if not r.get('focusRestored'): bad.append('FOCUS NOT RESTORED')
if not r.get('glossClosed'): bad.append('GLOSSARY STUCK OPEN')
if r['focusableNodes']!=r['ariaLabelledNodes']: bad.append('NODES MISSING ARIA')
if r['h1']!=1: bad.append('H1 COUNT='+str(r['h1']))
if r['navRegions']>1: bad.append(str(r['navRegions'])+' NAV REGIONS')
if r['primaries']>1: bad.append(str(r['primaries'])+' PRIMARY ACTIONS')
if not r['headingOrder']: bad.append('HEADING LEVEL SKIP')
if not r['titleHasQuestion']: bad.append('DOCUMENT TITLE NOT SET')
if r['navWraps']: bad.append('NAV WRAPS AMBIGUOUSLY')
print(('FAIL  ' if bad else 'ok    ')+f\"{r['route']:<14} nodes={r['focusableNodes']:>2} edges={r['focusableEdges']:>2} controls={r['controls']}  \"+('; '.join(bad) if bad else 'clean'))")
  echo "  [$w] $OUT"
  case "$OUT" in FAIL*) FAILED=$((FAILED+1));; esac
 done
done
echo ""
echo "headless checks: $([ $FAILED -eq 0 ] && echo 'all clean' || echo "$FAILED FAILURES")"
exit $FAILED
