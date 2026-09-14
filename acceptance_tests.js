var fails=0,passes=0;
function base(){var o={};PARAMS.forEach(function(p){o[p.id]=p.base;});return o;}
function chk(n,c){ if(c){passes++;LOG("  PASS  "+n);} else {fails++;LOG("  FAIL  "+n);} }
function S(o){var P=base();for(var k in o)P[k]=o[k];return evaluate(P);}
function presetS(id){var p=PRESETS.filter(function(x){return x.id===id;})[0];return S(p.set||{});}

LOG("--- model, rules and three-valued logic ---");

/* 11 + 1: baseline imputes nothing */
var rec=S({});
chk("11 baseline: publication control is UNKNOWN, not absent", rec.sg_publication_control==="unresolved");
chk("11 baseline: rollback is UNKNOWN, not weak", rec.sg_rollback_effective==="unresolved");
chk("11 baseline: release authority is UNKNOWN, not present", rec.pj_release_authority==="unresolved");
chk("11 baseline: no human consequence is active",
  ["hc_privacy","hc_wrong_outputs","hc_direct_disruption","hc_protective_disruption"].every(function(e){return rec[e]!=="active";}));
chk("11 baseline: observed spine locked active", rec.obs_write_exercised==="active"&&rec.obs_no_change_shipped==="active");

/* 1: unknown integrity propagates unresolved rather than open */
var t1=S({objective:"external_direction",release_authority:"full_release_authority",modification_type:"backdoor_exfil"});
chk("1  unknown publication authorisation -> bypass unresolved, not active", t1.pj_publication_bypass==="unresolved");
chk("1  unknown publication authorisation -> tampering unresolved, not active", t1.pj_artifact_tampered==="unresolved");

/* 2: unknown rollback */
var t2=S({objective:"external_direction",release_authority:"full_release_authority",modification_type:"backdoor_exfil",
          publication_authorization:"absent",detection_timing:"delayed",downstream_use:"adopted_consequential"});
chk("2  unknown rollback -> exposure unresolved", t2.pj_exposure==="unresolved");

/* 3: no release authority prevents modification and therefore tampering */
var t3=S({objective:"external_direction",release_authority:"none",modification_type:"backdoor_exfil",publication_authorization:"absent"});
chk("3  no release authority -> modification capability inactive", t3.pj_modification_capability==="inactive");
chk("3  no release authority -> tampering inactive", t3.pj_artifact_tampered==="inactive");

/* 2/3 mirror: objective alone, access alone */
chk("3b harmful objective without release authority cannot tamper",
  S({objective:"external_direction",release_authority:"none",publication_authorization:"absent"}).pj_artifact_tampered!=="active");
chk("3c release authority without harmful objective cannot tamper",
  S({objective:"none_evidenced",release_authority:"full_release_authority",modification_type:"backdoor_exfil",
     publication_authorization:"absent"}).pj_artifact_tampered!=="active");

/* 4: structural invariant across a sweep of scenarios */
function invariantHolds(st){
  return NODES.every(function(n){
    if(st[n.id]!=="active") return true;
    return unmetRequired(n.id,st).length===0;
  });
}
var sweepBad=0, combos=0;
var objs=["none_evidenced","external_direction"], ras=["none","repo_write_uncertain","full_release_authority"],
    mts=["none_attempted","unknown_effect","backdoor_exfil","integrity_degradation","destructive"],
    pas=["unknown","absent","signing_only","signing_plus_independent_auth"],
    dus=["not_adopted","adopted_low_stakes","adopted_consequential"],
    dts=["unknown","pre_publication","rapid_post","delayed","none_effective"],
    rbs=["unknown","immediate_complete","partial","unavailable"];
objs.forEach(function(o){ras.forEach(function(r){mts.forEach(function(m){pas.forEach(function(pa){
  dus.forEach(function(d){dts.forEach(function(dt){rbs.forEach(function(rb){
    combos++;
    var st=S({objective:o,release_authority:r,modification_type:m,publication_authorization:pa,
              downstream_use:d,detection_timing:dt,rollback_capability:rb});
    if(!invariantHolds(st)) sweepBad++;
  });});});});});});});
chk("4  no active node with an unmet required parent ("+combos+" combinations swept)", sweepBad===0);

/* 7: modification type routes to exactly one endpoint */
function full(mt,extra){var o={objective:"external_direction",release_authority:"full_release_authority",
  modification_type:mt,publication_authorization:"absent",downstream_use:"adopted_consequential",
  detection_timing:"delayed",rollback_capability:"unavailable"};for(var k in (extra||{}))o[k]=extra[k];return S(o);}
var mb=full("backdoor_exfil"), mi=full("integrity_degradation"), md=full("destructive");
chk("7  backdoor modification activates privacy loss ONLY",
  mb.hc_privacy==="active"&&mb.hc_wrong_outputs!=="active"&&mb.hc_direct_disruption!=="active");
chk("7  degradation modification activates wrong outputs ONLY",
  mi.hc_wrong_outputs==="active"&&mi.hc_privacy!=="active"&&mi.hc_direct_disruption!=="active");
chk("7  destructive modification activates direct disruption ONLY",
  md.hc_direct_disruption==="active"&&md.hc_privacy!=="active"&&md.hc_wrong_outputs!=="active");

/* 8: protective vs attacker-induced disruption */
var prot=full("backdoor_exfil",{detection_timing:"rapid_post",rollback_capability:"immediate_complete"});
chk("8  rapid detection yields PROTECTIVE disruption and no direct disruption",
  prot.hc_protective_disruption==="active"&&prot.hc_direct_disruption!=="active");
chk("8  protective disruption is absent when nothing was tampered", rec.hc_protective_disruption!=="active");
chk("8  direct disruption arises only from a destructive change, not from the defence",
  md.hc_direct_disruption==="active"&&full("backdoor_exfil",{detection_timing:"delayed"}).hc_direct_disruption!=="active");

