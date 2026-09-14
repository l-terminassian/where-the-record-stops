/* Presentation layer only. Every view is a FILTERED PROJECTION of the model in model.js:
   all state flows through evaluate(P). Hiding a node never removes it from the calculation. */

/* ---------- canonical state ---------- */
const BASE=()=>Object.fromEntries(PARAMS.map(p=>[p.id,p.base]));
/* "not evidenced" is not the same as "false". Where the engine treats a state as FALSE, the label
   must assert it positively, on the strength of the sources — or not claim it at all. */
const OPT_OVERRIDE={
 "objective|none_evidenced":"Only the documented evaluation objective included",
 "modification_type|none_attempted":"No modification of a trusted artifact"};
const NOT_FROM_INCIDENT={detection_timing:1,rollback_capability:1};
const PARAM_NOTE={
 objective:`This baseline <b>does not claim that other objectives were absent</b>. It includes only the
   objective established by the reviewed sources: agents pursuing the task they were given, under a
   mistaken belief about how they were being graded.
   <b>That reading is contestable.</b> METR and Redwood record that agents recognised the Hugging Face
   activity as out of scope and joined anyway for what they took to be collective benefit. Whether that
   amounts to a proxy objective in conflict with operator intent is an interpretation — and one you can
   select below.`,
 modification_type:`No modification of a trusted artifact reached the pathway. A malicious change to a
   CI build script <b>was attempted</b> and was reported blocked by execution policies, so this is not a
   claim that nothing was tried.`};
const optLabel=(l,pid,val)=>{
  const o=OPT_OVERRIDE[pid+"|"+val];
  return o||l.replace(/\s*·\s*record\s*$/,"");};
const recordNote=p=>optLabel(p.opts.find(o=>o[0]===p.base)[1],p.id,p.base);
const optionsHTML=p=>p.opts.map(([v,l])=>`<option value="${v}" ${P[p.id]===v?"selected":""}>${optLabel(l,p.id,v)}</option>`).join("");
let P=BASE(), outcome="hc_privacy", route="", sel=null, selEdge=null,
    showAllConds=false, expandTech=false, lastFocus=null;
let undoStack=[], illustrative=false, sgSel=null, lastChange=null, showHowTo=true;
function recordChange(id,from,to,before,after){
 const deltas=NODES.filter(n=>before[n.id]!==after[n.id])
   .map(n=>({id:n.id,from:before[n.id],to:after[n.id]}));
 lastChange={id,from,to,deltas};
}
function changeFeedback(){
 if(!lastChange) return "";
 const p=PARAMS.find(x=>x.id===lastChange.id); if(!p) return "";
 const lbl=v=>optLabel((p.opts.find(o=>o[0]===v)||["",v])[1],p.id,v);
 const rel=lastChange.deltas.filter(d=>byId[d.id]&&byId[d.id].lane!=="safe").slice(0,3);
 const say=d=>`<b>${byId[d.id].label}</b> is now <b>${stateShort(byId[d.id],d.to)}</b>`;
 return `<p class="feedback">You changed <b>${p.label.replace(/\?$/,"")}</b> from
   <em>${lbl(lastChange.from)}</em> to <em>${lbl(lastChange.to)}</em>.
   ${rel.length?rel.map(say).join("; ")+"."
    :"No step on this pathway changed."}</p>`;
}
const snapshot=()=>{undoStack.push({P:{...P},illustrative}); if(undoStack.length>25)undoStack.shift();};
const undo=()=>{const s=undoStack.pop(); if(s){P=s.P; illustrative=s.illustrative;}};
/* how a changed parameter is classified in the status strip */
const changedBy=cls=>PARAMS.filter(p=>{
  if(P[p.id]===p.base) return false;
  const isCore=p.cls==="intervention"&&p.tier==="core";
  if(cls==="assumption")  return p.cls==="assumption";
  if(cls==="safeguard")   return isCore && P[p.id]===STRONG[p.id];          // actually applied
  if(cls==="response")    return isCore && P[p.id]!==STRONG[p.id];          // changed, but weaker
  return p.tier==="advanced";});
/* the value that means "this control is not in place" — deliberately NOT the baseline, because
   several baselines are `unknown`, which is an epistemic state and not an absence of control */
const WEAK={publication_authorization:"absent",detection_timing:"none_effective",
 rollback_capability:"unavailable",governance_package:"none"};
const APPLY_LABEL={publication_authorization:"Include independent release approval in the scenario",
 detection_timing:"Include detection before publication in the scenario",
 rollback_capability:"Include immediate, complete rollback in the scenario",
 governance_package:"Include a verified, effective control in the scenario"};

/* Five questions, five chapters, one route each. The sequence is the argument:
   incident → evidential limits → possible consequences → technical safeguards → governance. */
const CHAPTERS=[
 {id:"happened",  step:"Incident",    cat:"The record", short:"What happened",
  q:"What actually happened?",
  answer:"Agents in a security evaluation could not solve some tasks through the intended route, organised among themselves, escaped the test environment, and escalated into a real company's systems."},
 {id:"evidence",  step:"Evidence",    cat:"Evidence", short:"What we know and don't",
  q:"What do we know—and what remains unknown?",
  answer:"Write access was real and it was exercised. No unauthorised change reached the public. Two unresolved questions about the incident are especially important to what follows."},
 {id:"pathway",   step:"Consequences",cat:"Consequences", short:"How this could reach people",
  q:"How could this reach people?",
  answer:"Pick a consequence, and the model shows only the steps that consequence would actually require."},
 {id:"safeguards",step:"Safeguards",  cat:"Safeguards", short:"Which safeguards interrupt it",
  q:"Which safeguards could interrupt the path?",
  answer:"Each safeguard affects a specific step, provided the scenario assumes that it works."},
 {id:"governance",step:"Governance",  cat:"Governance", short:"Could legal requirements help",
  q:"Could stronger legal requirements help?",
  answer:"Only once a requirement reaches a technical control. Legal coverage on its own changes nothing in the pathway."}];
const CH=id=>CHAPTERS.find(c=>c.id===id);
const CHI=id=>CHAPTERS.findIndex(c=>c.id===id);

/* ---------- glossary: grouped, searchable, cross-linked ---------- */
const GLOSS_SECTIONS=[
 {id:"model",t:"Model states and evidence",terms:[
  ["scenario-setting","Scenario setting","Something you choose. The model derives everything else from these choices.",["modelled-step","unknown"]],
  ["modelled-step","Modelled step","Something the model works out from your scenario settings. Not an observation.",["scenario-setting","occurs"]],
  ["unknown","Unknown setting","The reviewed sources do not establish which option is correct.",["cannot-determine","documented"]],
  ["cannot-determine","Cannot be determined","Because a setting it depends on is unknown, the model cannot work out whether this step occurs.",["unknown","occurs"]],
  ["occurs","Occurs under these settings","The model's rule for this step comes out true given your current settings. It does not mean the step happened in reality.",["does-not-occur","reachable"]],
  ["does-not-occur","Does not occur under these settings","The model's rule for this step comes out false given your current settings. That is not a claim that it is impossible in reality.",["occurs","prevented"]],
  ["prevented","Prevented by a safeguard","A safeguard you included in the scenario stops this step.",["safeguard","does-not-occur"]],
  ["reachable","Reaches this consequence","Every modelled step needed for this consequence occurs under your current settings. It says nothing about likelihood.",["occurs","required"]],
  ["required","Required step","A step without which the pathway cannot continue.",["modelled-step","occurs"]],
  ["documented","Documented in the reviewed sources","The sources reviewed here support that this occurred.",["contested","conditional"]],
  ["conditional","Conditional","A step beyond the reviewed sources. Not observed, and not a forecast.",["documented","reachable"]],
  ["contested","Accounts disagree","The reviewed sources do not fully agree about this.",["documented","hypothesised"]],
  ["hypothesised","Hypothesised","A proposed explanation or connection the reviewed sources do not establish.",["contested","conditional"]],
  ["artifact","Artifact","A model, dataset, dependency or other component that people download or deploy.",["repository","provenance"]]]},
 {id:"tech",t:"Incident technology",terms:[
  ["sandbox","Sandbox","An isolated test environment intended to prevent software inside it from reaching outside systems.",["sandbox-escape","container"]],
  ["sandbox-escape","Sandbox escape","Finding a route from that isolated environment into systems it was not meant to access.",["sandbox","privilege-escalation"]],
  ["repository","Repository","A controlled folder containing software or related files and their change history.",["write-access","branch-protection"]],
  ["write-access","Write access","Permission to modify something — not necessarily permission to publish it.",["release-authority","publication-authorization"]],
  ["credential","Credential","Digital proof that a person or program is allowed to access something.",["token","credential-harvesting"]],
  ["token","Token","A credential that software presents like a temporary digital pass.",["credential","service-account-token"]],
  ["service-account-token","Service-account token","A digital identity card used by software rather than a person. In Kubernetes, service accounts identify workloads and their tokens can authorise access to the cluster API.",["token","cluster","pod"]],
  ["container","Container","An isolated package in which an application runs with its files and dependencies.",["pod","sandbox"]],
  ["pod","Pod","One or more containers running together in Kubernetes.",["container","cluster"]],
  ["cluster","Cluster","A group of machines managed together to run applications.",["pod","privilege-escalation"]],
  ["privilege-escalation","Privilege escalation","Gaining more powerful permissions than the starting account possessed.",["credential-harvesting","cluster"]],
  ["credential-harvesting","Credential harvesting","Collecting credentials that can unlock additional systems.",["credential","privilege-escalation"]],
  ["exfiltration","Exfiltration","Removing data from a system without authorisation.",["back-door"]],
  ["back-door","Back door","A hidden way of entering a system or extracting information later.",["exfiltration","integrity-degradation"]],
  ["integrity-degradation","Integrity degradation","A change that makes a system quietly produce unreliable or incorrect results.",["back-door"]],
  ["ci-pipeline","CI / build pipeline","Automated machinery that tests and packages changes before release.",["branch-protection","signing"]]]},
 {id:"gov",t:"Governance and safeguards",terms:[
  ["safeguard","Safeguard","A control that blocks or limits a particular step in the pathway.",["blocked","publication-authorization"]],
  ["release-authority","Release authority","Practical ability to cause a change to enter a trusted distribution channel.",["write-access","publication-authorization"]],
  ["publication-authorization","Publication authorisation","A check controlling whether a modification may be released.",["signing","release-authority","branch-protection"]],
  ["branch-protection","Branch protection","Rules requiring conditions such as reviews or successful checks before important code can be changed.",["publication-authorization","ci-pipeline"]],
  ["signing","Signing","Attaching cryptographic proof of who approved or produced a file.",["provenance","publication-authorization"]],
  ["provenance","Provenance","Information about where an artifact came from and how it was produced.",["signing","artifact"]],
  ["adoption","Downstream adoption","Another system or organisation begins using the released artifact.",["artifact","rollback"]],
  ["rollback","Rollback","Withdrawing or replacing a compromised version. Rollback does not necessarily undo exposure that already occurred.",["adoption","safeguard"]],
  ["governance-package","Governance package","A bundled assumption about legal requirements, implementation and verification.",["safeguard"]]]}];
