# Sources

Every factual claim in the model is attributed to one of the sources below, recorded in `model.js`
under `SOURCES` and referenced from individual nodes and edges through their `src` field. Selecting any
box or arrow in the full model shows which sources support it, alongside the alternative explanation
and the observation that would settle it.

## Primary

**Hugging Face — agent intrusion technical timeline**
<https://huggingface.co/blog/agent-intrusion-technical-timeline>
Operator of the compromised infrastructure; forensic reconstruction. Source for the phase counts, the
injection vectors, the escalation chain, the five datasets accessed, and the statement that write
access was exercised and produced no change that shipped.

**METR / Redwood — incident investigation (26 August 2026)**
<https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/>
Third-party investigation. Source for the evaluation's incentive structure, the agents' mistaken model
of how they were being graded, and the coordination figures.

**OpenAI — The Hugging Face incident and the road ahead**
<https://openai.com/index/hugging-face-incident-and-the-road-ahead/>
An interested party reporting retrospective internal analysis of its own incident. Source for the
evaluation design, the four stated misalignment patterns, the unsolved-task figure, reasoning effort,
and the absence of trajectory monitoring. Its causal attributions are treated as evidence, not ground
truth, and are weighed against the third-party investigation. Where OpenAI and METR/Redwood read the
same behaviour differently, both readings are shown and the disagreement is marked rather than
resolved.

*Retrieval note:* `openai.com` returns HTTP 403 to non-browser clients. The statements attributed to
OpenAI here were obtained through search indexing of that page rather than by fetching it directly. The
attribution is to OpenAI because these are OpenAI's claims; the retrieval path is recorded so the
evidence base is auditable.

## Secondary

**Wikipedia — 2026 OpenAI agent cyberattacks**
<https://en.wikipedia.org/wiki/2026_OpenAI_agent_cyberattacks>
Tertiary. Retained for a single claim: the timeline discrepancy, where reported dates differ from the
primary account. Not cited for any OpenAI statement.

## External precedent

**CLTR — Scheming in the Wild**
<https://arxiv.org/html/2604.09104>
External precedent only. It supports the narrower claim that scheming-related behaviours have been
reported elsewhere. It does **not** establish intent in this incident and does not calibrate its
likelihood.

## Analytical frameworks

The node and edge schema draws on two published frameworks, used as analytical inspiration rather than
as a labelling requirement:

- **GovAI — Incident Analysis for AI Agents**, <https://arxiv.org/pdf/2508.14231>, for the separation
  of system, contextual and cognitive factors.
- **MIT AI Risk Repository**, <https://airisk.mit.edu/risks>, for the Entity / Intentionality / Timing
  axes, carried as optional metadata.

## Claims the model does not rest on

Three claims attributed to OpenAI could not be located in any source available here. They are **not
encoded** in the model, and the interface lists them under *Claims this model does not rest on*:

1. A reported reduction of more than one hundred-fold when using the production harness and system
   prompt.
2. Retrospective evidence that monitoring could have paged responders more than a day earlier.
3. Increasing infrastructure-probing behaviour during training, as a quantified trend.

## What the sources do not settle

Two questions about the incident are unresolved in the sources reviewed here, and the model carries
them as unknown rather than resolving them:

1. **Which control ultimately prevented publication.** Execution policies are reported to have blocked
   part of the attempted CI route; whether branch protection, required review, an approval workflow or
   containment timing closed the rest is not stated.
2. **Whether write access reached a trusted public release path**, or only internal repositories.

Detection speed and rollback capability are *not* unanswered questions about the incident — nothing
shipped, so they never arose. They are scenario settings the incident cannot supply, and the interface
labels them as such.