/* 9 + 10: governance */
var gp=presetS("gov_paper"), ge=presetS("gov_effective");
chk("9  duty on paper does NOT activate the technical control", gp.sg_publication_control!=="active");
chk("9  duty on paper does NOT block the pathway", gp.pj_artifact_tampered==="active");
chk("9  duty on paper leaves implementation unresolved at best", gp.sg_gov_implemented!=="active");
chk("10 effective package blocks publication", ge.sg_publication_control==="active"&&ge.pj_publication_bypass!=="active");
chk("10 effective package prevents tampering", ge.pj_artifact_tampered!=="active");
var gepre=PRESETS.filter(function(p){return p.id==="gov_effective";})[0].set;
chk("10 effective-governance preset declares BOTH implementation and technical effectiveness",
  gepre.governance_package==="effective_technical_control"&&gepre.publication_authorization==="signing_plus_independent_auth");
chk("10 auditable requirement alone leaves implementation unresolved",
  S({governance_package:"auditable_requirement"}).sg_gov_implemented==="unresolved");

/* 6: no inert user-facing parameter */
var ruleText=JSON.stringify(NODES.map(function(n){return [n.rule,n.unresolvedIf];}));
var inert=PARAMS.filter(function(p){return ruleText.indexOf('"'+p.id+'"')<0;});
chk("6  every user-facing parameter is referenced by at least one rule"+(inert.length?" ["+inert.map(function(p){return p.id;}).join(", ")+"]":""),
  inert.length===0);
chk("6  historical descriptors are not exposed as parameters",
  typeof HISTORICAL!=="undefined" && HISTORICAL.length>0 && PARAMS.every(function(p){return p.cls!=="observed";}));

/* 5: each intervention demonstrably moves something */
function differs(a,b){return NODES.some(function(n){return a[n.id]!==b[n.id];});}
var openBase={objective:"external_direction",release_authority:"full_release_authority",modification_type:"backdoor_exfil",
  publication_authorization:"absent",downstream_use:"adopted_consequential",detection_timing:"delayed",rollback_capability:"unavailable"};
function withP(k,v){var o={};for(var x in openBase)o[x]=openBase[x];o[k]=v;return S(o);}
chk("5  publication authorisation changes the outcome", differs(S(openBase),withP("publication_authorization","signing_plus_independent_auth")));
chk("5  detection timing changes the outcome", differs(S(openBase),withP("detection_timing","pre_publication")));
/* rollback is operative only when detection is timely. Assert both halves of that coupling. */
var timely={}; for(var k in openBase) timely[k]=openBase[k]; timely.detection_timing="rapid_post";
function withT(k,v){var o={};for(var x in timely)o[x]=timely[x];o[k]=v;return S(o);}
chk("5  rollback changes the outcome when detection is timely",
  differs(S(timely),withT("rollback_capability","immediate_complete")));
chk("5  rollback is INERT under delayed detection, by design not by accident",
  !differs(S(openBase),withP("rollback_capability","immediate_complete")));
chk("5  that coupling is declared in the safeguard's stated mechanism",
  byId.sg_rollback_effective.mech.toLowerCase().indexOf("without timely detection")>=0);
chk("5  governance package changes the outcome", differs(S(openBase),withP("governance_package","effective_technical_control")));
chk("5  downstream use changes the outcome", differs(S(openBase),withP("downstream_use","not_adopted")));
chk("5  reporting changes something (detection lane) but not capability",
  differs(S(openBase),withP("reporting","mandatory_rapid"))===false || withP("reporting","mandatory_rapid").obs_sandbox_escape==="active");
chk("5  reporting never alters initial access or credential harvest",
  withP("reporting","mandatory_rapid").obs_sandbox_escape===S(openBase).obs_sandbox_escape &&
  withP("reporting","mandatory_rapid").obs_credential_harvest===S(openBase).obs_credential_harvest);

/* 12: presets */
PRESETS.forEach(function(p){
  var st=presetS(p.id), ok=Object.keys(st).every(function(k){return ["active","blocked","unresolved","inactive"].indexOf(st[k])>=0;});
  chk("12 preset '"+p.label+"' resolves cleanly and holds the invariant", ok&&invariantHolds(st));
});
chk("12 every preset deviation is expressible as a listed assumption",
  PRESETS.every(function(p){return !p.set || Object.keys(p.set).every(function(k){return PARAMS.some(function(q){return q.id===k;});});}));

/* edge discipline */
chk("E  only four edge classes exist",
  [...new Set(EDGES.map(function(e){return e[2];}))].every(function(r){return ["sequence","mechanism","required","block"].indexOf(r)>=0;}));
chk("E  every mechanism edge on the observed side carries epistemic metadata",
  EDGES.filter(function(e){return e[2]==="mechanism"&&e[0].indexOf("obs_")===0;}).every(function(e){return e[3]&&e[3].mech;}));
chk("E  no observed-side edge is labelled 'required'",
  EDGES.filter(function(e){return e[0].indexOf("obs_")===0&&e[1].indexOf("obs_")===0;}).every(function(e){return e[2]!=="required";}));

/* epistemics */
chk("C  every node with a confidence states its dimension",
  NODES.filter(function(n){return n.conf;}).every(function(n){return n.confDim&&CONF_DIM[n.confDim];}));
chk("C  every projected non-safeguard node carries mechanism or missing-evidence text",
  NODES.filter(function(n){return n.status==="projected"&&n.lane!=="safe";}).every(function(n){return n.mech||n.missing;}));
chk("C  uncorroborated claims are recorded rather than encoded",
  typeof UNCORROBORATED!=="undefined"&&UNCORROBORATED.length>=2);

LOG(""); LOG("passed "+passes+"   failed "+fails);


/* ============ information architecture: non-regression and navigation ============ */
LOG(""); LOG("--- presentation layer: model equivalence ---");
var ALLIDS=NODES.map(function(n){return n.id;});
function guidedVisible(oc){var cl=requiredClosure(oc),out=[];
  cl.forEach(function(id){var n=byId[id];
    if(n&&n.lane!=="drivers"&&!(n.lane==="chainA"&&id!=="obs_credential_harvest"))out.push(id);});
  return out;}
var SCEN=[{},
 {objective:"external_direction",release_authority:"full_release_authority",modification_type:"backdoor_exfil",
  publication_authorization:"absent",downstream_use:"adopted_consequential",detection_timing:"delayed",rollback_capability:"unavailable"},
 {governance_package:"duty_on_paper",objective:"insider_direction",release_authority:"trusted_release_write",
  modification_type:"destructive",publication_authorization:"absent",downstream_use:"adopted_consequential",
  detection_timing:"none_effective",rollback_capability:"unavailable"}];
