# Audit report

## 1. Verdict

**PASS WITH MINOR ISSUES.**

Every high-severity finding was fixed and re-verified. The residual issues are an environment
dependency for one of the four checks, and three accessibility checks that cannot be performed without
a person. Neither blocks inspection or reproduction of the artifact.

## 2. Checks performed

| Check | Command or method | Result |
|---|---|---|
| Release surface inventory | `ls -Al`, permission, symlink and size scan | 14 files, 380 KB, no symlinks, three executables as expected |
| Prohibited-term scan | Case-insensitive repository-wide pattern scan, including variants | Clean. Three benign matches confirmed by inspection: a browser flag, a shell positional parameter, and product/domain names that are incident content |
| Secret and credential scan | Pattern scan for keys, tokens, bearer headers, private keys, cloud identifiers, `.env` material; long base64/hex literals | No secrets. All matches were a model parameter name containing `authorization` and URL fragments |
| Absolute and home-directory paths | Pattern scan for user home directories and local file links | None. The only local file link points at a temporary file the check script creates |
| Version control | `git ls-files` against the enclosing tree | These files are untracked; there is no history for them to scan |
| Model counts | Recomputed from `model.js` and `ui.js` in the JavaScript runtime | 34 nodes, 32 typed edges, 9 settings, 5 chapters, 4 consequence endpoints, 5 safeguard nodes, 39 glossary entries, 7,200-combination sweep |
| Documented counts | Compared against `README.md` and `VALIDATION.md` | Five mismatches found and corrected (see §3) |
| Evidence attribution | Node-by-node review against the declared sources | Six corrections applied (see §3) |
| Artifact rebuild | `cat head.html model.js ui.js tail.html`, `cmp` against the committed file | Byte-identical, and idempotent across repeated runs |
| Assertions | `./run_tests.sh` | 148 passed, 0 failed, exit 0 |
| Failure detection | Corrupted a rule, a test expectation, and a colour token in temporary copies | All three detected; exit status non-zero in each case |
| Contrast | `python3 contrast_check.py` | 22 pairs x 3 theme states, 66/66, exit 0 |
| Routes and viewports | `./headless_checks.sh` | 10 routes, no console errors, one `h1` and one navigation region per view, focus returned to its invoker, ARIA labels on every node and edge |
| Offline operation | Inspection of every script and of the built artifact for network calls | No network access in the open, rebuild or validation paths. The artifact loads a remote font stylesheet and degrades to system faces without it |
| Dependencies | Import inspection | Standard library only; no manifest required; no JavaScript module imports |
| Code quality | Review of the release-bound sources | No wildcard imports, bare excepts, debug output, dead code, or stale markers. Both shell scripts use a strict mode and quote their variables |
| Encoding and portability | `file`, CRLF scan | UTF-8 throughout, LF newlines, executable bits correct |
| Internal links | Cross-checked every file reference in the documentation | All resolve |

## 3. Changes made

**`run_tests.sh` — high severity.** The script exited 0 regardless of the result, so a failing suite
reported success to any caller. The cause was that the JavaScript runtime writes program output to
standard error, so the captured output was always empty. The script now captures both streams, parses
the assertion summary, exits 1 on any failed assertion and exits 2 if the summary cannot be read at
all. Verified against three separate deliberate corruptions.

**`validate.sh` — added.** One offline command that confirms the artifact rebuilds byte-for-byte from
its four source files, then runs the assertions, the contrast audit and the route sweep, exiting
non-zero on any failure. The documentation previously listed three commands and no rebuild check.

**`model.js` — six evidence corrections.**

1. An edge attributed the absence of trajectory monitoring in one organisation's evaluation to the
   *other* organisation's detection of the intrusion. The two are separate events, detected by
   different parties at different times. The edge is removed and the correct relationship is stated on
   the node itself, together with a note that the appropriate target node does not exist in this model.
2. The detection node was renamed and re-scoped to the operator whose infrastructure was breached, and
   its source list narrowed accordingly. The later, separate recognition by the other organisation is
   described as distinct rather than folded into the same node.
3. The three excluded quantitative claims were described as unlocatable. They are retrievable; the
   reason for excluding them is that each rests on a single interested party's retrospective or
   counterfactual internal analysis without independent corroboration. The wording now says so.
4. A figure for the share of targets not exploitable through the intended route was attributed to the
   investigators. It originates with the benchmark authors and reaches the record through the
   investigators; it is now attributed that way and flagged as relayed rather than directly measured.