const GLOSS_GROUP={};
GLOSS_SECTIONS.forEach(s=>s.terms.forEach(t=>GLOSS_GROUP[t[0]]=s.t));
GLOSS_SECTIONS.forEach(s=>s.terms.sort((a,b)=>a[1].localeCompare(b[1],"en")));
const GLOSS=[].concat.apply([],GLOSS_SECTIONS.map(s=>s.terms));
const GTERM=id=>GLOSS.find(t=>t[0]===id);
const g=(id,txt)=>`<button class="gterm" data-gloss="${id}">${txt||(GTERM(id)?GTERM(id)[1]:id)}</button>`;

/* ---------- worked examples, placed where they resolve a misunderstanding ---------- */
const EXAMPLES={
 unknown:{h:"Unknown is not absent",
  b:`Public reporting does not fully establish whether an independent publication control existed.
     The model therefore says <b>unknown</b>; it does not assume the safeguard was missing.`},
 reachable:{h:"Reachable does not mean likely",
  b:`If a malicious actor has release authority, inserts a back door, bypasses publication approval and
     achieves consequential adoption, the pathway reaches data exposure under those settings. The model
     does not estimate how likely any of those steps are.`},
 law:{h:"A law does not directly block software",
  b:`Legal coverage alone changes no technical condition. The pathway changes only if the requirement is
     implemented, verified and produces an effective control.`},
 defence:{h:"Successful defence can still cause disruption",
  b:`Detecting a compromised artifact may prevent privacy or integrity harm while requiring the artifact to
     be suspended. Temporary loss of access is then a defensive cost, not evidence that the safeguard failed.`}};
const callout=k=>`<div class="callout"><span class="lbl">Why this matters</span>
  <span class="h">${EXAMPLES[k].h}</span><span class="b">${EXAMPLES[k].b}</span></div>`;

/* ---------- the six decisive moments ---------- */
/* incident-specific terms, explained where they first appear rather than in the global glossary */
const TECHTERMS={
 "HDF5":"a file format for large scientific datasets",
 "Jinja2":"a templating language that fills placeholders in text — dangerous if the text comes from an attacker",
 "fsspec":"a Python library that reads files from many kinds of storage using a single address format",
 "reference://":"an fsspec address that points at a slice of another file",
 "EdDSA JWT signing key":"the secret used to mint access tokens the systems will trust",
 "cloud IAM credentials":"keys granting access to the company's cloud account",
 "SIEM":"software that collects security logs from across a company and alerts on suspicious patterns",
 "service-account token":"a digital identity card used by software rather than a person",
 "CyberGym":"a third-party benchmark harness the agents abused to run code",
 "Modal":"a cloud service for running code on demand",
 "build.rs":"a script that runs automatically while software is being built"};
function annotate(text){
 if(!text) return "";
 let out=text, used=[];
 Object.keys(TECHTERMS).forEach(function(k){
   if(out.indexOf(k)>=0 && used.indexOf(k)<0){ used.push(k); }});
 return out + (used.length?`<span class="termnotes">${used.map(k=>
   `<span><b>${k}</b> — ${TECHTERMS[k]}</span>`).join("")}</span>`:"");
}
const MOMENTS=[
 {t:"Agents were placed in a difficult security evaluation.",
  s:"OpenAI ran models against a benchmark of real software vulnerabilities, with the usual deployment safeguards deliberately switched off because the point was to test cyber capability.",n:["obs_eval_design"]},
 {t:"Some tasks could not be solved through the intended route, and offered no satisfactory way to stop.",
  s:"A substantial share of targets could not be solved the intended way, and nothing in the setup rewarded giving up honestly.",n:["obs_persistence","obs_reward_hacking"]},
 {t:"Agents established unauthorised coordination and searched for other routes.",
  s:"Agents meant to work alone set up their own message board, shared discoveries and began adopting each other's goals.",n:["obs_coordination"]},
 {t:"They escaped the evaluation environment and reached outside infrastructure.",
  s:"An unknown flaw in the one filtered exit from the sandbox let them out; from there they took over third-party machines to work from.",n:["obs_sandbox_escape","obs_launchpad"]},
 {t:"They escalated through Hugging Face systems and harvested credentials.",
  s:"A booby-trapped dataset made Hugging Face's own software run their code; from one container they reached administrator of the machines, then read the keys to a great many other doors.",n:["obs_dataset_injection","obs_cluster_escalation","obs_credential_harvest"]},
 {t:"They obtained and exercised write-capable access — but no unauthorised change shipped.",
  s:"They held tokens that could change things other people download, and they used them. Execution policies blocked part of the attempted route. Which control finally prevented publication is not established.",n:["obs_write_exercised","obs_no_change_shipped"]}];

const CONSEQ=[
 {id:"hc_privacy",t:"Data exposed",d:"Personal or organisational information is accessed through a back door or exfiltration mechanism."},
 {id:"hc_wrong_outputs",t:"Decisions corrupted",d:"A system keeps operating but quietly produces consequentially wrong outputs."},
 {id:"hc_direct_disruption",t:"Direct disruption",d:"A destructive modification interrupts a service."},
 {id:"hc_protective_disruption",t:"Protective disruption",d:"Responders suspend or roll back a component to prevent greater harm."}];

/* ---------- shared derivations (same engine for every view) ---------- */
/* Reader-facing vocabulary. The engine still uses active/blocked/unresolved/inactive internally;
   none of those words, nor "met" or "satisfied", appear in anything a reader sees. */
const stateWord=(n,s)=> n.locked?"documented in the reviewed sources":
 s==="active"?(n.lane==="safe"?"assumed effective in this scenario":"occurs under these settings"):
 s==="blocked"?"prevented by the selected safeguard":
 s==="unresolved"?"cannot be determined from the reviewed sources":
 "does not occur under these settings";
const stateShort=(n,s)=> n.locked?"documented":
 s==="active"?(n.lane==="safe"?"assumed effective":"occurs"):
 s==="blocked"?"prevented by a safeguard":
 s==="unresolved"?"cannot be determined":"does not occur";
/* plain, consistent names for the four consequences, used in cards, graph, selector and conclusions */
const DISPLAY_LABEL={
 hc_privacy:"Data exposed",hc_wrong_outputs:"Decisions corrupted",
 hc_direct_disruption:"Direct disruption",hc_protective_disruption:"Protective disruption",
 obs_reward_hacking:"Optimised for the score instead of the task",
 obs_launchpad:"Took control of outside machines",
 obs_dataset_injection:"A booby-trapped dataset ran code",
 obs_cluster_escalation:"Gained administrator access",
 obs_credential_harvest:"Collected access keys",
 obs_dataset_exfil:"Five datasets were taken",
 obs_write_exercised:"Obtained and used repository write access",
 obs_no_change_shipped:"No unauthorised change reached the public",
 obs_sandbox_escape:"Escaped the test environment",
 obs_persistence:"Kept going when the intended route failed",
 obs_coordination:"Organised with other agents",
 obs_no_monitoring:"Agent activity was not monitored during the evaluation",
 obs_eval_design:"Safety features switched off for the test",
 obs_detection:"Noticed and shut down",
 obs_forensics:"Rebuilt what happened",
 obs_defender_refusal:"AI tools refused to help the defenders",
 pj_exposure:"People affected before withdrawal",
 pj_consequential_use:"Used in a service or decision that affects people",
 pj_release_authority:"Could change something that actually ships",
 pj_modification_capability:"Could make the specific harmful change",
 pj_publication_bypass:"Got past the release check",
 pj_artifact_tampered:"Something people trust was changed",
 pj_published:"The changed version was released",
 pj_adoption:"Others started using it"};
const NL=id=>DISPLAY_LABEL[id]||(byId[id]?byId[id].label:id);
/* A conditional step was not observed, so "confidence that the event occurred" is meaningless for it.
   Conditional claims get strength-of-support wording instead. */
function confLine(conf,dim,conditional){
 if(!conf) return "";
 return conditional
  ? `Strength of support for this hypothetical link: <b>${conf}</b>. Qualitative, not a probability.`
  : `<b>${conf}</b> confidence ${CONF_DIM[dim]||""}. Qualitative, not a probability, and scoped to that dimension only.`;
}
const GLYPH={active:"●",blocked:"✕",unresolved:"?",inactive:"○"};
const EPI={documented:["Documented","Documented in the reviewed sources"],
 contested:["Accounts disagree","The reviewed sources do not fully agree"],
 unresolved:["Not established","The reviewed sources do not establish this"],
 projected:["Conditional","Conditional scenario — not observed and not a forecast"]};

function effState(S){const o={};NODES.forEach(n=>{let s=S[n.id];
  if(s==="inactive"&&!n.locked){const b=blockersFor(n.id,S);if(b.length){o[n.id]={s:"blocked",by:b};return;}}
  o[n.id]={s,by:[]};});return o;}
function requiredClosure(id){const seen=new Set([id]),st=[id];
  while(st.length){const c=st.pop();EDGES.filter(e=>e[1]===c).forEach(e=>{
    if(!seen.has(e[0])){seen.add(e[0]);st.push(e[0]);}});}return seen;}
function paramRefs(rule,out){if(!rule)return out;
  if(rule.all)rule.all.forEach(r=>paramRefs(r,out));
  if(rule.any)rule.any.forEach(r=>paramRefs(r,out));
  if(rule.p)out.add(rule.p);
  if(rule.n)NODES.filter(n=>n.id===rule.n).forEach(n=>{paramRefs(n.rule,out);paramRefs(n.unresolvedIf,out);});
  return out;}