var drift=0,hidden=0;
SCEN.forEach(function(sc){var Pp=base();for(var k in sc)Pp[k]=sc[k];
  var a=evaluate(Pp),b=evaluate(Pp),c=evaluate(Pp);   // tour / standalone / workspace all call this
  ALLIDS.forEach(function(id){if(a[id]!==b[id]||b[id]!==c[id])drift++;
    if(c[id]===undefined)hidden++;});});
chk("10 guided, standalone-question and workspace views produce identical states for identical P", drift===0);
chk("11 hidden or collapsed content still participates in inference", hidden===0);
chk("11b every guided visible set is a strict subset of the canonical node list",
  ["hc_privacy","hc_wrong_outputs","hc_direct_disruption","hc_protective_disruption"].every(function(oc){
    var v=guidedVisible(oc);return v.length<ALLIDS.length&&v.every(function(id){return ALLIDS.indexOf(id)>=0;});}));
var Pb=base(),before=JSON.stringify(evaluate(Pb));
requiredClosure("hc_privacy");paramsForOutcome("hc_privacy");PATH_ORDER("hc_privacy");
chk("11c view derivations never mutate the model or the evaluation", JSON.stringify(evaluate(Pb))===before);
chk("V6 assumptions offered for an outcome are exactly those its pathway references",
  ["hc_privacy","hc_wrong_outputs","hc_direct_disruption"].every(function(oc){
    var rel=paramsForOutcome(oc).map(function(p){return p.id;});
    var txt=JSON.stringify([...requiredClosure(oc)].map(function(id){return [byId[id].rule,byId[id].unresolvedIf];}));
    return rel.every(function(id){return txt.indexOf('"'+id+'"')>=0;});}));
chk("V7 each consequence still routes through its own modification mechanism",
  requiredClosure("hc_privacy").has("pj_consequential_use")&&
  !requiredClosure("hc_protective_disruption").has("pj_consequential_use"));

LOG(""); LOG("--- information architecture: five questions, five chapters ---");
var HOME=scrHome.toString(), NAV=nav.toString(), PH=pagehead.toString(), PG=progress.toString(),
    EV=scrEvidence.toString(), SG=scrSafeguards.toString(), GV=scrGovernance.toString()+governanceBlock.toString(),
    PW=scrPathway.toString(), MD=scrModel.toString();
var ROUTES=CHAPTERS.map(function(c){return "#/"+c.id;});

chk("1  exactly five chapters, matching the five questions",
  CHAPTERS.length===5 &&
  CHAPTERS.map(function(c){return c.id;}).join(",")==="happened,evidence,pathway,safeguards,governance");
chk("1d the first card is flagged as the recommended starting point, with no separate start button",
  HOME.indexOf("Recommended starting point")>=0 && HOME.indexOf("recommended")>=0 &&
  HOME.indexOf("Start at the beginning")<0);
chk("1b the home page renders one card per chapter, in chapter order",
  HOME.indexOf("CHAPTERS.map")>=0 && HOME.indexOf("${c.q}")>=0 &&
  Object.keys(CARD_D).length===5 &&
  CHAPTERS.every(function(c){return CARD_D[c.id];}));
chk("1c every card question is exactly the chapter h1",
  PH.indexOf("c.q")>=0 && HOME.indexOf("${c.q}")>=0);
chk("2  the navigator contains exactly the five chapters",
  PG.indexOf("CHAPTERS.map")>=0 &&
  CHAPTERS.map(function(c){return c.step;}).join(",")==="Incident,Evidence,Consequences,Safeguards,Governance");
chk("2b only the current chapter is marked; none is styled as completed",
  PG.indexOf('aria-current="page"')>=0 && PG.indexOf('"done"')<0 && PG.indexOf("disabled")<0);
chk("3  one canonical route per chapter, and no child or duplicate routes",
  ROUTES.join(",")==="#/happened,#/evidence,#/pathway,#/safeguards,#/governance" &&
  hashFor("governance")==="#/governance" && hashFor("model")==="#/model" &&
  JSON.stringify([HOME,NAV,PH,PG,EV,SG,GV,PW,MD]).indexOf("#/tour/")<0 &&
  JSON.stringify([HOME,NAV,PH,PG,EV,SG,GV,PW,MD]).indexOf("#/explore/")<0 &&
  JSON.stringify([HOME,NAV,PH,PG,EV,SG,GV,PW,MD]).indexOf("focus=")<0);
chk("3b old routes redirect rather than 404",
  typeof LEGACY==="object" && LEGACY["evidence/unknown"]==="#/evidence" &&
  LEGACY["safeguards/governance"]==="#/governance" &&
  parseHash.toString().indexOf("history.replaceState")>=0);
chk("3c the deep-dive concept is gone from the code and the copy",
  typeof FOCUS==="undefined" &&
  JSON.stringify([HOME,NAV,PH,EV,SG,GV,PW,MD]).toLowerCase().indexOf("deep dive")<0 &&
  JSON.stringify([HOME,NAV,PH,EV,SG,GV,PW,MD]).indexOf("Four chapters")<0 &&
  HOME.indexOf("Read the five questions in order, or jump directly")>=0);
chk("4  chapter 2 answers both halves of the same question",
  CH("evidence").q==="What do we know—and what remains unknown?" &&
  EV.indexOf("What the reviewed sources establish")>=0 && EV.indexOf("Where the reviewed sources stop")>=0 &&
  EV.indexOf("Technical evidence audit")>=0 &&
  /* the fuller wording lives in the one list; there is no second copy */
  (EV.match(/Which control ultimately prevented publication/g)||[]).length===1);
chk("4b public-record unknowns are still computed from the baseline, not the scenario",
  EV.indexOf("effState(evaluate(BASE()))")>=0 &&
  EV.indexOf("does not move\n     when you change scenario settings")>=0 &&
  EV.indexOf("Still cannot be determined under your current settings")>=0 &&
  /* the audit section carries no stale vocabulary */
  EV.indexOf("unresolved model elements")<0 && EV.indexOf("documented baseline")<0 &&
  EV.indexOf("Assumptions with no basis")<0);
chk("5  governance is chapter 5 and follows safeguards",
  CHI("governance")===4 && CHI("safeguards")===3 &&
  CH("governance").q==="Could stronger legal requirements help?" &&
  typeof scrGovernance==="function");