5. The coordination node held counted observations and interpretive characterisation at the same
   confidence. The mechanism now separates what was counted from what was interpreted, and the
   alternative explanation states that the interpretive reading should not carry the same weight.
6. A description of the network egress topology was carried on a node sourced to one organisation
   although the description belongs to the other. The source list and wording are corrected.

**`README.md` — counts and scope.** Corrected a node count, two route counts and a viewport count;
replaced a stale assertion breakdown; removed a sentence describing changes made during development;
documented the single validation command.

**`VALIDATION.md`** — updated the artifact checksum and date, added the recomputed model sizes, added
the failure-detection results, and recorded the environment dependency and runtime of the route sweep.

**`acceptance_tests.js`** — renamed one section heading that referred to the development process rather
than to what the section tests.

**`.gitignore` — added.** Three lines, covering operating-system and Python cache files.

## 4. Remaining issues

| Severity | File | Impact | Next action |
|---|---|---|---|
| Low | `headless_checks.sh` | The route sweep needs a specific browser at a fixed path, so it cannot run on a machine without it. `validate.sh` reports the skip and exits non-zero rather than passing silently. | Optional: accept a browser path through an environment variable |
| Low | `validate.sh` | A full run takes several minutes, nearly all of it in the route sweep. | None required; the runtime is documented |
| Low | — | Screen-reader output, tab-order judgement and an in-browser accessibility audit served over HTTP cannot be automated here. | A person should perform these once before release |
| Low | `model.js` | A node representing the delayed self-attribution by the second organisation would be the correct target for the trajectory-monitoring mechanism. It is deliberately not added: it is a candidate omission, not a defect. | Add only if it can be sourced, is non-duplicative, and is reflected in the model, interface, tests and report together |

## 5. Reproduction result

| Step | Command | Exit | Outcome |
|---|---|---|---|
| Rebuild | `cat head.html model.js ui.js tail.html > out.html; cmp out.html explorer.html` | 0 | Byte-identical, idempotent |
| Assertions | `./run_tests.sh` | 0 | 148 passed, 0 failed |
| Contrast | `python3 contrast_check.py` | 0 | 66/66 across three theme states |
| Routes | `./headless_checks.sh` | 0 | All routes clean at the tested viewport |
| Corrupted rule | `./run_tests.sh` in a temporary copy | 1 | 3 assertions failed as intended |
| Corrupted test expectation | `./run_tests.sh` in a temporary copy | 1 | Detected |
| Corrupted colour token | `python3 contrast_check.py` in a temporary copy | 1 | Detected |

The combined `validate.sh` run was verified stage by stage rather than in a single invocation, because
the route sweep exceeds the time limit of the environment used for this audit. Every stage passed.
`explorer.html` opens directly from the filesystem with no server, account, credential or private
dependency.

## 6. Release inventory

```
.gitignore
README.md               what the repository contains and how to run it
SOURCES.md              source provenance, and what the sources do not settle
VALIDATION.md           commands, results, model sizes and the ten structural invariants
AUDIT_REPORT.md         this report
explorer.html           the artifact; opens directly in a browser
head.html               document shell and styles
model.js                nodes, edges, settings, rules, sources, presets
ui.js                   rendering, routing and interaction
tail.html               closing fragment
acceptance_tests.js     148 assertions
run_tests.sh            assertion runner
headless_checks.sh      route and viewport sweep
contrast_check.py       contrast audit across themes
validate.sh             one offline command running all of the above
```

## 7. Addendum, 14 September 2026

The findings above record the audit as performed, and their figures are left unchanged. Three facts
have since moved:

- **The suite is now 155 assertions, not 148.** Seven sentinels (`K0`-`K6`) were added to pin the
  published three-valued semantics. They drive the production evaluator rather than reimplementing it,
  and switching the conjunction to standard strong Kleene fails `K1` and `K2` with a non-zero exit.
- **The files are now under version control and public.** Row 5 of section 2 reported them as
  untracked with no history to scan; that was true at the time of the audit. The repository now has
  history, so a future audit should scan it.
- **The release surface has grown** beyond the 14 files and 380 KB recorded in section 2, by
  `make_figures.sh` and the `figures/` directory.

`model.js` gained an explanatory comment at `test()` describing the conjunction semantics. It changes
no output: `explorer.html` rebuilds byte-identically and every figure regenerates unchanged.