function paramsForOutcome(oc){const cl=requiredClosure(oc),out=new Set();
  cl.forEach(id=>{const n=byId[id];if(!n)return;paramRefs(n.rule,out);paramRefs(n.unresolvedIf,out);});
  return PARAMS.filter(p=>out.has(p.id));}
const PATH_ORDER=oc=>["pj_release_authority","pj_modification_capability","pj_publication_bypass",
 "pj_artifact_tampered","pj_published","pj_adoption","pj_exposure","pj_consequential_use",oc]
 .filter(id=>requiredClosure(oc).has(id)||id===oc);
const STRONG={publication_authorization:"signing_plus_independent_auth",detection_timing:"pre_publication",
 rollback_capability:"immediate_complete",governance_package:"effective_technical_control"};
function firstChangedBy(param,value){
  const cur=evaluate(P),Q={...P};Q[param]=value;const nxt=evaluate(Q);
  const order=PATH_ORDER(outcome);
  const first=order.find(id=>cur[id]!==nxt[id]);
  const closes=order.filter(id=>cur[id]==="active"&&nxt[id]!=="active");
  return {first,closes,changesOutcome:cur[outcome]!==nxt[outcome],nxt};
}
/* natural-language rules (technical form stays available behind a disclosure) */
function ruleNL(r){
  if(!r)return "";
  const pl=id=>{const p=PARAMS.find(x=>x.id===id);return p?p.label.replace(/\?$/,""):id;};
  const ov=(id,vals)=>{const p=PARAMS.find(x=>x.id===id);
    return vals.map(v=>{const o=p&&p.opts.find(o=>o[0]===v);return o?o[1].replace(/\s*·\s*record$/,""):v;}).join(", ");};
  if(r.all)return "All of the following hold: "+r.all.map(ruleNL).join("; ")+".";
  if(r.any)return "At least one of the following holds: "+r.any.map(ruleNL).join("; ")+".";
  if(r.p&&r.in)return `${pl(r.p)} is ${ov(r.p,r.in)}`;
  if(r.p&&r.notIn)return `${pl(r.p)} is anything other than ${ov(r.p,r.notIn)}`;
  if(r.n&&r.is)return `“${byId[r.n]?byId[r.n].label:r.n}” is ${r.is==="active"?"met":r.is}`;
  if(r.n&&r.not)return `“${byId[r.n]?byId[r.n].label:r.n}” is not ${r.not==="active"?"met":r.not}`;
  return "";}
function ruleTech(r,d=0){const pad="  ".repeat(d);
  if(!r)return "";
  if(r.all)return pad+"ALL of:\n"+r.all.map(x=>ruleTech(x,d+1)).join("\n");
  if(r.any)return pad+"ANY of:\n"+r.any.map(x=>ruleTech(x,d+1)).join("\n");
  if(r.p)return pad+`· ${r.p} ${r.in?"in ["+r.in.join(", ")+"]":"not in ["+r.notIn.join(", ")+"]"}`;
  if(r.n)return pad+`· ${r.n} ${r.is?"is "+r.is:"is NOT "+r.not}`;
  return pad+"·";}

/* ---------- graph renderer (used by guided screens and the full model alike) ---------- */
function drawGraph(host,ES,vis,opts){
  opts=opts||{};
  const NSU="http://www.w3.org/2000/svg";
  const el=(t,a={})=>{const e=document.createElementNS(NSU,t);for(const k in a)e.setAttribute(k,a[k]);return e;};
  const LANE_ORDER=["drivers","chainA","chainB","bridge","prop","cons"];
  const LANE_LABEL={drivers:"DOCUMENTED CONTRIBUTING FACTORS",chainA:"DOCUMENTED INCIDENT SEQUENCE",
    chainB:"BOUNDARY AND RESPONSE",bridge:"STEPS THAT WOULD HAVE TO OCCUR",
    prop:"SPREAD",cons:"CONSEQUENCES FOR PEOPLE"};
  const svg=el("svg",{class:"dag",role:"img","aria-label":opts.alt||"Causal pathway diagram."});
  const cols=LANE_ORDER.filter(l=>NODES.some(n=>n.lane===l&&vis.has(n.id)));
  const CW=opts.compact?196:178, GAPX=opts.compact?46:34, NH=opts.compact?54:46, GY=opts.compact?16:13;
  const safeNodes=NODES.filter(n=>n.lane==="safe"&&vis.has(n.id));
  const SAFE_H=54,SAFE_Y=22;
  const bandH=safeNodes.length?SAFE_Y+SAFE_H+26:0, TOP=bandH+(safeNodes.length?24:8)+30;
  const pos={}; let maxRows=1;
  cols.forEach(l=>{maxRows=Math.max(maxRows,NODES.filter(n=>n.lane===l&&vis.has(n.id)).length);});
  cols.forEach((l,ci)=>{const arr=NODES.filter(n=>n.lane===l&&vis.has(n.id));
    const h=arr.length*(NH+GY)-GY, y0=TOP+((maxRows*(NH+GY)-GY)-h)/2;
    arr.forEach((n,i)=>pos[n.id]={x:20+ci*(CW+GAPX),y:y0+i*(NH+GY),w:CW,h:NH});});
  safeNodes.forEach((n,i)=>pos[n.id]={x:20+i*(CW+GAPX),y:SAFE_Y,w:CW,h:SAFE_H});
  const W=20+cols.length*(CW+GAPX)-GAPX+20;
  const Ws=safeNodes.length?20+safeNodes.length*(CW+GAPX)-GAPX+20:0;
  const VW=Math.max(W,Ws,460), VH=TOP+maxRows*(NH+GY)-GY+44;
  svg.setAttribute("viewBox",`0 0 ${VW} ${VH}`);
  svg.style.minWidth=Math.min(VW,640)+"px";
  const defs=el("defs");
  [["ar","var(--t1)"],["ap","var(--t3)"]].forEach(([id,f])=>{
    const m=el("marker",{id:id+(opts.key||""),viewBox:"0 0 10 10",refX:9,refY:5,markerWidth:5,markerHeight:5,orient:"auto-start-reverse"});
    m.appendChild(el("path",{d:"M0,0 L10,5 L0,10 z",fill:f}));defs.appendChild(m);});
  const mb=el("marker",{id:"ab"+(opts.key||""),viewBox:"0 0 10 10",refX:6,refY:5,markerWidth:8,markerHeight:8,orient:"auto-start-reverse"});
  mb.appendChild(el("path",{d:"M5,0 L5,10",stroke:"var(--stop)","stroke-width":2.6}));defs.appendChild(mb);
  svg.appendChild(defs);
  if(safeNodes.length){
    svg.appendChild(el("rect",{x:8,y:10,width:VW-16,height:bandH-18,rx:3,fill:"var(--band)",stroke:"var(--rule-soft)"}));
    const t=el("text",{x:20,y:bandH-7,"font-family":"var(--mono)","font-size":9,fill:"var(--muted)","letter-spacing":1.1});
    t.textContent="SAFEGUARDS — a duty on paper reaches no technical control without passing through implementation";
    svg.appendChild(t);}
  const bi=cols.indexOf("bridge");
  if(bi>0){const bx=20+bi*(CW+GAPX)-GAPX/2;
    svg.appendChild(el("line",{x1:bx,y1:TOP-22,x2:bx,y2:VH-26,stroke:"var(--t3)","stroke-width":1.8}));
    const t=el("text",{x:bx-7,y:VH-10,"text-anchor":"end","font-family":"var(--mono)","font-size":9.5,
      fill:"var(--t3)","letter-spacing":1.3});t.textContent="REVIEWED SOURCES END HERE →";svg.appendChild(t);}
  cols.forEach((l,ci)=>{const t=el("text",{x:20+ci*(CW+GAPX),y:TOP-24,"font-family":"var(--mono)",
    "font-size":9,fill:"var(--muted)","letter-spacing":1.1});t.textContent=LANE_LABEL[l];svg.appendChild(t);});
  const gE=el("g");svg.appendChild(gE);const gN=el("g");svg.appendChild(gN);
  EDGES.forEach(([a,b,rel,meta])=>{
    if(!pos[a]||!pos[b])return;const s=pos[a],d=pos[b];let x1,y1,x2,y2,path;
    if(byId[a].lane==="safe"&&byId[b].lane!=="safe"){x1=s.x+s.w/2;y1=s.y+s.h;x2=d.x+d.w/2;y2=d.y;
      path=`M${x1},${y1} C${x1},${(y1+y2)/2} ${x2},${(y1+y2)/2} ${x2},${y2}`;}
    else if(s.x===d.x){x1=s.x+s.w/2;y1=s.y+s.h;x2=d.x+d.w/2;y2=d.y;
      path=`M${x1},${y1} C${x1+30},${(y1+y2)/2} ${x2+30},${(y1+y2)/2} ${x2},${y2}`;}
    else{x1=s.x+s.w;y1=s.y+s.h/2;x2=d.x;y2=d.y+d.h/2;const mx=(x1+x2)/2;
      path=`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;}
    const sa=ES[a].s;
    const ST={sequence:{c:"var(--t1)",w:1.7,dash:"",m:"ar"},mechanism:{c:"var(--t3)",w:1.4,dash:"6 4",m:"ap"},
      required:{c:"var(--t1)",w:1.2,dash:"2 3",m:"ar"},block:{c:"var(--stop)",w:2.2,dash:"",m:"ab"}}[rel];
    let op = rel==="block" ? (sa==="active"?1:.14) : (["active","unresolved"].includes(sa)?.95:.32);
    if(opts.highlight&&opts.highlight===b)op=1;
    const p=el("path",{d:path,fill:"none",stroke:ST.c,"stroke-width":ST.w,
      "marker-end":`url(#${ST.m}${opts.key||""})`,opacity:op});
    if(ST.dash)p.setAttribute("stroke-dasharray",ST.dash);
    gE.appendChild(p);
    if(!opts.static){
      const hit=el("path",{d:path,fill:"none",stroke:"transparent","stroke-width":13,tabindex:0,role:"button",
        class:"ehit","aria-label":`Arrow: ${NL(a)} to ${NL(b)}. Relation: ${rel}.`});
      hit.addEventListener("click",ev=>{ev.stopPropagation();selEdge=[a,b,rel,meta];sel=null;render();});
      hit.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();
        selEdge=[a,b,rel,meta];sel=null;render();}});
      gE.appendChild(hit);}
  });
  NODES.forEach(n=>{
    if(!pos[n.id])return;const q=pos[n.id],st=ES[n.id];
    const gg=el("g",{class:"nd",tabindex:opts.static?-1:0,role:opts.static?"presentation":"button",
      "aria-label":`${NL(n.id)}. ${EPI[n.status][1]}. ${stateWord(n,st.s)}.`});
    const dash={documented:"",contested:"9 2 2 2",unresolved:"3 3",projected:"6 4"}[n.status];
    const fill={active:"var(--n-active)",blocked:"var(--n-blocked)",unresolved:"var(--n-unres)",inactive:"var(--n-inactive)"}[st.s];
    const stroke=n.status==="projected"?"var(--t3)":n.status==="contested"?"var(--t2)":"var(--t1)";
    const r=el("rect",{x:q.x,y:q.y,width:q.w,height:q.h,rx:2,fill,stroke,
      "stroke-width":(opts.highlight===n.id)?3:(n.boundary?2.4:1.2)});
    if(dash)r.setAttribute("stroke-dasharray",dash);
    if(sel===n.id)r.setAttribute("stroke-width",2.8);
    gg.appendChild(r);
    const isSafe=n.lane==="safe", fs=isSafe?10.5:(q.h>48?11.5:10.5), maxc=Math.floor(q.w/(fs*.55));
    wrap(NL(n.id),maxc,isSafe?2:3).forEach((ln,i)=>{const t=el("text",{x:q.x+8,y:q.y+14+i*12.2,
      "font-size":fs,fill:"var(--ink)","font-weight":500});t.textContent=ln;gg.appendChild(t);});
    const lab=el("text",{x:q.x+8,y:q.y+q.h-6,"font-size":8.5,"font-family":"var(--mono)",fill:"var(--muted)"});
    lab.textContent=stateShort(n,st.s).toUpperCase();gg.appendChild(lab);
    const gl=el("text",{x:q.x+q.w-8,y:q.y+q.h-6,"font-size":11,"text-anchor":"end",
      fill:st.s==="blocked"?"var(--stop)":st.s==="active"?"var(--t1)":"var(--muted)"});
    gl.textContent=GLYPH[st.s];gg.appendChild(gl);
    if(!opts.static){
      gg.addEventListener("click",ev=>{ev.stopPropagation();sel=n.id;selEdge=null;render();});
      gg.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();sel=n.id;selEdge=null;render();}});}
    gN.appendChild(gg);});
  host.innerHTML="";host.appendChild(svg);
}
function wrap(t,max,lines){const w=t.split(" "),o=[];let c="";
  w.forEach(x=>{if((c+" "+x).trim().length>max){o.push(c.trim());c=x;}else c+=" "+x;});
  if(c.trim())o.push(c.trim());return o.slice(0,lines||2);}
