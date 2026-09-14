#!/usr/bin/env python3
"""WCAG contrast audit over the CSS tokens, for every foreground/background pair the design uses.
Covers all three theme states. Run: python3 contrast_check.py"""
import re,sys
h=open('head.html').read()
def norm(x):
    x=x.lstrip('#'); return '#'+(''.join(c*2 for c in x) if len(x)==3 else x)
def block(pat): return {k:norm(v) for k,v in re.findall(r'(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\b',
                        re.search(pat,h,re.S).group(1))}
light=block(r':root\{(.*?)\}')
media=block(r'@media \(prefers-color-scheme:dark\)\{:root:not\(\[data-theme="light"\]\)\{(.*?)\}\}')
attr =block(r':root\[data-theme="dark"\]\{(.*?)\}')
dark_media={**light,**media}; dark_attr={**light,**attr}
def lum(hx):
    hx=hx.lstrip('#'); r,g,b=[int(hx[i:i+2],16)/255 for i in (0,2,4)]
    f=lambda c: c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    return .2126*f(r)+.7152*f(g)+.0722*f(b)
def ratio(a,b):
    la,lb=lum(a),lum(b); return (max(la,lb)+.05)/(min(la,lb)+.05)
PAIRS=[("--ink","--paper","body text on page",4.5),("--ink","--surface","text on panels",4.5),
 ("--muted","--surface","secondary text on panels",4.5),("--muted","--paper","secondary text on page",4.5),
 ("--muted","--surface2","code / rule text",4.5),("--t2","--surface","links",4.5),
 ("--t3","--surface","projected accent text",4.5),("--t3","--n-unres","callout text on warm fill",4.5),
 ("--stop","--surface","safeguard accent text",4.5),("--on-accent","--t1","button label on accent",4.5),
 ("--ink","--n-active","node label (met)",4.5),("--ink","--n-unres","node label (unknown)",4.5),
 ("--ink","--n-blocked","node label (blocked)",4.5),("--ink","--n-inactive","node label (off path)",4.5),
 ("--muted","--n-active","node state label (met)",4.5),("--muted","--n-unres","node state label (unknown)",4.5),
 ("--muted","--n-blocked","node state label (blocked)",4.5),("--muted","--n-inactive","node state label (off path)",4.5),
 ("--t1","--n-active","node glyph",3.0),("--stop","--n-blocked","blocked glyph",3.0),
 ("--t3","--paper","boundary rule and labels",3.0),
 ("--rule-strong","--surface","interactive control borders",3.0)]
total=0
for name,T in (("LIGHT",light),("DARK (system)",dark_media),("DARK (explicit)",dark_attr)):
    fails=[x for x in PAIRS if x[0] in T and x[1] in T and ratio(T[x[0]],T[x[1]])<x[3]]
    print(f"{name:16s} {len(PAIRS)-len(fails)}/{len(PAIRS)} pass")
    for fg,bg,what,mn in fails:
        print(f"   FAIL {ratio(T[fg],T[bg]):.2f}:1 (need {mn}) {what}")
    total+=len(fails)
print("ALL PASS" if total==0 else f"{total} FAILING PAIR(S)")
sys.exit(1 if total else 0)