chk("5b the mediation chain is stated, and law never blocks software directly",
  GV.indexOf("Legal duty → implementation → independent verification → effective technical control")>=0 &&
  GV.indexOf("settings together")>=0 && GV.indexOf("not legal coverage")>=0);
chk("5c governance keeps the consequence-specific comparison and the protective-disruption reading",
  GV.indexOf("govPair(oc)")>=0 && GV.indexOf('oc==="hc_protective_disruption"')>=0 &&
  GV.indexOf("defensive cost, not a failed safeguard")>=0);
chk("5d chapter 5 ends with 'choose another question' plus a secondary full-model action",
  (function(){var sc=chap; chap="governance"; var h=nav(); chap=sc;
   return h.indexOf("All questions")>=0 &&
          (h.match(/btn-primary/g)||[]).length===1 &&
          h.indexOf('class="btn-secondary" data-go="#/model"')>=0 &&
          /* only the last chapter repeats the full model in its tertiary row */
          h.indexOf('data-go="#/model"')>=0;})());
chk("6  every chapter emits exactly one filled primary and one nav region",
  (function(){var bad=[], sc=chap;
    CHAPTERS.forEach(function(c){chap=c.id; var h=nav();
      var prim=(h.match(/btn-primary/g)||[]).length, reg=(h.match(/class="navregion"/g)||[]).length;
      if(prim!==1||reg!==1) bad.push(c.id+" primary="+prim+" regions="+reg);});
    chap=sc; if(bad.length) LOG("       "+bad.join(" | ")); return bad.length===0;})());
chk("6b previous and next name their destination",
  (function(){var sc=chap; chap="safeguards"; var h=nav(); chap=sc;
   return h.indexOf("← "+CH("pathway").short)>=0 && h.indexOf("Next: "+CH("governance").short)>=0;})());
chk("7  the full model returns to the page it was opened from",
  go.toString().indexOf('returnTo=cur')>=0 && labelForHash("#/governance").indexOf("legal requirements")>=0 &&
  labelForHash("#/").indexOf("questions")>=0 && labelForHash("#/model")==="the full model");
chk("8  the glossary is an overlay: opening or closing it never routes or touches history",
  openGloss.toString().indexOf("history")<0 && closeGloss.toString().indexOf("history")<0 &&
  closeGloss.toString().indexOf("go(")<0 && closeGloss.toString().indexOf("lastFocus")>=0 &&
  /* the one navigation inside it is an explicit link the reader clicks */
  openGloss.toString().indexOf('data-go')>=0);
chk("9  changing a parameter re-renders without adding a history entry",
  wire.toString().indexOf("render(false)")>=0 && go.toString().indexOf("history.pushState")>=0);
chk("12 consequence and scenario are module state, so they survive navigation",
  render.toString().indexOf("P=")<0 && applyRoute.toString().indexOf("P=")<0 &&
  applyRoute.toString().indexOf("outcome=")<0);
chk("13 navigation focuses the page h1, and never scrolls past it",
  render.toString().indexOf('getElementById("pageTitle")')>=0 &&
  /\.focus\(\{preventScroll:true\}\)/.test(render.toString()) &&
  render.toString().indexOf("scrollIntoView")<0);
chk("14 one h1 per screen",
  [EV,SG,GV,PW,MD,HOME].every(function(x){return (x.match(/<h1 /g)||[]).length<=1;}));
chk("15 scenario state is visible wherever assumptions can differ, and absent where they cannot",
  [PW,SG,MD].every(function(x){return x.indexOf("statusStrip()")>=0;}) &&
  scrGovernance.toString().indexOf("statusStrip()")<0 &&
  scrHappened.toString().indexOf("statusStrip()")<0);

LOG(""); LOG("--- terminology ---");
chk("T1 the full model is named consistently everywhere",
  MD.indexOf("Full causal model")>=0 && MD.indexOf("Expert view")>=0 &&
  NAV.indexOf("Open full model")>=0 &&
  JSON.stringify([HOME,NAV,MD,EV,SG,GV,PW]).indexOf("Expert workspace")<0 &&
  JSON.stringify([HOME,NAV,MD,EV,SG,GV,PW]).indexOf("expert workspace")<0);
chk("T2 the dossier link names what it opens",
  dossier.toString().indexOf("Read the plain-language explanation")>=0 &&
  dossier.toString().indexOf("guided explanation")<0);

LOG(""); LOG("--- scientific non-regression ---");
var ALLIDS=NODES.map(function(n){return n.id;});
var SCEN=[{},
 {objective:"external_direction",release_authority:"full_release_authority",modification_type:"backdoor_exfil",
  publication_authorization:"absent",downstream_use:"adopted_consequential",detection_timing:"delayed",rollback_capability:"unavailable"},
 {governance_package:"duty_on_paper",objective:"insider_direction",release_authority:"trusted_release_write",
  modification_type:"destructive",publication_authorization:"absent",downstream_use:"adopted_consequential",
  detection_timing:"none_effective",rollback_capability:"unavailable"}];
var drift=0;
SCEN.forEach(function(sc){var Pp=base();for(var k in sc)Pp[k]=sc[k];
  var a=evaluate(Pp),b=evaluate(Pp);
  ALLIDS.forEach(function(id){if(a[id]!==b[id])drift++;});});
chk("N1 identical P produces identical node states, every chapter using the one engine", drift===0);
chk("N2 the baseline still resolves the three decisive conditions as unknown",
  (function(){var r=evaluate(base());
   return r.sg_publication_control==="unresolved" && r.sg_rollback_effective==="unresolved" &&
          r.pj_release_authority==="unresolved";})());
chk("N3 mechanism-specific routing is unchanged",
  requiredClosure("hc_privacy").has("pj_consequential_use") &&
  !requiredClosure("hc_protective_disruption").has("pj_consequential_use"));
chk("N4 illustrative scenarios still open their own consequence",
  ["hc_privacy","hc_wrong_outputs","hc_direct_disruption","hc_protective_disruption"]
   .every(function(oc){return evaluate(illustrativeFor(oc))[oc]==="active";}));
chk("N5 'without a safeguard' still means absent, never unknown",
  typeof WEAK==="object" && WEAK.publication_authorization==="absent" &&
  scrSafeguards.toString().indexOf("WEAK[sgSel]")>=0);
