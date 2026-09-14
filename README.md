# Where the Record Stops

A conditional **causal-hypothesis explorer** for the July 2026 OpenAI / Hugging Face agent intrusion.
Open `explorer.html` in a browser. No server, no build step, no runtime dependency.

## The claim it makes, and the claims it does not

> This tool shows which additional conditions must hold for a demonstrated capability to produce a
> particular consequence, and where safeguards could interrupt that pathway.

It **cannot** establish how probable a pathway is, the expected severity of an outcome, which
safeguard is most cost-effective, how much a law would reduce risk, or that a structurally reachable
outcome will happen. There are no probabilities, risk scores, severity totals or continuous sliders
anywhere in it. An outcome the model cannot reach is reported as *not reachable in this model
configuration* — never as impossible.

## Counterfactual semantics: forward from the boundary

This is the one semantic choice that shapes everything else.

**The demonstrated capability and the evidential boundary are held fixed.** The observed spine is
locked context, not something the user rewrites. The explorer begins at the boundary — write access
exercised, no change shipped — and asks what *else* would have had to be true for a trusted artifact
to ship and reach a person.

Controls that would have prevented earlier observed events — egress topology, credential scope at
evaluation time, trajectory monitoring — are therefore **not interventions**. They live in a
*Historical explanations* panel as locked descriptors, each with its retrospective lesson. Nothing
there is wired into a rule. The reader cannot switch on a control that would have prevented a
documented event while that event still stands: interventions begin after the evidence boundary.

## Schema

**Node** — `id`, `lane`, `label`, `plain`, `status`, `locked`, `rule`, `unresolvedIf`, `mech`,
`evid`, `conf`, `confDim`, `alt`, `missing`, `test`, `src`.

Two independent dimensions, never conflated:

| | Values | Encoded as |
|---|---|---|
| **Epistemic status** | documented · contested · unresolved · projected | border style |
| **Computed scenario state** | observed · condition met · blocked · unknown · not on this pathway | fill + glyph + text label |

Computed states carry context-sensitive names rather than `active` / `inactive`.

**Confidence** is always stated against a dimension (`confDim`): whether the *event occurred*, whether
the *public account is accurate*, confidence in the *causal interpretation*, or whether an *external
precedent applies*. High confidence that something happened is never presented as high confidence in
a causal story about it.

**Edge** — four classes only:

| Class | Meaning |
|---|---|
| `sequence` | Documented temporal or operational order. Order, not necessarily cause. |
| `mechanism` | A proposed causal contributor; its badge says *supported* or *hypothesised*. |
| `required` | A structurally necessary condition in this model. |
| `block` | A safeguard preventing a required condition. |

Important edges carry their own `mech`, `status`, `conf`, `confDim`, `alt`, `test` and `src`. Edges
are keyboard-reachable and inspectable, not decoration. No observed-side edge is typed `required`, and
nothing is typed `enables` where the evidence supports only "may have increased opportunity."

**Rule** — declarative `{all:[…]}` / `{any:[…]}` over parameters (`{p, in|notIn}`) and other node
states (`{n, is|not}`). Three-valued: true / unknown / false, evaluated to a fixpoint. Every rule is
rendered in the inspector.

### Three-valued semantics

Disjunction follows strong Kleene semantics: any true input settles the result as true, and no
unknown can unsettle it. Conjunction is **deliberately more conservative than strong Kleene**: any
unresolved conjunct yields unresolved, even when another conjunct is already false. In particular
`U AND F = U`, where strong Kleene gives `F`.

| `AND` | T | U | F |   | `OR` | T | U | F |
|---|---|---|---|---|---|---|---|---|
| **T** | T | U | F |   | **T** | T | T | T |
| **U** | U | U | U |   | **U** | T | U | U |
| **F** | F | U | F |   | **F** | T | U | F |

The two shaded cells — `U AND F` and `F AND U` — are the departure. The model declines to report
*does not occur* while any required input remains unestablished in the reviewed sources, even where
a false sibling would settle the conjunction under strong Kleene.

This is a precautionary choice, not a neutral one, and it has two costs worth stating plainly:

