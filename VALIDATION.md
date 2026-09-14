# 9.1 Technical and structural validation

**Date of record: 14 September 2026.** All figures below were produced by the commands shown, against
the released build:

| | |
|---|---|
| `explorer.html` MD5 | `0c9c59bbd0bf0293191db61d64430ea2` |
| `explorer.html` SHA-256 | `0da66a02b63f92d8f2bd7b6a7522f942880bc77d9650e9ab88cb1a000e4f62b4` |

The MD5 is retained only to match earlier records; SHA-256 is the value to verify against. The build
reviewed by the four evidence reviewers was the earlier `60a54485fbf38bace6c8e2d8d851b921`, which is a
different artifact and is not superseded by these values.

> **What this section establishes.** Internal consistency only: that the model computes what it claims
> to compute, and that the interface reports it without distortion. **It establishes nothing about
> empirical truth** — not that the modelled pathways are likely, not that the causal structure is
> correct, and not that the conditional half corresponds to anything in the world. A model can be
> perfectly self-consistent and still wrong about reality.

## Commands

```sh
./validate.sh           # rebuild check, then all three suites below; exits non-zero on any failure
```

Individually:

```sh
./run_tests.sh              # 155 assertions over the rule engine and the presentation layer
./headless_checks.sh        # 10 routes x 2 viewports, headless Chrome
python3 contrast_check.py   # 22 foreground/background pairs x 3 theme states
```

## Results

| Check | Scope | Result |
|---|---|---|
| `run_tests.sh` | 155 assertions: rule engine, three-valued logic, structural invariants, information architecture, vocabulary discipline | **155 passed, 0 failed** |
| `headless_checks.sh` | 7 canonical routes plus 3 legacy redirects, at 1440px and 1180px | **all clean**: no console errors, no page-level horizontal scrolling, exactly one `h1` and one navigation region per screen, no heading-level skips, glossary focus returned to its invoker, every graph node and edge keyboard-focusable with an ARIA label |
| `contrast_check.py` | 22 pairs the design actually uses, in light, system-dark and explicitly-dark | **66/66 pass** (22 × 3) |

Within `run_tests.sh`, one assertion is a **7,200-combination sweep** of the structural invariant that
no node can occur while a required predecessor does not.

Seven assertions pin the published three-valued semantics of Table B.1 directly (`K0`-`K6`): the three
conjunction cells including both `U AND F` orderings, the three disjunction cells, and one guard
confirming the synthetic operands really are true, false and unresolved — without which the six could
pass vacuously. They drive the production evaluator by appending synthetic nodes to `NODES`, calling
`evaluate()`, then removing them; no second copy of the logic exists in the tests. Switching the
conjunction to standard strong Kleene fails `K1` and `K2` and exits non-zero.

## Model size

| | |
|---|---|
| Nodes | 34 (16 documented and locked, 5 safeguards, 4 consequence endpoints) |
| Typed edges | 32 — 9 sequence, 10 mechanism, 11 required, 2 block |
| Scenario settings | 9 (7 core, 2 advanced) |
| Chapters | 5 |
| Glossary entries | 39, in 3 groups |

## Failure detection

The suite was checked against deliberate corruption in a temporary copy, and detected each:

| Corruption | Detected by | Exit status |
|---|---|---|
| Harmful-objective gate widened to admit the baseline setting | 3 assertions | non-zero |
| An expected result in a test altered | 1 assertion | non-zero |
| A colour token moved below its threshold | `contrast_check.py` | non-zero |
| Conjunction switched to standard strong Kleene | `K1`, `K2` | non-zero |

## The ten invariants

Each is a named assertion in `acceptance_tests.js`, run by the command above.

| # | Invariant | Assertion | Method |
|---|---|---|---|
| 1 | Changing one setting affects only nodes that depend on it | `I1` | One-at-a-time perturbation across all 9 settings and every alternative value, compared against a transitively computed dependency set |
| 2 | Unknown inputs propagate to *cannot be determined* | `I2` | Baseline evaluation: publication control, release authority, rollback and the bypass step all resolve undetermined, and no consequence is reachable |
| 3 | *Duty on paper* does not activate a technical safeguard | `I3` | Binding duty occurs; implementation, publication control and rollback do not |
| 4 | A verified, effective governance package changes only the intended technical control | `I4` | Exactly three safeguard nodes move — `sg_gov_duty`, `sg_gov_implemented`, `sg_publication_control` — and no others |
| 5 | Repository write access alone never implies release or downstream adoption | `I5` | Both *trusted release write* and *full release authority*, with everything else at baseline, leave tampering, publication and adoption unreached |
| 6 | A reachable consequence has every required predecessor satisfied | `I6`, plus the 7,200-combination sweep | Walks each consequence's required closure in its own illustrative scenario |
| 7 | Removing any required predecessor makes the consequence unreachable or indeterminate | `I7` | **Ablation**: for each consequence, every setting the scenario changed is reverted one at a time; the consequence must stop being reachable in every case |
| 8 | Protective disruption can occur when a defence succeeds, without being counted as attacker-caused harm | `I8` | In the protective scenario it occurs while privacy loss, wrong outputs and direct disruption do not; it does not route through consequential use |
| 9 | Guided chapters and the full model use the same state and rules | `I9` | Repeated evaluation across three scenarios; all views call one `evaluate(P)` |
| 10 | Reset restores the evidence-limited baseline | `I10` | A fully scrambled parameter set is shown to differ, and reset is shown to reproduce the baseline evaluation exactly |

## Negative controls

Two, both passing:

- **`NC`** — settings *outside* a consequence's pathway never move that consequence. Every parameter
  not referenced by the pathway is swept through every alternative value against the open scenario.
- **Matched scenario comparison** — the two governance scenarios hold the target consequence and the
  core scenario fixed while varying **four** settings together: governance package, publication
  authorisation, detection timing and rollback capability. The outcome change is therefore
  attributable to that combination, never to legal coverage alone. `I4` separately pins the narrower
  fact that varying the governance package alone moves exactly three safeguard nodes and no others.

The ablation in `I7` is itself a negative control in the other direction: it verifies that the model
does not reach a consequence through some path the stated requirements do not capture.

## Known limits of this validation

- **Structural uncertainty is untested and untestable here.** Missing nodes and wrong arrows dominate
  the conclusions, and no assertion in this suite can detect either.
- **Three checks need a human**: screen-reader output, judgement of tab order, and an in-browser
  accessibility audit served over HTTP.
- **The headless sweep requires Google Chrome at the standard macOS path.** `validate.sh` reports a
  skip and exits non-zero if it is absent, rather than passing silently. A full run takes a few
  minutes, most of it in that sweep.
- **`model.js` has changed once behaviourally** since the model was frozen — `sg_gov_duty`, so that a
  governance package asserting legal coverage makes the binding-duty node occur. The change is
  isolated: no rule reads that node. `I3` pins the behaviour that matters. A second, non-behavioural
  edit adds the comment at `test()` explaining the conjunction semantics; it changes no output.
- **The conditional half of the model cites no sources by construction.** That is a property of the
  evidence, not a defect in the tests.