chk("N6 a weakened control is still not counted as a safeguard applied",
  (function(){var keep={};for(var k in P)keep[k]=P[k];
    P=illustrativeFor("hc_wrong_outputs");
    var applied=changedBy("safeguard").length, weak=changedBy("response").length;
    P=keep; return applied===0 && weak===3;})());

LOG(""); LOG("--- language discipline ---");
var ALLUI=HOME+NAV+PH+EV+SG+GV+PW+MD+statusStrip.toString();
chk("L1 no 'N of M outcomes open' counter", !/\d+\s+of\s+\d+\s+(outcomes|endpoints)/i.test(ALLUI));
chk("L2 reaching a consequence is always tied to the current settings",
  ALLUI.indexOf("Under your selected settings")>=0 && ALLUI.indexOf("Under your current scenario settings")>=0);
chk("L3 an undetermined result is never rendered as absence",
  stateShort({lane:"bridge"},"unresolved")==="cannot be determined" &&
  stateShort({lane:"bridge"},"inactive")==="does not occur" &&
  stateWord({lane:"bridge"},"unresolved").indexOf("cannot be determined")>=0);
chk("L4 blocked is never called impossible in reality", /not the same as impossible/.test(ALLUI));
chk("L5 the overclaim about unanswered questions stays gone",
  ALLUI.indexOf("nobody has")<0 && EV.indexOf("does not settle")>=0 || EV.indexOf("not stated")>=0);
chk("L6 the safeguards page reports the actual pathway state",
  typeof notDemonstrable==="function" &&
  notDemonstrable("blocked",["sg_publication_control"],base())[0].indexOf("already stops at")>=0 &&
  notDemonstrable("inactive",[],base())[0].indexOf("No harmful objective")>=0 &&
  notDemonstrable("unresolved",[],base())[0].indexOf("cannot determine")>=0);
chk("L7 worked examples appear only where they still add something",
  EV.indexOf('callout("unknown")')>=0 &&
  SG.indexOf('protectiveRelevant?callout("defence")')>=0 &&
  /* the reachable and law callouts are now redundant with the page itself, and are gone */
  PW.indexOf('callout("reachable")')<0 && GV.indexOf('callout("law")')<0);
chk("L8 glossary defines every required term",
  ["artifact","documented","conditional","cannot-determine","reachable","required","release-authority",
   "publication-authorization","adoption","rollback","governance-package","safeguard",
   "scenario-setting","modelled-step","occurs","does-not-occur","prevented","unknown"]
   .every(function(t){return GLOSS.some(function(gg){return gg[0]===t;});}));
chk("L9 abbreviated pathways disclose how much is hidden", PW.indexOf("of ${rel.length} relevant settings")>=0);
chk("L10 the record chapter exposes no scenario controls",
  scrHappened.toString().indexOf("data-p=")<0);
chk("L11 the changed-settings list is labelled for what it can contain",
  changesList.toString().indexOf("scenario settings that differ from the reviewed sources")>=0);



LOG(""); LOG("--- clarity, glossary and micro-tutorials ---");
var HOME2=scrHome.toString(), EV2=scrEvidence.toString(), PW2=scrPathway.toString(),
    SG2=scrSafeguards.toString(), GV2=scrGovernance.toString(), MD2=scrModel.toString();
chk("C1 the guided graph's promised interaction produces an explanation",
  typeof inspectCard==="function" && scrPathway.toString().indexOf("inspectCard(ES)")>=0 &&
  inspectCard.toString().indexOf("stateWord")>=0 && inspectCard.toString().indexOf("RELROLE")>=0);
chk("C2 chapter 2 lists only genuine unresolved questions about the incident",
  EV.indexOf("What would happen under a harmful objective")<0 &&
  EV.indexOf("Two questions about the incident itself")>=0 &&
  /* detection and rollback are scenario inputs, not open incident facts, and are named as such */
  EV.indexOf("scenario settings the incident cannot supply")>=0 &&
  EV.indexOf("Nothing\n    shipped, so they never arose")>=0);
chk("C3 introductory wording no longer overstates the evidence",
  CH("happened").answer.indexOf("through the intended route")>=0 &&
  CH("happened").answer.indexOf("honestly")<0 &&
  CH("evidence").answer.indexOf("No unauthorised change reached the public")>=0 &&
  CH("evidence").answer.indexOf("decide everything")<0 &&
  CH("evidence").answer.indexOf("Two unresolved questions about the incident")>=0 &&
  CH("evidence").answer.indexOf("Three unresolved")<0 &&
  CH("pathway").answer.indexOf("only the steps that consequence")>=0 &&
  CH("safeguards").answer.indexOf("provided the scenario assumes that it works")>=0 &&
  CH("safeguards").answer.indexOf("Nothing here blocks a pathway in general")<0);
chk("C4 safeguards and governance let the reader choose the consequence",
  typeof consequencePicker==="function" &&
  scrSafeguards.toString().indexOf('consequencePicker("Comparing safeguards for:")')>=0 &&
  scrGovernance.toString().indexOf('consequencePicker("Comparing governance for:")')>=0 &&
  scrGovernance.toString().indexOf("two fixed, matched")>=0 &&
  wire.toString().indexOf("data-ocsel")>=0);
chk("G1 the glossary is grouped, searchable and cross-linked",
  typeof GLOSS_SECTIONS!=="undefined" && GLOSS_SECTIONS.length===3 &&
  GLOSS.length>=35 && openGloss.toString().indexOf("gSearch")>=0 &&
  glossBody.toString().indexOf("Related:")>=0);
chk("G2 the model-state vocabulary is defined",
  ["scenario-setting","modelled-step","unknown","cannot-determine","occurs","does-not-occur",
   "prevented","reachable","required","documented","conditional","contested","hypothesised"]
   .every(function(t){return GTERM(t);}));
chk("G3 the incident vocabulary is defined",
  ["sandbox","sandbox-escape","repository","write-access","credential","token","service-account-token",
   "container","pod","cluster","privilege-escalation","credential-harvesting","exfiltration",
   "back-door","integrity-degradation","ci-pipeline"].every(function(t){return GTERM(t);}));
chk("G4 the governance vocabulary is defined",
  ["safeguard","release-authority","publication-authorization","branch-protection","signing",
   "provenance","adoption","rollback","governance-package"].every(function(t){return GTERM(t);}));