- It suppresses some *does not occur* conclusions that would hold under **every** completion of the
  unresolved input. The display is biased toward uncertainty rather than reassurance.
- It can hide a safeguard's blocking provenance. When a safeguard blocks one requirement but another
  requirement is unresolved, the downstream node reads *cannot be determined* rather than *prevented
  by a safeguard* — so an active safeguard is not always visible as such.

Both behaviours are intended and both are tested. The evaluator is `test()` inside `evaluate()` in
`model.js`, carrying a comment to the same effect; the two lines implementing this are the most
load-bearing in the repository.

**Parameter classes** — `assumption` (an uncertain fact or projected condition) and `intervention` (a
safeguard). Historical descriptors are a separate locked list, never controls. Every user-facing
parameter is referenced by at least one rule; a test enforces this, so no inert control can pose as an
intervention. Where a control is inert *given the current settings* — rollback under delayed
detection, for instance — the panel says so instead of appearing broken.

## Unknowns are unknowns

Absence of public evidence is never encoded as absence of control. Three parameters default to
`unknown` and propagate a three-valued unresolved state:

- **publication authorisation** — the decisive open question. Hugging Face report that execution
  policies blocked part of the attempted CI route, but public sources do not fully establish which
  control ultimately prevented publication. Partial evidence of blocking justifies neither *present*
  nor *absent*.
- **rollback capability** — no public basis.
- **release authority** — repository write is documented; authority over a trusted *release path* is
  not, so the baseline computes as unknown rather than present.

On the documented baseline, no consequence is open and none is closed. That is the honest result.

## How governance effects are mediated

Governance is a set of named **packages**, not independent legal knobs, because varying scope,
obligation, implementation and enforcement separately would imply the model knows how they interact.

```
no duty → duty on paper → auditable requirement → verified implementation → effective technical control
```

Only the last changes a technical outcome, and it does so by *asserting* technical effectiveness — not
by deriving it from law. The step from duty to implementation is typed `mechanism / hypothesised` and
says so on click: it is a hypothesis, not a rule. The comparison view lists every assumption that
differs between two governance scenarios, so an outcome change is never attributable to legal
coverage alone.

## Interface

One hierarchy, not three overlapping ones.

**Home** states the incident in three sentences, recommends the guided tour, and groups five questions
by purpose — *Understand the incident* and *Explore consequences and responses* — with the expert
workspace offered separately below.

**Five chapters** form the guided explanation: the record · the evidence boundary · pathways ·
safeguards · governance. The chapter navigator shows all five, with the current one marked.

**Earlier nested URLs redirect rather than 404.** `#/evidence/unknown` resolves to `#/evidence` and
`#/safeguards/governance` to `#/governance`, as do the `#/tour/*` and `#/explore/*` forms (see
`LEGACY` in `ui.js`). They are rewritten with `history.replaceState`, so an old link lands on the
right chapter and the address bar shows the canonical route. Counting them, ten routes are
addressable; seven render distinct views — five chapters, home, and the expert workspace.

**The expert workspace** is a separate destination with three named zones — Scenario, Causal graph,
Evidence dossier — and is never presented as another tour step.

### Journey context lives in the route

```
#/            home
#/happened    1 · What actually happened?
#/evidence    2 · What do we know—and what remains unknown?
#/pathway     3 · How could this reach people?
#/safeguards  4 · Which safeguards could interrupt the path?
#/governance  5 · Could stronger legal requirements help?
#/model       the full causal model
```

There is no separate tour mode: the guided tour is the **recommended order through the same pages**.
The chapter navigator appears on every chapter with only the current one marked — no chapter is ever
styled as completed, and no page claims the reader is at a numbered step of a journey they did not
take.

### One navigation region, one primary action

Every screen has exactly one navigation region, in two deliberate rows: a main row with at most one
filled primary action, and a tertiary row of text links. A consistent visual grammar separates
navigation from scenario controls:

| Shape | Meaning |
|---|---|
| Filled | the single recommended next navigation action |
| Outlined | back, or optional navigation |
| Text link | expert workspace, glossary, technical detail |
| Card / select / apply | changes the scenario, never the page |
| Ochre outline | reset to the public record |