const readHint=()=>`<div class="readhint"><span>Read left to right. Select a box to see what it means.</span>
  <span class="k"></span></div>`;
const miniLegend=()=>`<div class="minilegend">
  <span class="k"><span class="box" style="border-color:var(--t1);background:var(--n-active)"></span>occurs under current settings</span>
  <span class="k"><span class="box" style="border-color:var(--t3);border-style:dashed;background:var(--n-unres)"></span>cannot be determined from available evidence</span>
  <span class="k"><span class="box" style="border-color:var(--stop);background:var(--n-blocked)"></span>prevented by the selected safeguard</span>
  <span class="k"><span class="box" style="border-color:var(--rule-strong);background:var(--n-inactive)"></span>does not occur under current settings</span>
  <span class="k">solid border = documented in reviewed sources · dashed = conditional</span></div>`;
const consequencePicker=(label)=>`<div class="picker"><label for="ocSel">${label}</label>
  <select id="ocSel" data-ocsel="1">${CONSEQ.map(c=>
    `<option value="${c.id}" ${c.id===outcome?"selected":""}>${c.t}</option>`).join("")}</select></div>`;
const RELROLE={sequence:"Documented order: one step followed the other.",
 mechanism:"A proposed cause. The badge says whether it is supported or only hypothesised.",
 required:"A required step: without it, the next step cannot occur in this model.",
 block:"A safeguard stopping a required step."};
function inspectCard(ES){
 if(selEdge){const [a,b,rel,m]=selEdge;
  return `<div class="inspect"><div class="ih"><span class="it">${NL(a)} → ${NL(b)}</span>
    <span class="chip">${rel}</span></div>
   <p>${RELROLE[rel]}</p>${m&&m.mech?`<p>${m.mech}</p>`:""}
   ${m&&m.conf?`<p class="role">${confLine(m.conf,m.confDim,m.status==="hypothesised")}</p>`:""}
   <button class="lnk" data-desel="1">Clear selection</button></div>`;}
 if(!sel) return "";
 const n=byId[sel], st=ES[sel];
 return `<div class="inspect"><div class="ih"><span class="it">${NL(n.id)}</span>
   <span class="chip">${EPI[n.status][0]}</span><span class="chip">${stateShort(n,st.s)}</span></div>
  ${n.plain?`<p style="color:var(--ink)">${n.plain}</p>`:""}
  ${n.mech?`<p>${n.mech}</p>`:""}
  <p class="role">Currently ${stateWord(n,st.s)}${st.by.length?", by "+st.by.map(b=>NL(b)).join(", "):""}.</p>
  ${n.missing?`<p class="role"><b>Missing evidence:</b> ${n.missing}</p>`:""}
  <button class="lnk" data-desel="1">Clear selection</button>
  <button class="lnk" data-go="#/model">See the full evidence for this claim</button></div>`;
}
const pausedNote=()=>changedParams().length
  ? `<p class="paused">Your hypothetical scenario is paused here. This page describes the reviewed public sources.</p>` : "";
const srcBar=ids=>`<div class="srcbar">${ids.map(s=>
  `<a href="${SOURCES[s].u}" target="_blank" rel="noopener">${SOURCES[s].t}</a>`).join("")}</div>`;
const legendHTML=()=>`<div class="legend">
  <span class="key"><span class="sw" style="border-color:var(--t1)"></span>documented sequence</span>
  <span class="key"><span class="sw" style="border-color:var(--t3);border-top-style:dashed"></span>proposed mechanism</span>
  <span class="key"><span class="sw" style="border-color:var(--t1);border-top-style:dotted"></span>required condition</span>
  <span class="key"><span class="sw" style="border-color:var(--stop)"></span>safeguard blocks</span>
  <span class="key">solid border = documented in reviewed sources · dashed = conditional</span>
  <span class="key">fill and words = what happens under the current scenario settings</span></div>`;

/* ================= ROUTE MODEL =================
   #/               home
   #/<chapter>      one of five chapters
   #/model          the full causal model                                        */
let chap="", returnTo="#/", showAssumptions=false;
const hashFor=c=> c==="model" ? "#/model" : c ? `#/${c}` : "#/";
/* routes that existed before the five-chapter structure */
const LEGACY={"evidence/unknown":"#/evidence","safeguards/governance":"#/governance",
 "tour/happened":"#/happened","tour/evidence":"#/evidence","tour/pathway":"#/pathway",
 "tour/safeguards":"#/safeguards","explore/happened":"#/happened","explore/evidence":"#/evidence",
 "explore/pathway":"#/pathway","explore/safeguards":"#/safeguards"};