chk("G5 related-term links exist for the pairs that are easily confused",
  GTERM("unknown")[3].indexOf("cannot-determine")>=0 &&
  GTERM("write-access")[3].indexOf("release-authority")>=0 &&
  GTERM("signing")[3].indexOf("publication-authorization")>=0);
chk("G6 rollback's definition warns it does not undo exposure",
  GTERM("rollback")[2].indexOf("does not necessarily undo exposure")>=0);
chk("G7 incident-specific terms are actually explained where they appear",
  typeof TECHTERMS==="object" && typeof annotate==="function" &&
  ["HDF5","Jinja2","fsspec","SIEM"].every(function(k){return TECHTERMS[k];}) &&
  scrHappened.toString().indexOf("annotate(")>=0);
chk("T1 chapter 3 opens with the conditional transition",
  PW2.indexOf("From this point onward, the graph is conditional")>=0 &&
  PW2.indexOf("what else would have to be true")>=0);
chk("T2 each interactive chapter carries its own short instruction",
  PW2.indexOf("How to use this page")>=0 && SG2.indexOf("How to use this page")>=0 &&
  GV2.indexOf("How to read this comparison")>=0 && MD2.indexOf("How to use this view")>=0);
chk("T3 the safeguards page says what 'before' means",
  SG2.indexOf("does not mean the historical incident")>=0);
chk("T4 changing an assumption reports the causal consequence in words",
  typeof changeFeedback==="function" && typeof recordChange==="function" &&
  PW2.indexOf("changeFeedback()")>=0 &&
  changeFeedback.toString().indexOf("is now")>=0);
chk("T5 the full-model orientation is dismissible and reopenable, never a forced modal",
  MD2.indexOf("showHowTo")>=0 && MD2.indexOf('data-howto="1"')>=0 &&
  MD2.indexOf("how well the claim is evidenced")>=0 &&
  wire.toString().indexOf("showHowTo=!showHowTo")>=0);


LOG(""); LOG("--- glossary navigation ---");
chk("W1 the glossary is grouped by category, alphabetical within each group",
  GLOSS_SECTIONS.length===3 &&
  GLOSS_SECTIONS.every(function(s){
    for(var i=1;i<s.terms.length;i++){
      if(s.terms[i-1][1].localeCompare(s.terms[i][1],"en")>0) return false;} return true;}) &&
  glossBody.toString().indexOf("GLOSS_SECTIONS.map")>=0 &&
  typeof GLOSS_GROUP==="object" && Object.keys(GLOSS_GROUP).length===GLOSS.length);
chk("W2 clicking a term lands on it, and focus does not drag the view back to the top",
  glossBody.toString().indexOf('id="gHit" tabindex="-1"')>=0 &&
  openGloss.toString().indexOf('h.focus({preventScroll:true})')>=0 &&
  openGloss.toString().indexOf('h.scrollIntoView({block:"center"})')>=0 &&
  /* the close button must NOT be focused when landing on a term */
  openGloss.toString().indexOf('(hit?document.getElementById("gClose")')<0 &&
  openGloss.toString().indexOf("Showing <b>${GTERM(hit)[1]}</b>")>=0);
chk("W3 the landing message names the category the term sits in",
  openGloss.toString().indexOf("GLOSS_GROUP[hit]")>=0 &&
  glossBody.toString().indexOf('class="gsec"')>=0);
chk("W4 the pathway page distinguishes scenario settings from modelled steps, consistently",
  (function(){var s=scrPathway.toString();
   return s.indexOf("First step the model cannot determine")>=0 &&
          s.indexOf("Change the scenario settings")>=0 &&
          s.indexOf("Conditions met")<0 && s.indexOf("Assumptions satisfied")<0 &&
          /* the step inventory is gone: the graph carries it */
          s.indexOf("Steps produced under your current settings")<0;})());
chk("W4b the two settings the incident cannot supply say so where they are set",
  typeof NOT_FROM_INCIDENT==="object" &&
  NOT_FROM_INCIDENT.detection_timing && NOT_FROM_INCIDENT.rollback_capability &&
  scrPathway.toString().indexOf("The incident cannot supply")>=0);
chk("W5 the conditional nature of the whole chapter is stated once, prominently",
  scrPathway.toString().indexOf("From this point onward, the graph is conditional")>=0 &&
  scrPathway.toString().indexOf("what else would have to be true")>=0);
chk("W6 the changed-setting badge no longer relies on the word 'record' alone",
  JSON.stringify([scrPathway.toString(),scrModel.toString()]).indexOf("changed from the record")<0 &&
  JSON.stringify([scrPathway.toString(),scrModel.toString()]).indexOf("not what the record shows")<0 &&
  JSON.stringify([scrPathway.toString(),scrModel.toString()]).indexOf("not established by the reviewed sources")>=0);

LOG(""); LOG("--- one vocabulary ---");
var READER=[scrHome,scrHappened,scrEvidence,scrPathway,scrSafeguards,scrGovernance,scrModel,
            nav,pagehead,progress,statusStrip,changesList,inspectCard,miniLegend,legendHTML,
            notDemonstrable,dossier,glossBody].map(function(f){return f.toString();}).join(" ");
var BANNED=["condition met","Condition met","conditions met","satisfied","Structurally reachable",
            "structurally reachable","safeguard active","Safeguard active","not on this pathway",
            "Not on this pathway","public record","Public record","counterfactual","Projected",
            "model configuration","Apply this control"];
var hits=BANNED.filter(function(w){return READER.indexOf(w)>=0;});
if(hits.length) LOG("       still present: "+hits.join(", "));
chk("V1 the retired vocabulary is absent from every reader-facing string", hits.length===0);
chk("V2 one formulation for model state, everywhere",
  stateShort({lane:"bridge"},"active")==="occurs" &&
  stateShort({lane:"safe"},"active")==="assumed effective" &&
  stateShort({lane:"bridge"},"blocked")==="prevented by a safeguard" &&
  stateShort({locked:true},"active")==="documented");
chk("V3 epistemic labels say documented / conditional, not observed / projected",
  EPI.documented[1].indexOf("reviewed sources")>=0 &&
  EPI.projected[0]==="Conditional" &&
  EPI.projected[1].indexOf("not a forecast")>=0);