Wherever assumptions can differ from the record, a compact status strip says so: *Public-record
baseline · unresolved conditions preserved*, or *Hypothetical · 4 assumptions changed*.

### Guided views are filtered projections, not a second model

Every screen calls the same `evaluate(P)`. Hiding a node from a display never removes it from the
calculation, and abbreviated pathways say so: *"Showing 6 of 9 relevant conditions, from a model of
34 nodes."* Non-regression assertions pin this, including that identical parameters produce
identical node states and pathway classifications in guided and expert views.

## Known limitations

- **OpenAI is cited directly, as an interested party.** Its report is the source for the evaluation
  design, the four misalignment patterns, the unsolved-task figure and the absence of trajectory
  monitoring. Those are OpenAI's retrospective analysis of its own incident: evidence, not ground
  truth, and weighed against the third-party investigation. Where OpenAI and METR/Redwood read the
  same behaviour differently, both readings are shown. Three quantitative claims from OpenAI's report are
  **listed in the interface as claims the model does not rest on** rather than encoded. They are
  retrievable in that report; the reason for excluding them is that each rests on a single interested
  party's retrospective or counterfactual internal analysis without independent corroboration.
- **One contested node.** Hugging Face describe simultaneous multi-layer detection; earlier reporting
  described correlated-but-unescalated signals; OpenAI took roughly a week to identify its own agent.
  The model does not pick a winner.
- **Date discrepancy.** Tertiary accounts place the intrusion 11–13 July; Hugging Face's own timeline
  says 9 July 02:28 UTC – 13 July 14:14 UTC. The primary source is preferred and the discrepancy noted.
  This is the only claim for which a tertiary source is retained.
- **Structural uncertainty is not modelled.** Missing nodes and wrong arrows matter more than any rule
  in the file and nothing here captures them.
- **Browser checks.** `./headless_checks.sh` sweeps 10 routes at two viewports: zero console errors,
  no page-level horizontal scrolling, glossary focus returned to its invoker on every route, and every
  graph node and edge keyboard-focusable with an ARIA label. Contrast is measured across 22 pairs in
  all three theme states. Screen-reader output and tab order need a human and are not covered here.
  See `VALIDATION.md`.

## Tests

```sh
./validate.sh
```

`validate.sh` verifies that `explorer.html` rebuilds byte-for-byte from its four source files, then
runs the assertions, the contrast audit and the headless route sweep. It exits non-zero if any step
fails. Individual checks can also be run on their own: `./run_tests.sh`, `python3 contrast_check.py`,
`./headless_checks.sh`.

**155 assertions**, covering the rule engine and three-valued logic (including seven direct
sentinels on the truth tables above and a 7,200-combination sweep of the structural invariant that no
step can occur while a required predecessor does not), the
ten structural invariants listed in `VALIDATION.md`, model equivalence across views, mechanism-specific
routing, heading structure, focus management, and language discipline.

## Files

| File | Purpose |
|---|---|
| `explorer.html` | The deliverable. Generated: `cat head.html model.js ui.js tail.html > explorer.html` |
| `model.js` | Content, sources, parameters, nodes, edges, presets, rule engine |
| `ui.js` | Rendering and interaction |
| `head.html` / `tail.html` | Shell, styles, document frame |
| `acceptance_tests.js` / `run_tests.sh` | Logic + non-regression tests (macOS JavaScriptCore via osascript) |
| `headless_checks.sh` | Headless-browser sweep: console errors, overflow, focus, ARIA, across routes and viewports |
| `contrast_check.py` | WCAG contrast audit over the CSS tokens, all three theme states |
| `validate.sh` | One offline command: rebuild check, assertions, contrast, routes |
| `make_figures.sh` | Regenerates the appendix figures offscreen from `explorer.html`; prints the source checksum |
| `figures/` | The four appendix figures and their draft captions |
| `SOURCES.md` | Source provenance, and what the sources do not settle |
| `VALIDATION.md` | Technical and structural validation: commands, results and the ten invariants |