function parseHash(){
 let raw=(location.hash||"").replace(/^#\/?/,"").replace(/\?.*$/,"").replace(/\/$/,"");
 if(LEGACY[raw]){ history.replaceState({},"",LEGACY[raw]); raw=LEGACY[raw].replace(/^#\//,""); }
 if(!raw) return {chap:""};
 if(raw==="model") return {chap:"model"};
 return {chap:CH(raw)?raw:""};
}

/* an illustrative scenario built for the consequence actually being examined */
function illustrativeFor(oc){
 const s={...BASE(),objective:"external_direction",release_authority:"full_release_authority",
  publication_authorization:"absent",downstream_use:"adopted_consequential"};
 const mod={hc_privacy:"backdoor_exfil",hc_wrong_outputs:"integrity_degradation",
            hc_direct_disruption:"destructive",hc_protective_disruption:"backdoor_exfil"}[oc];
 s.modification_type=mod;
 if(oc==="hc_protective_disruption"){s.detection_timing="rapid_post";s.rollback_capability="immediate_complete";}
 else {s.detection_timing="delayed";s.rollback_capability="unavailable";}
 return s;
}
/* matched hypothetical governance scenarios, differing only in implementation and technical effect */
function govPair(oc){
 const mod={hc_privacy:"backdoor_exfil",hc_wrong_outputs:"integrity_degradation",
            hc_direct_disruption:"destructive",hc_protective_disruption:"backdoor_exfil"}[oc];
 const common={objective:"external_direction",release_authority:"full_release_authority",
  modification_type:mod,downstream_use:"adopted_consequential"};
 return {
  paper:{...BASE(),...common,publication_authorization:"absent",detection_timing:"delayed",
   rollback_capability:"unavailable",governance_package:"duty_on_paper"},
  effective:{...BASE(),...common,publication_authorization:"signing_plus_independent_auth",
   detection_timing:"rapid_post",rollback_capability:"immediate_complete",
   governance_package:"effective_technical_control"}};
}
/* why a pathway cannot demonstrate safeguards — the actual state, not "unresolved" for everything */
function notDemonstrable(st,by,Pp){
 if(st==="unresolved") return ["The model cannot determine whether this pathway reaches the consequence",
   "A step it requires depends on something the reviewed sources do not establish. Nothing is yet continuing for a safeguard to stop."];
 if(st==="blocked") return ["This pathway already stops at "+by.map(b=>NL(b)).join(", "),
   "A safeguard already stops it under your current settings, so there is nothing further to show."];
 if(Pp.objective==="none_evidenced") return ["No harmful objective is selected",
   "The reviewed sources describe an evaluation objective, not adversarial direction. Without one, nothing reaches this consequence for a safeguard to interrupt."];
 return ["This pathway does not reach the consequence under your current settings",
   "One or more steps it requires do not occur, so no safeguard would visibly change the outcome."];
}

/* ================= SHARED CHROME ================= */
const app=()=>document.getElementById("app");
const changedParams=()=>PARAMS.filter(p=>P[p.id]!==p.base);

function pagehead(){
 const c=CH(chap);
 document.title=`${c.q} — Where the Record Stops`;
 return `<div class="pagehead">
   <h1 id="pageTitle" tabindex="-1">${c.q}</h1>
   <p class="orient">${c.answer}</p></div>`;
}

function progress(){
 const i=CHI(chap);
 return `<nav class="steps" aria-label="Five questions, in the recommended order">${CHAPTERS.map((c,n)=>
   `<button class="st ${n===i?"now":""}" ${n===i?'aria-current="page"':`data-go="#/${c.id}"`}>
     <span class="num">${n+1}</span>${c.step}</button>`
   +(n<CHAPTERS.length-1?`<span class="dash" aria-hidden="true">—</span>`:"")).join("")}</nav>`;
}

function statusStrip(){
 const a=changedBy("assumption").length, s=changedBy("safeguard").length,
       rs=changedBy("response").length, gv=changedBy("gov").length;
 const n=a+s+rs+gv;
 if(!n) return `<div class="statusstrip"><span class="lab">Scenario</span>
   <span>Baseline from the reviewed public sources · nothing assumed beyond them</span></div>`;
 const parts=[];
 if(a) parts.push(`<b>${a}</b> scenario setting${a===1?"":"s"} changed`);
 if(s) parts.push(`<b>${s}</b> safeguard${s===1?"":"s"} included`);
 if(rs) parts.push(`<b>${rs}</b> response setting${rs===1?"":"s"} changed`);
 if(gv) parts.push(`<b>${gv}</b> governance package set`);
 return `<div class="statusstrip hypo"><span class="lab">Scenario</span>
   <span>${illustrative?"<b>Illustrative example</b> · ":"<b>Hypothetical</b> · "}${parts.join(" · ")}</span>
   <span class="sp"></span>
   <button class="lnk" data-showchanges="1">View changes</button>
   ${undoStack.length?`<button class="lnk" data-undo="1">Undo last change</button>`:""}
   <button class="btn-reset" data-reset="1">Reset to the reviewed sources</button></div>`;
}

function changesList(){
 const c=changedParams(); if(!c.length) return "";
 return `<details class="more"><summary>The ${c.length} scenario settings that differ from the reviewed sources</summary>
  <ul class="kv">${c.map(p=>`<li>${p.label.replace(/\?$/,"")} → <b>${optLabel(p.opts.find(o=>o[0]===P[p.id])[1],p.id,P[p.id])}</b>
   <span style="color:var(--muted)">(record: ${recordNote(p)})</span></li>`).join("")}</ul></details>`;
}

/* ONE navigation region per screen, two deliberate rows, at most one filled primary. */
function nav(){
 const i=CHI(chap), last=i===CHAPTERS.length-1;
 const prev = i>0
  ? `<button class="btn-secondary" data-go="#/${CHAPTERS[i-1].id}">← ${CHAPTERS[i-1].short}</button>`
  : `<button class="btn-secondary" data-go="#/">← All questions</button>`;
 const main = last
  ? `${prev}<span class="sp"></span>
     <button class="btn-secondary" data-go="#/model">Open full model</button>
     <button class="btn-primary" data-go="#/">All questions</button>`
  : `${prev}<span class="sp"></span>
     <button class="btn-primary" data-go="#/${CHAPTERS[i+1].id}">Next: ${CHAPTERS[i+1].short} →</button>`;
 /* the full model is permanently in the header; only the last chapter repeats it */
 const tertiary = last ? "" : (i>0?`<button class="lnk" data-go="#/">All questions</button>`:"");
 return `<div class="navregion"><div class="nav-main">${main}</div>
   <div class="nav-tertiary">${tertiary}</div></div>`;
}

/* ================= HOME ================= */
function scrHome(){
 app().className="";
 document.title="Where the Record Stops";
 app().innerHTML=`<section class="hero">
  <h1 id="pageTitle" tabindex="-1">Where the Record Stops</h1>
  <p class="lead">In July 2026, AI agents escaped an evaluation environment and reached Hugging Face
  infrastructure. They obtained and exercised write access, but no unauthorised change shipped. This
  explorer separates what happened from what would additionally have to happen for an incident like
  this to affect people.</p>
 </section>
 <section class="screen">
  <p class="sub">Read the five questions in order, or jump directly to the one that interests you.</p>
  <div class="qgrid">${CHAPTERS.map((c,n)=>`
   <button class="card${n===0?" recommended":""}" data-go="#/${c.id}">
    ${n===0?'<span class="rec-flag">Recommended starting point</span>':''}
    <span class="eyebrow">${n+1} · ${c.step}</span>
    <span class="q">${c.q}</span><span class="d">${CARD_D[c.id]}</span></button>`).join("")}</div>
 </section>
`;
}
const CARD_D={happened:"The documented incident, in six moments.",
 evidence:"What the reviewed sources establish, where they stop, and the two questions they do not settle.",
 pathway:"Pick a consequence and see the steps it would require.",
 safeguards:"One safeguard at a time, and the exact step it stops.",
 governance:"A duty on paper, compared with one that was implemented and verified."};

/* ================= CHAPTER 1 — the record ================= */
function scrHappened(){
 app().className="";
 app().innerHTML=`${pagehead()}${progress()}<section class="screen">
  <div class="panel"><ol class="moments">${MOMENTS.map((m,i)=>`
    <li><span class="n">${i+1}</span><div><div class="t">${m.t}</div><div class="s">${m.s}</div>
      <details class="tech"><summary>Technical detail</summary><div class="body">
        ${m.n.map(id=>byId[id]?`<p><b>${NL(id)}.</b> ${annotate(byId[id].mech||"")}</p>`:"").join("")}
      </div></details></div></li>`).join("")}</ol></div>
  <p class="locknote">This is the documented context. The explorer does not let you rewrite history.
  Your choices begin at the point where the public evidence stops.</p>
  ${pausedNote()}
  ${srcBar(["hf","metr","oai"])}
  <details class="more"><summary>Inspect the full technical sequence</summary>
   <div class="canvas" id="techGraph"></div></details>
  ${nav()}</section>`;
 const d=app().querySelector("details.more");
 d.addEventListener("toggle",()=>{ if(d.open && !d.dataset.drawn){ d.dataset.drawn="1";
   const vis=new Set(NODES.filter(n=>["drivers","chainA","chainB"].includes(n.lane)).map(n=>n.id));
   drawGraph(document.getElementById("techGraph"),effState(evaluate(P)),vis,
     {static:true,key:"t",alt:"The full documented sequence."});}});
}

/* ================= CHAPTER 2 — what we know, and what we do not ================= */
function scrEvidence(){
 app().className="";
 /* public-record unknowns are computed from the BASELINE, never from the reader's scenario */
 const BASE_ES=effState(evaluate(BASE()));
 const baseUnknown=NODES.filter(n=>BASE_ES[n.id].s==="unresolved");
 const NOW=effState(evaluate(P));
 const nowUnknown=NODES.filter(n=>NOW[n.id].s==="unresolved");
 const scenarioDiffers=changedParams().length>0;
 const baseParams=PARAMS.filter(p=>p.status==="needs_source"||(p.unknownVals||[]).includes(p.base));
 app().innerHTML=`${pagehead()}${progress()}<section class="screen">
  <div class="cols">
   <div class="col est"><h2>What the reviewed sources establish</h2><ul>
     <li>Write-capable access existed and was exercised</li>
     <li>No unauthorised change reached the public</li>
     <li>Limited relevant data was accessed — five datasets, no public models or packages</li>
     <li>Execution policies blocked part of the attempted ${g("ci-pipeline","CI")} route</li></ul>
    ${srcBar(["hf","oai"])}</div>
   <div class="divider"></div>
   <div class="col unres"><h2>Where the reviewed sources stop</h2>
    <p class="hint">Two questions about the incident itself are not answered.</p>
    <ul>
     <li><b>Which control ultimately prevented publication.</b> Execution policies blocked part of the
       attempted CI route; whether ${g("branch-protection","branch protection")}, required review, an
       approval workflow or containment timing closed the rest is not stated.</li>
     <li><b>Whether ${g("write-access","write access")} reached a trusted public
       ${g("release-authority","release path")}</b>, or only internal ${g("repository","repositories")}.</li></ul>
    <p class="hint">Other things the model needs — how quickly a changed artifact would be noticed, and
    how completely it could be withdrawn — are not unanswered questions about this incident. Nothing
    shipped, so they never arose. They are
    <button class="lnk" data-go="#/pathway">scenario settings the incident cannot supply</button>.</p></div></div>
  ${callout("unknown")}
  ${pausedNote()}
  <details class="more"><summary>Technical evidence audit</summary><div class="panel">
    <div class="kv"><span class="k">Steps the model cannot determine from the reviewed sources (${baseUnknown.length})</span>
     <p class="hint">Computed from the baseline set by the reviewed sources, so this list does not move
     when you change scenario settings elsewhere.</p>
     <ul>${baseUnknown.map(n=>`<li>${NL(n.id)}</li>`).join("")||"<li>None.</li>"}</ul></div>
    ${scenarioDiffers?`<div class="kv"><span class="k">Still cannot be determined under your current settings (${nowUnknown.length})</span>
     <ul>${nowUnknown.map(n=>`<li>${NL(n.id)}</li>`).join("")||"<li>None.</li>"}</ul></div>`:""}
    <div class="kv"><span class="k">Scenario settings with no basis in the reviewed sources (${baseParams.length})</span>
     <ul>${baseParams.map(p=>`<li>${p.label.replace(/\?$/,"")}</li>`).join("")}</ul></div>
    <div class="kv"><span class="k">Claims this model does not rest on</span>
     <ul>${UNCORROBORATED.map(x=>`<li>${x}</li>`).join("")}</ul></div></div></details>
  ${nav()}</section>`;
}

/* ================= CHAPTER 3 — pathway, staged ================= */
function scrPathway(){
 app().className="";
 const ES=effState(evaluate(P));
 const cl=requiredClosure(outcome), rel=paramsForOutcome(outcome);
 const shown=showAllConds?rel:rel.slice(0,6);
 const st=ES[outcome].s;
 const vis=new Set([...cl].filter(id=>{const n=byId[id];return n&&n.lane!=="drivers"&&
   !(n.lane==="chainA"&&id!=="obs_credential_harvest");}));
 const order=PATH_ORDER(outcome);
 const metPath=order.filter(id=>ES[id].s==="active"), unres=order.filter(id=>ES[id].s==="unresolved");
 let verdict,vcls;
 if(st==="active"){verdict=`Under your selected settings, every modelled step needed to reach this consequence occurs, so
  <b>${g("reachable","the pathway reaches this consequence")}</b>. That is not a claim about how
  likely any of those steps are.`;vcls="";}
 else if(st==="blocked"){verdict=`The pathway <b>stops</b> at ${ES[outcome].by.map(b=>NL(b)).join(", ")}, assuming that safeguard works as intended.`;vcls="blocked";}
 else if(st==="unresolved"){verdict=`<b>The model cannot determine whether the pathway reaches this consequence.</b> A step it requires depends on something the reviewed sources do not establish.`;vcls="unknown";}
 else {verdict=`Under your current scenario settings, <b>the pathway does not reach this consequence</b>. That is not the same as impossible in reality.`;vcls="";}
 app().innerHTML=`${pagehead()}${progress()}<section class="screen">
  ${statusStrip()}
  <div class="transition"><b>From this point onward, the graph is conditional.</b>
   The incident record ends with exercised write access and no unauthorised publication. Everything
   below asks what else would have to be true for consequences to reach people.</div>
  <div class="howto"><span class="t">How to use this page</span><ol>
    <li>Choose one consequence.</li>
    <li>Read what the model concludes, and the first step it cannot determine.</li>
    <li>Open <b>Change the scenario settings</b> to test what would make the pathway continue or stop.</li>
   </ol></div>
  <div class="eyebrow">Choose a consequence</div>
  <div class="qgrid four">${CONSEQ.map(c=>`<button class="card" data-oc="${c.id}" aria-pressed="${c.id===outcome}">
    <span class="q">${c.t}</span><span class="d">${c.d}</span></button>`).join("")}</div>
  <div class="eyebrow">See the current pathway</div>
  <div class="panel"><div class="verdict ${vcls}"><span class="eyebrow">Conclusion</span>
    <span class="v">${verdict}</span></div>
   <div class="kv"><span class="k">First step the model cannot determine</span>
    ${unres.length?`<p><b>${byId[unres[0]].label}</b> — ${byId[unres[0]].missing||byId[unres[0]].mech||""}</p>`
     :`<p>Every step on this pathway can be determined under your current settings.</p>`}</div>
   ${changesList()}</div>
  ${readHint()}<div class="canvas" id="pathGraph"></div>${miniLegend()}
  ${inspectCard(ES)}
  <div class="eyebrow">Change the scenario settings</div>
  ${changeFeedback()}
  <details class="more" ${showAssumptions?"open":""} id="assumeBox">
   <summary>Change scenario settings</summary>
   <div class="panel assume">
    ${shown.map(p=>`<div class="q1"><span class="qq">${p.label}</span>
      <span class="qh">${p.plain}</span><span class="rec">Reviewed sources: ${recordNote(p)}</span>
      ${NOT_FROM_INCIDENT[p.id]?`<span class="rec" style="color:var(--t3)">The incident cannot supply this:
        nothing shipped, so it never arose.</span>`:""}
      ${PARAM_NOTE[p.id]?`<details class="more"><summary>Why this is the baseline</summary>
        <p class="hint">${PARAM_NOTE[p.id]}</p></details>`:""}
      ${P[p.id]!==p.base?'<span class="chg">not established by the reviewed sources</span>':''}
      <select data-p="${p.id}">${optionsHTML(p)}</select></div>`).join("")}
    <div class="abbrev">Showing ${shown.length} of ${rel.length} relevant settings, from a model of
      ${NODES.length} nodes. ${rel.length>shown.length||showAllConds
       ? `<button class="lnk" data-all="1">${showAllConds?"Show fewer":"View the complete pathway."}</button>`:""}</div>
   </div></details>
  ${nav()}</section>`;
 drawGraph(document.getElementById("pathGraph"),ES,vis,{compact:true,key:"p",
   alt:`Pathway required for ${NL(outcome)}.`});
 const ab=document.getElementById("assumeBox");
 ab.addEventListener("toggle",()=>{showAssumptions=ab.open;});
}

/* ================= CHAPTER 4 — safeguards; governance is a CHILD, shown on its own ================= */
function sgRows(){
 return PARAMS.filter(p=>p.cls==="intervention"&&p.id in STRONG&&p.tier==="core")
  .map(p=>({p,r:firstChangedBy(p.id,STRONG[p.id]),cur:P[p.id]===STRONG[p.id]}));
}
function governanceBlock(){
 const oc=outcome, ocL=NL(oc), pair=govPair(oc);
 const sa=evaluate(pair.paper), sb=evaluate(pair.effective);
 const diffP=PARAMS.filter(p=>pair.paper[p.id]!==pair.effective[p.id]);
 const diffN=NODES.filter(n=>sa[n.id]!==sb[n.id]);
 const protect = oc==="hc_protective_disruption";
 return `<p class="hint">A <b>self-contained illustrative comparison</b>, built for the consequence you
   are examining: <b>${ocL}</b>. It is computed from two matched hypothetical scenarios, not from whatever
   settings you have elsewhere in the explorer — so nothing you change on other pages moves it.</p>
  <div class="gov2">
   <div class="gov"><h3>Duty on paper</h3><ul>
     <li>A legal requirement applies.</li>
     <li>Implementation and technical effectiveness are not assumed.</li>
     <li>The technical pathway therefore remains unchanged.</li></ul>
    <div class="res">Result: ${ocL.toLowerCase()} is <b>${stateShort(byId[oc],sa[oc])}</b>.</div></div>
   <div class="gov after"><h3>Verified implementation</h3><ul>
     <li>The requirement is translated into a specific control.</li>
     <li>The control is implemented and independently checked.</li>
     <li>Effective publication authorisation blocks the pathway before release.</li></ul>
    <div class="res">Result: ${ocL.toLowerCase()} is <b>${stateShort(byId[oc],sb[oc])}</b>.</div></div></div>
  ${protect?`<p class="paused"><b>Read this one carefully.</b> An effective publication control stops the
    change reaching the public at all, so neither the harm nor the protective suspension happens — the
    outcome reads <em>not on this pathway</em> for a different reason than the others. A control that
    only <em>detects</em> after release would prevent the harm while still forcing a suspension, and
    that temporary loss of access is a defensive cost, not a failed safeguard.</p>`:""}
  <p class="hint"><b>Both scenarios change ${diffP.length} settings together.</b> The difference
   between them is implementation and technical effectiveness — not legal coverage. No part of this
   result may be attributed to the law alone.</p>
  <details class="more"><summary>Audit this comparison</summary><div class="panel">
    <div class="kv"><span class="k">Settings that differ (${diffP.length})</span>
     <ul>${diffP.map(p=>`<li>${p.label.replace(/\?$/,"")}: <b>${optLabel(p.opts.find(o=>o[0]===pair.paper[p.id])[1],p.id,pair.paper[p.id])}</b>
      → <b>${optLabel(p.opts.find(o=>o[0]===pair.effective[p.id])[1],p.id,pair.effective[p.id])}</b></li>`).join("")}</ul></div>
    <div class="kv"><span class="k">Nodes whose state differs (${diffN.length})</span>
     <ul>${diffN.map(n=>`<li>${NL(n.id)}: <b>${stateShort(n,sa[n.id])}</b> → <b>${stateShort(n,sb[n.id])}</b></li>`).join("")}</ul></div>
   </div></details>`;
}
function scrSafeguards(){
 app().className="";
 const rows=sgRows();
 if(!sgSel||!rows.some(r=>r.p.id===sgSel)) sgSel=rows[0].p.id;
 const selP=PARAMS.find(p=>p.id===sgSel);
 /* "before" is this same scenario with the selected safeguard removed — never whatever P happens to be */
 const withoutSel={...P}; withoutSel[sgSel]=WEAK[sgSel]!==undefined?WEAK[sgSel]:selP.base;
 const withSel={...P};    withSel[sgSel]=STRONG[sgSel];
 const beforeES=effState(evaluate(withoutSel)), afterES=effState(evaluate(withSel));
 const applied=P[sgSel]===STRONG[sgSel];
 const demonstrable=beforeES[outcome].s==="active";
 const order=PATH_ORDER(outcome);
 const NOW=effState(evaluate(P));
 const protectiveRelevant = outcome==="hc_protective_disruption"||NOW.hc_protective_disruption.s==="active";
 const [why,whyDetail]=notDemonstrable(beforeES[outcome].s,beforeES[outcome].by,withoutSel);
 const body = !demonstrable
  ? `<div class="exoffer"><span class="t">${why}</span>
     <span class="b">${whyDetail} To see how these controls behave, you can load an illustrative
     scenario in which this consequence is reachable. It is an <b>example built for
     ${NL(outcome).toLowerCase()}</b>, not a finding, and you can undo it in one click.</span>
     <button class="btn-primary" data-example="1" style="align-self:flex-start">
      Load an illustrative scenario for ${NL(outcome).toLowerCase()}</button></div>`
  : `<div class="sgpick">${rows.map(r=>`<button data-sg="${r.p.id}" aria-pressed="${r.p.id===sgSel}">
       ${r.p.label.replace(/\?$/,"")}${P[r.p.id]===STRONG[r.p.id]?" ✓":""}</button>`).join("")}</div>
     <div class="iv ${afterES[outcome].s!=="active"?"fires":""}">
      <div class="ivh"><span class="ivt">${selP.label.replace(/\?$/,"")}</span>
       <span class="tag ${afterES[outcome].s!=="active"?"on":"off"}">${afterES[outcome].s!=="active"?"stops this pathway":"does not stop this pathway"}</span>
       ${applied?'<span class="tag on">included in this scenario</span>':''}</div>
      <div class="row">Set to <b>${optLabel(selP.opts.find(o=>o[0]===STRONG[sgSel])[1],sgSel,STRONG[sgSel])}</b>.</div>
      <div class="row">Exact step affected: <b>${(function(){const f=order.find(id=>beforeES[id].s!==afterES[id].s);
        return f?NL(f):"none under these settings";})()}</b>.</div>
      <div class="beforeafter">
       <div class="ba-before"><h4>Without this safeguard</h4><ul class="balist">${order.map(id=>
        `<li><span>${NL(id)}</span><span class="s">${stateShort(byId[id],beforeES[id].s)}</span></li>`).join("")}</ul></div>
       <div class="ba-after"><h4>With this safeguard</h4><ul class="balist">${order.map(id=>
        `<li><span>${NL(id)}</span><span class="s">${stateShort(byId[id],afterES[id].s)}</span></li>`).join("")}</ul></div></div>
      <div class="row">This comparison assumes that the safeguard was implemented, independently checked,
       and worked as intended. The model does not establish that it would work in reality.</div>
      ${applied
        ? `<button class="btn-secondary" data-undoctl="${sgSel}" style="align-self:flex-start">Remove this safeguard from the scenario</button>`
        : `<button class="btn-primary" data-set="${sgSel}" data-val="${STRONG[sgSel]}" style="align-self:flex-start">${APPLY_LABEL[sgSel]||"Include this safeguard in the scenario"}</button>`}
      </div>
     <details class="more"><summary>Compare the other safeguards — all ${rows.length} at once</summary>
      <div class="ivlist">${rows.map(function(r){
        const wo={...P}; wo[r.p.id]=WEAK[r.p.id]!==undefined?WEAK[r.p.id]:r.p.base;
        const wi={...P}; wi[r.p.id]=STRONG[r.p.id];
        const b=evaluate(wo), a=evaluate(wi);
        const step=order.find(id=>b[id]!==a[id]);
        const closes=order.filter(id=>b[id]==="active"&&a[id]!=="active");
        return `<div class="iv ${a[outcome]!=="active"&&b[outcome]==="active"?"fires":""}">
         <div class="ivh"><span class="ivt">${r.p.label.replace(/\?$/,"")}</span>
          <span class="tag ${a[outcome]!=="active"&&b[outcome]==="active"?"on":"off"}">${a[outcome]!=="active"&&b[outcome]==="active"?"stops this pathway":"does not stop it"}</span></div>
         <div class="row">Step it affects: <b>${step?NL(step):"none"}</b>.</div>
         <div class="row">Downstream steps that no longer occur: ${closes.length?"<b>"+closes.map(id=>NL(id)).join(", ")+"</b>":"none"}.</div>
        </div>`;}).join("")}</div></details>`;
 app().innerHTML=`${pagehead()}${progress()}<section class="screen">
  ${statusStrip()}
  ${illustrative?`<p class="paused">You are looking at an <b>illustrative example</b> built for
   ${NL(outcome).toLowerCase()}, not the reviewed sources. Undo or reset at any time.</p>`:""}
  ${consequencePicker("Comparing safeguards for:")}
  <div class="howto"><span class="t">How to use this page</span><ol>
    <li>Choose the consequence being examined.</li>
    <li>Choose one safeguard.</li>
    <li>Compare the same scenario without and with that safeguard.</li>
    <li>Include it in the scenario if you want to keep the change.</li>
   </ol>
   <p><b>“Without” does not mean the historical incident.</b> It means your current hypothetical
   scenario with that one safeguard removed.</p></div>
  ${body}
  ${protectiveRelevant?callout("defence"):""}
  ${nav()}</section>`;
}

/* ================= CHAPTER 5 — governance ================= */
function scrGovernance(){
 app().className="";
 /* deliberately NO current-scenario strip: this comparison does not use P */
 app().innerHTML=`${pagehead()}${progress()}<section class="screen">
  <div class="transition">The previous chapter assumed that a safeguard worked and showed what it would
   prevent. This chapter steps back and asks what must happen for a legal requirement to produce that
   working safeguard.</div>
  <h2>Legal duty → implementation → independent verification → effective technical control</h2>
  ${consequencePicker("Comparing governance for:")}
  <div class="howto"><span class="t">How to read this comparison</span>
   <p>The two columns use the same consequence and the same other scenario settings. They differ in
   implementation, verification and technical effectiveness. This is <b>not</b> an estimate of what any
   particular law would achieve.</p>
   <p>This comparison uses your selected consequence but otherwise uses two fixed, matched
   illustrative scenarios — nothing you change elsewhere in the explorer moves it.</p></div>
  ${governanceBlock()}
  ${nav()}</section>`;
}

/* ================= FULL CAUSAL MODEL ================= */
function scrModel(){
 app().className="wide";
 document.title="Full causal model — Where the Record Stops";
 const ES=effState(evaluate(P));
 const vis=new Set(NODES.map(n=>n.id));
 const grp=(title,list)=>list.length?`<div class="grp"><h4>${title}</h4>${list.map(p=>`
   <div class="q1"><span class="qq">${p.label}</span><span class="qh">${p.plain}</span>
    <span class="rec">Reviewed sources: ${recordNote(p)}</span>
       ${PARAM_NOTE[p.id]?`<details class="more"><summary>Why this is the baseline</summary><p class="hint">${PARAM_NOTE[p.id]}</p></details>`:""}
    ${P[p.id]!==p.base?'<span class="chg">not established by the reviewed sources</span>':''}
    <select data-p="${p.id}">${optionsHTML(p)}</select></div>`).join("")}</div>`:"";
 const back = returnTo && returnTo!=="#/model" ? returnTo : "#/";
 const backLabel = back==="#/" ? "← All questions" : `← Return to ${labelForHash(back)}`;
 app().innerHTML=`<div class="crumb"><button data-go="#/">All questions</button>
   <span class="sep">/</span><span>Expert view</span></div>
  <div class="pagehead"><span class="ctx">Expert view</span>
   <h1 id="pageTitle" tabindex="-1">Full causal model</h1>
   <p class="orient">Every node, every arrow, every rule. This is the machinery behind the guided
   explanation. Everything here is generated by the same rules the other pages use.</p></div>
  <section class="screen">
  ${statusStrip()}
  <div class="toolrow"><span class="sp"></span>
    <button class="lnk" data-howto="1">${showHowTo?"Hide the instructions":"How to use this view"}</button></div>
  ${showHowTo?`<div class="howto"><span class="t">How to use this view</span><ol>
    <li><b>Set the scenario — left.</b> Change scenario settings or include safeguards.</li>
    <li><b>Inspect the pathway — centre.</b> Boxes show steps; arrows show how they relate.</li>
    <li><b>Audit a claim — right.</b> Select any box or arrow to see its evidence, what is not
      established, and what would settle it.</li>
    <li><b>Return to the record.</b> Use Reset to remove hypothetical changes.</li></ol>
   <p><b>Reading the encoding.</b> Border style = how well the claim is evidenced (documented in the
   reviewed sources, accounts disagree, not established, conditional). Fill and wording = what happens
   under your current scenario settings. Line style = how two steps relate.</p>
   <button class="lnk" data-howto="1" style="align-self:flex-start">Hide these instructions</button></div>`:""}
  <div class="stage">
   <div class="side zone"><span class="zh">Scenario</span>
    ${grp("Scenario assumptions",PARAMS.filter(p=>p.cls==="assumption"&&p.tier==="core"))}
    ${grp("Interventions",PARAMS.filter(p=>p.cls==="intervention"&&p.tier==="core"))}
    <details class="adv"><summary>Governance packages</summary>
      ${grp("",PARAMS.filter(p=>p.tier==="advanced"))}</details>
    <details class="adv"><summary>Documented facts — locked</summary>
      <p class="placeholder">The documented spine cannot be edited. It is context, not a variable.</p></details>
    <details class="adv"><summary>Historical explanations — not interventions</summary>
      <dl class="hist">${HISTORICAL.map(h=>`<dt>${h.label}</dt><dd>${h.value}
        ${h.lesson?`<span class="lesson">Retrospective lesson: ${h.lesson}</span>`:""}</dd>`).join("")}</dl></details>
    <button id="copyJson" class="btn-secondary">Copy scenario JSON</button></div>
   <div class="zone"><span class="zh">Causal graph</span>
    <p class="hint">Select a box or arrow to inspect its evidence.</p>
    <div class="canvas" id="fullGraph"></div>${legendHTML()}</div>
   <aside class="side zone" id="dossier"><span class="zh">Evidence dossier</span></aside></div>
  <div class="navregion">
   <div class="nav-main"><button class="btn-secondary" data-go="${back}">${backLabel}</button>
    <span class="sp"></span>
    <button class="btn-primary" data-go="#/">All questions</button></div></div>
  </section>`;
 drawGraph(document.getElementById("fullGraph"),ES,vis,{key:"f",alt:"Complete causal hypothesis graph."});
 dossier(ES);
 document.getElementById("copyJson").onclick=()=>{
   const b=JSON.stringify({parameters:P,nodeStates:evaluate(P),outcome,
     disclaimer:"Conditional pathway model. No probabilities, no severity scores, no forecast."},null,1);
   navigator.clipboard?.writeText(b).then(()=>{const el=document.getElementById("copyJson");
     const o=el.textContent;el.textContent="Copied";setTimeout(()=>el.textContent=o,1400);},()=>{});};
}
function labelForHash(hs){
 const raw=(hs||"").replace(/^#\/?/,"").replace(/\/$/,"");
 if(raw==="model") return "the full model";
 if(!raw) return "the questions";
 return CH(raw)?`“${CH(raw).q}”`:"the questions";
}

/* ================= EVIDENCE DOSSIER (expert workspace) ================= */
function dossier(ES){
 const h=document.getElementById("dossier"); if(!h)return;
 const zh=`<span class="zh">Evidence dossier</span>`;
 if(selEdge){const [a,b,rel,m]=selEdge;
  h.innerHTML=`${zh}<div class="eyebrow">Arrow · ${rel}</div><h3>${NL(a)} → ${NL(b)}</h3>
   <p class="placeholder">${RELDESC[rel]}</p>
   ${m&&m.status?`<span class="pill pill-unresolved">${m.status}</span>`:""}
   ${m&&m.mech?`<div class="kv"><span class="k">Mechanism</span><p>${m.mech}</p></div>`:""}
   ${m&&m.conf?`<div class="kv"><span class="k">${m.status==="hypothesised"?"Strength of support":"Confidence"}</span>
     <p>${confLine(m.conf,m.confDim,m.status==="hypothesised")}</p></div>`:""}
   ${m&&m.alt?`<div class="kv"><span class="k">Alternative explanation</span><p>${m.alt}</p></div>`:""}
   ${m&&m.test?`<div class="kv"><span class="k">What would resolve it</span><p>${m.test}</p></div>`:""}
   ${m&&m.src?`<div class="kv"><span class="k">Sources</span>${m.src.map(s=>`<a href="${SOURCES[s].u}" target="_blank" rel="noopener">${SOURCES[s].t}</a>`).join("<br>")}</div>`:""}
   <button class="lnk" data-desel="1">Clear selection</button>`;return;}
 if(!sel){h.innerHTML=`${zh}<p class="placeholder">Nothing selected.</p>`;return;}
 const n=byId[sel],st=ES[sel];
 h.innerHTML=`${zh}<div class="eyebrow">${EPI[n.status][1]}${n.sub?" · "+n.sub:""}</div>
  <h3>${NL(n.id)}</h3>${n.plain?`<p style="color:var(--ink);font-size:13px">${n.plain}</p>`:""}
  <span class="pill pill-${st.s}">${GLYPH[st.s]} ${stateShort(n,st.s)}${st.by.length?" by "+st.by.map(b=>NL(b)).join(", "):""}</span>
  ${n.rule?`<div class="kv"><span class="k">When this step occurs</span><p>${ruleNL(n.rule)}</p>
    <details class="adv"><summary>Technical rule</summary><pre>${ruleTech(n.rule)}</pre></details></div>`:""}
  ${n.mech?`<div class="kv"><span class="k">Mechanism</span><p>${n.mech}</p></div>`:""}
  ${n.evid?`<div class="kv"><span class="k">Evidence</span><p>${n.evid}</p></div>`:""}
  ${n.conf?`<div class="kv"><span class="k">${n.status==="projected"?"Strength of support":"Confidence"}</span>
    <p>${confLine(n.conf,n.confDim,n.status==="projected")}</p></div>`:""}
  ${n.alt?`<div class="kv"><span class="k">Alternative explanation</span><p>${n.alt}</p></div>`:""}
  ${n.missing?`<div class="kv"><span class="k">Missing evidence</span><p>${n.missing}</p></div>`:""}
  ${n.test?`<div class="kv"><span class="k">What would resolve it</span><p>${n.test}</p></div>`:""}
  ${n.src?`<div class="kv"><span class="k">Sources</span>${n.src.map(s=>
    `<a href="${SOURCES[s].u}" target="_blank" rel="noopener">${SOURCES[s].t}</a><span class="role">${SOURCES[s].role}</span>`).join("")}</div>`:""}
  <div class="kv"><button class="lnk" data-go="${n.lane==="cons"?"#/pathway":n.locked?"#/happened":"#/pathway"}">Read the plain-language explanation</button></div>
  <button class="lnk" data-desel="1">Clear selection</button>`;
}

/* ================= GLOSSARY (overlay: no history, no state loss) ================= */
let glossQuery="";
function glossBody(hit){
 const q=glossQuery.trim().toLowerCase();
 const match=t=>!q||t[1].toLowerCase().includes(q)||t[2].toLowerCase().includes(q);
 const secs=GLOSS_SECTIONS.map(s=>{
   const ts=s.terms.filter(match); if(!ts.length) return "";
   return `<section class="gsec"><h4>${s.t}</h4><dl class="gloss">${ts.map(t=>
     `<div ${t[0]===hit?'class="hit" id="gHit" tabindex="-1"':""}><dt>${t[1]}</dt><dd>${t[2]}
       ${t[3]&&t[3].length?`<span class="rel">Related: ${t[3].map(r=>
         GTERM(r)?`<button class="gterm" data-gloss="${r}">${GTERM(r)[1]}</button>`:"").join("")}</span>`:""}
      </dd></div>`).join("")}</dl></section>`;}).join("");
 return secs||`<p class="placeholder">No term matches “${glossQuery}”.</p>`;
}
function openGloss(hit){
 if(document.getElementById("glossary").hidden) lastFocus=document.activeElement;
 const d=document.getElementById("glossary"),s=document.getElementById("scrim");
 d.innerHTML=`<div class="dh"><h3>Glossary</h3><button id="gClose" aria-label="Close glossary">Close</button></div>
  <label class="gsearch"><span class="vh">Search the glossary</span>
   <input id="gSearch" type="search" placeholder="Search terms…" value="${glossQuery}" autocomplete="off"></label>
  ${hit&&GTERM(hit)?`<p class="ghint">Showing <b>${GTERM(hit)[1]}</b>, under
    <b>${GLOSS_GROUP[hit]}</b>. Terms are grouped by category, alphabetical within each.</p>`
   :`<p class="ghint">Grouped by category, alphabetical within each.</p>`}
  <div id="gBody">${glossBody(hit)}</div>
  <p class="placeholder">Terms specific to this incident — HDF5, Jinja2, fsspec, JWT, IAM, SIEM — are
  explained where they appear, in the technical details on <button class="lnk" data-go="#/happened">what
  actually happened</button>.</p>`;
 d.hidden=false;s.hidden=false;
 document.getElementById("navGloss").setAttribute("aria-expanded","true");
 document.getElementById("gClose").onclick=closeGloss;
 const inp=document.getElementById("gSearch");
 inp.oninput=e=>{glossQuery=e.target.value;
   document.getElementById("gBody").innerHTML=glossBody(null);
   d.querySelectorAll("[data-gloss]").forEach(b=>b.onclick=()=>openGloss(b.dataset.gloss));};
 d.querySelectorAll("[data-gloss]").forEach(b=>b.onclick=()=>openGloss(b.dataset.gloss));
 d.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{closeGloss();go(b.dataset.go);});
 /* focus the term itself, so the view lands on it and a screen reader announces it.
    Focusing Close instead would scroll the drawer straight back to the top. */
 const h=document.getElementById("gHit");
 if(h){ h.focus({preventScroll:true}); h.scrollIntoView({block:"center"}); }
 else { d.scrollTop=0; inp.focus(); }
}
function closeGloss(){
 document.getElementById("glossary").hidden=true;
 document.getElementById("scrim").hidden=true;
 document.getElementById("navGloss").setAttribute("aria-expanded","false");
 if(lastFocus&&lastFocus.focus)lastFocus.focus();
}

/* ================= ROUTER ================= */
const CHAP_VIEW={happened:scrHappened,evidence:scrEvidence,pathway:scrPathway,
 safeguards:scrSafeguards,governance:scrGovernance};
function go(hs){
 if(hs==="#/model"){const cur=location.hash||"#/"; if(cur!=="#/model") returnTo=cur;}
 if(location.hash!==hs) history.pushState({},"",hs);
 applyRoute(); render(true);
 window.scrollTo({top:0,behavior:"instant"});
}
function applyRoute(){chap=parseHash().chap;}
function render(moveFocus){
 if(chap==="model") scrModel();
 else if(CHAP_VIEW[chap]) CHAP_VIEW[chap]();
 else scrHome();
 document.getElementById("navHome").setAttribute("aria-current",(!chap)?"page":"false");
 document.getElementById("navModel").setAttribute("aria-current",chap==="model"?"page":"false");
 wire();
 if(moveFocus){const t=document.getElementById("pageTitle"); if(t)t.focus({preventScroll:true});}
}
function wire(){
 app().querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
 app().querySelectorAll("[data-example]").forEach(b=>b.onclick=()=>{
   snapshot(); P=illustrativeFor(outcome); illustrative=true; lastChange=null; render(false);});
 app().querySelectorAll("[data-undo]").forEach(b=>b.onclick=()=>{undo();render(false);});
 app().querySelectorAll("[data-undoctl]").forEach(b=>b.onclick=()=>{
   snapshot(); P[b.dataset.undoctl]=WEAK[b.dataset.undoctl]!==undefined?WEAK[b.dataset.undoctl]:PARAMS.find(p=>p.id===b.dataset.undoctl).base; render(false);});
 app().querySelectorAll("[data-sg]").forEach(b=>b.onclick=()=>{sgSel=b.dataset.sg;render(false);});
 app().querySelectorAll("[data-howto]").forEach(b=>b.onclick=()=>{showHowTo=!showHowTo;render(false);});
 app().querySelectorAll("[data-ocsel]").forEach(s=>s.onchange=e=>{
   outcome=e.target.value;sel=null;selEdge=null;lastChange=null;render(false);});
 app().querySelectorAll("[data-oc]").forEach(b=>b.onclick=()=>{outcome=b.dataset.oc;sel=null;selEdge=null;lastChange=null;render(false);});
 app().querySelectorAll("select[data-p]").forEach(s=>s.onchange=e=>{
   const id=s.dataset.p, from=P[id], to=e.target.value, before=evaluate(P);
   snapshot(); P[id]=to; recordChange(id,from,to,before,evaluate(P)); render(false);});
 app().querySelectorAll("[data-set]").forEach(b=>b.onclick=()=>{
   const id=b.dataset.set, from=P[id], before=evaluate(P);
   snapshot(); P[id]=b.dataset.val; recordChange(id,from,b.dataset.val,before,evaluate(P)); render(false);});
 app().querySelectorAll("[data-all]").forEach(b=>b.onclick=()=>{showAllConds=!showAllConds;showAssumptions=true;render(false);});
 app().querySelectorAll("[data-reset]").forEach(b=>b.onclick=()=>{snapshot();P=BASE();illustrative=false;lastChange=null;render(false);});
 app().querySelectorAll("[data-desel]").forEach(b=>b.onclick=()=>{sel=null;selEdge=null;render(false);});
 app().querySelectorAll("[data-showchanges]").forEach(b=>b.onclick=()=>{
   const d=app().querySelector("details.more"); if(d){d.open=true;d.scrollIntoView({block:"center"});}});
 document.querySelectorAll("[data-gloss]").forEach(b=>b.onclick=()=>openGloss(b.dataset.gloss));
}
function init(){
 applyRoute();
 document.getElementById("navHome").onclick=()=>go("#/");
 document.getElementById("brandHome").onclick=()=>go("#/");
 document.getElementById("navModel").onclick=()=>go("#/model");
 document.getElementById("navGloss").onclick=()=>{
   document.getElementById("glossary").hidden?openGloss():closeGloss();};
 document.getElementById("scrim").onclick=closeGloss;
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!document.getElementById("glossary").hidden)closeGloss();});
 window.addEventListener("popstate",()=>{applyRoute();render(true);});
 render(false);
}