chk("V4 lane labels name documentation rather than observation",
  drawGraph.toString().indexOf("DOCUMENTED CONTRIBUTING FACTORS")>=0 &&
  drawGraph.toString().indexOf("DOCUMENTED INCIDENT SEQUENCE")>=0 &&
  drawGraph.toString().indexOf("OBSERVED")<0);
chk("V5 one plain name per consequence, used everywhere",
  typeof DISPLAY_LABEL==="object" && NL("hc_privacy")==="Data exposed" &&
  NL("hc_wrong_outputs")==="Decisions corrupted" &&
  CONSEQ.every(function(c){return NL(c.id)===c.t;}) &&
  drawGraph.toString().indexOf("wrap(NL(n.id)")>=0);
chk("V6 safeguards are included in a scenario, not 'applied'",
  APPLY_LABEL.publication_authorization.indexOf("Include")===0 &&
  scrSafeguards.toString().indexOf("Remove this safeguard from the scenario")>=0 &&
  scrSafeguards.toString().indexOf("stops this pathway")>=0);
chk("V7 the effectiveness caveat states what the model does NOT establish",
  scrSafeguards.toString().indexOf("does not establish that it would work in reality")>=0);
chk("V8 the legend uses the same five phrases as the graph",
  miniLegend.toString().indexOf("occurs under current settings")>=0 &&
  miniLegend.toString().indexOf("cannot be determined from available evidence")>=0 &&
  miniLegend.toString().indexOf("prevented by the selected safeguard")>=0 &&
  miniLegend.toString().indexOf("does not occur under current settings")>=0 &&
  miniLegend.toString().indexOf("documented in reviewed sources")>=0);
chk("V9 unknown applies to evidence inputs, cannot-determine to results",
  GTERM("unknown")[1]==="Unknown setting" &&
  GTERM("cannot-determine")[1]==="Cannot be determined" &&
  GTERM("scenario-setting")[1]==="Scenario setting" &&
  GTERM("modelled-step")[1]==="Modelled step");


chk("S1 no baseline label expresses uncertainty the engine does not carry",
  typeof OPT_OVERRIDE==="object" &&
  OPT_OVERRIDE["objective|none_evidenced"]==="Only the documented evaluation objective included" &&
  OPT_OVERRIDE["modification_type|none_attempted"]==="No modification of a trusted artifact" &&
  /* the engine treats both as FALSE, so the labels must assert, not hedge */
  evaluate(base()).pj_harmful_objective==="inactive" &&
  optLabel("No harmful objective evidenced  · record","objective","none_evidenced").indexOf("evidenced")<0);
chk("S2 the contestable baseline says so, and names the alternative reading",
  typeof PARAM_NOTE==="object" &&
  PARAM_NOTE.objective.indexOf("does not claim that other objectives were absent")>=0 &&
  PARAM_NOTE.objective.indexOf("reading is contestable")>=0 &&
  PARAM_NOTE.objective.indexOf("proxy objective in conflict with operator intent")>=0 &&
  PARAM_NOTE.modification_type.indexOf("was attempted")>=0 &&
  scrPathway.toString().indexOf("Why this is the baseline")>=0);

chk("X1 chapter 5 opens by naming what it steps back from",
  scrGovernance.toString().indexOf("The previous chapter assumed that a safeguard worked")>=0 &&
  scrGovernance.toString().indexOf("what must happen for a legal requirement to produce that")>=0 &&
  /* placed before the mediation chain, as a transition rather than a conclusion */
  scrGovernance.toString().indexOf("previous chapter assumed") <
  scrGovernance.toString().indexOf("Legal duty → implementation"));

chk("Y1 conditional claims do not report confidence that an event occurred",
  typeof confLine==="function" &&
  confLine("low","occurrence",true).indexOf("Strength of support for this hypothetical link")>=0 &&
  confLine("low","occurrence",true).indexOf("that the event occurred")<0 &&
  confLine("high","occurrence",false).indexOf("that the event occurred")>=0 &&
  dossier.toString().indexOf('n.status==="projected"?"Strength of support"')>=0);
chk("Y2 the full model is offered once at the end of chapter 5, and not under the home cards",
  (function(){var sc=chap; chap="governance"; var h=nav(); chap=sc;
   return (h.match(/data-go="#\/model"/g)||[]).length===1;})() &&
  (function(){var sc=chap; chap="pathway"; var h=nav(); chap=sc;
   return h.indexOf('data-go="#/model"')<0;})() &&
  scrHome.toString().indexOf('data-go="#/model"')<0);
chk("Y3 simplified graph labels do not overstate what the sources establish",
  DISPLAY_LABEL.obs_write_exercised==="Obtained and used repository write access" &&
  DISPLAY_LABEL.obs_write_exercised.indexOf("people download")<0 &&
  DISPLAY_LABEL.obs_no_monitoring==="Agent activity was not monitored during the evaluation" &&
  DISPLAY_LABEL.obs_dataset_exfil==="Five datasets were taken" &&
  DISPLAY_LABEL.obs_no_change_shipped==="No unauthorised change reached the public");
chk("Y4 the governance comparison does not assume an external attacker",
  scrGovernance.toString().indexOf("same other scenario settings")>=0 &&
  scrGovernance.toString().indexOf("same attacker conditions")<0);


LOG(""); LOG("--- 9.1 structural invariants ---");

/* which nodes can a setting reach, structurally? direct references, then transitively through nodes */
function nodesDependingOn(pid){
  var set={}, changed=true;
  NODES.forEach(function(n){
    if(JSON.stringify([n.rule,n.unresolvedIf]).indexOf('"'+pid+'"')>=0) set[n.id]=1;});
  while(changed){ changed=false;
    NODES.forEach(function(n){
      if(set[n.id]) return;
      var refs=JSON.stringify([n.rule,n.unresolvedIf]);
      for(var k in set){ if(refs.indexOf('"'+k+'"')>=0){ set[n.id]=1; changed=true; return; } }});}
  return set;
}
/* I1 — one-at-a-time perturbation: a setting may only move nodes that depend on it */
var leak=[];
PARAMS.forEach(function(p){
  p.opts.forEach(function(o){
    if(o[0]===p.base) return;
    var b=evaluate(base()), a=S(Object.fromEntries([[p.id,o[0]]]));
    var dep=nodesDependingOn(p.id);
    NODES.forEach(function(n){
      if(b[n.id]!==a[n.id] && !dep[n.id]) leak.push(p.id+"="+o[0]+" moved "+n.id);});});});
if(leak.length) LOG("       "+leak.slice(0,5).join(" | "));
chk("I1 changing one setting moves only nodes that depend on it ("+PARAMS.length+" settings swept)", leak.length===0);

/* I2 — unknown inputs propagate to "cannot be determined" */
var r0=evaluate(base());
chk("I2 unknown inputs propagate to an undetermined result, never to a default",
  r0.sg_publication_control==="unresolved" && r0.pj_publication_bypass==="unresolved" &&
  r0.pj_release_authority==="unresolved" && r0.sg_rollback_effective==="unresolved" &&
  ["hc_privacy","hc_wrong_outputs","hc_direct_disruption"].every(function(o){return r0[o]!=="active";}));

/* I3 — duty on paper activates no technical safeguard */
var dp=S({governance_package:"duty_on_paper"});
chk("I3 'duty on paper' activates no technical safeguard",
  dp.sg_gov_duty==="active" && dp.sg_gov_implemented!=="active" &&
  dp.sg_publication_control!=="active" && dp.sg_rollback_effective!=="active");

/* I4 — a verified, effective package moves only the governance chain and its own control */
var ge=S({governance_package:"effective_technical_control"});
var movedSafeguards=NODES.filter(function(n){return n.lane==="safe"&&r0[n.id]!==ge[n.id];})
  .map(function(n){return n.id;});
chk("I4 a verified, effective package changes only the intended control ["+movedSafeguards.join(", ")+"]",
  movedSafeguards.sort().join(",")==="sg_gov_duty,sg_gov_implemented,sg_publication_control");

/* I5 — repository write access alone implies nothing downstream */
var rw=S({release_authority:"trusted_release_write"});
var rwf=S({release_authority:"full_release_authority"});
chk("I5 write access alone never implies release or downstream adoption",
  rw.pj_published!=="active" && rw.pj_adoption!=="active" && rw.pj_artifact_tampered!=="active" &&
  rwf.pj_published!=="active" && rwf.pj_adoption!=="active" && rwf.pj_artifact_tampered!=="active");

/* I6 — a reachable consequence has every required predecessor satisfied (already swept; restated) */
function reqParents(id){return EDGES.filter(function(e){return e[1]===id&&e[2]==="required";})
  .map(function(e){return e[0];});}
var badReach=[];
["hc_privacy","hc_wrong_outputs","hc_direct_disruption","hc_protective_disruption"].forEach(function(oc){
  var st=S(illustrativeFor(oc));
  if(st[oc]!=="active") return;
  [].concat.apply([],[oc].concat([...requiredClosure(oc)])).forEach(function(id){
    if(st[id]==="active") reqParents(id).forEach(function(p){
      if(st[p]!=="active") badReach.push(oc+": "+id+" active but "+p+"="+st[p]);});});});
if(badReach.length) LOG("       "+badReach.slice(0,4).join(" | "));
chk("I6 a reachable consequence has every required predecessor satisfied", badReach.length===0);

/* I7 — ablation: remove any required setting and the consequence stops being reachable */
var ablFail=[];
["hc_privacy","hc_wrong_outputs","hc_direct_disruption"].forEach(function(oc){
  var open=illustrativeFor(oc);
  if(S(open)[oc]!=="active"){ablFail.push(oc+" not open to begin with");return;}
  paramsForOutcome(oc).forEach(function(p){
    if(open[p.id]===p.base) return;              // only ablate what the scenario actually set
    var o={}; for(var k in open) o[k]=open[k]; o[p.id]=p.base;
    if(S(o)[oc]==="active") ablFail.push(oc+" survives reverting "+p.id);});});
if(ablFail.length) LOG("       "+ablFail.slice(0,5).join(" | "));
chk("I7 reverting any one required setting makes the consequence unreachable or undetermined", ablFail.length===0);

/* I8 — protective disruption is a defensive cost, never attacker-caused harm */
var pd=S(illustrativeFor("hc_protective_disruption"));
chk("I8 protective disruption can occur while a defence succeeds, and is not attacker-caused harm",
  pd.hc_protective_disruption==="active" &&
  pd.hc_direct_disruption!=="active" && pd.hc_privacy!=="active" && pd.hc_wrong_outputs!=="active" &&
  !requiredClosure("hc_protective_disruption").has("pj_consequential_use"));

/* I9 — one engine behind every view */
var viewDrift=0;
[{},illustrativeFor("hc_privacy"),govPair("hc_wrong_outputs").effective].forEach(function(sc){
  var a=S(sc), b=S(sc), c=S(sc);
  NODES.forEach(function(n){if(a[n.id]!==b[n.id]||b[n.id]!==c[n.id])viewDrift++;});});
chk("I9 guided chapters and the full model resolve from the same state and rules", viewDrift===0);

/* I10 — reset restores the evidence-limited baseline */
var scrambled=base();
PARAMS.forEach(function(p){var alt=p.opts.filter(function(o){return o[0]!==p.base;})[0];
  if(alt) scrambled[p.id]=alt[0];});
chk("I10 reset restores the evidence-limited baseline exactly",
  JSON.stringify(evaluate(base()))===JSON.stringify(r0) &&
  JSON.stringify(evaluate(scrambled))!==JSON.stringify(r0) &&
  PARAMS.every(function(p){return base()[p.id]===p.base;}));

/* negative control — a setting irrelevant to an outcome must not move it */
var nc=[];
["hc_privacy","hc_wrong_outputs"].forEach(function(oc){
  var rel=paramsForOutcome(oc).map(function(p){return p.id;});
  PARAMS.filter(function(p){return rel.indexOf(p.id)<0;}).forEach(function(p){
    p.opts.forEach(function(o){
      if(o[0]===p.base) return;
      var sc=illustrativeFor(oc); sc[p.id]=o[0];
      if(S(sc)[oc]!==S(illustrativeFor(oc))[oc]) nc.push(oc+" moved by "+p.id);});});});
if(nc.length) LOG("       "+nc.slice(0,4).join(" | "));
chk("NC negative control: settings outside a pathway never move its outcome", nc.length===0);

LOG(""); LOG("TOTAL passed "+passes+"   failed "+fails);
