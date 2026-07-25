# science-feasibility

A workflow that surveys unsolved scientific problems and ranks them by how tractable
they look for a frontier model working from public information alone. It deliberately
does **not** attempt solutions — the output is a theory of attack per problem, so that
a later solving run starts with the reasoning already done.

Run it with `Workflow({ name: 'science-feasibility' })`, or pass
`args: { domains: [{ key, brief }, ...] }` to retarget the survey.

## Profiles

"Feasible" means different things depending on what counts as an acceptable outcome,
so `args.profile` picks the target shape.

- **`open-problem`** (default) — genuine open questions where a resolution is the only
  deliverable. Most attempts fail and that is priced in: the rubric spends its weight on
  whether a resolution would be short enough to find and checkable once found.
- **`crosswalk`** — auditable deliverables that ship whether or not the headline claim
  lands. High success rate, but the outputs are bookkeeping rather than resolutions.

The two profiles score on different axes. Both keep the verifiability floor and the
graded refutation.

Script: [`.claude/workflows/science-feasibility.js`](../../.claude/workflows/science-feasibility.js)

## Shape

Four phases, 13 agents. Survey → Score runs as a pipeline, so a domain begins
scoring as soon as its own survey lands rather than waiting on the slowest one.

| Phase | Agents | Does |
|---|---|---|
| Survey | 5, one per domain | Hunts genuinely open problems, verifying openness against live search |
| Score | 5, one per domain | Rates candidates on the tractability rubric, writes the theory of attack |
| Refute | 2, different lenses | One checks whether the problem is secretly closed; one checks whether the attack is a known dead end |
| Synthesize | 1 | Ranks survivors, records the killed, extracts the structural pattern |

Refutation grades objection severity rather than voting. Hard kills happen only on
demonstrated closure or two independent fatal grades — a single skeptic's certainty
downgrades a candidate but does not remove it.

## Rubric

Seven axes, 0–5 each, max 35. Verifiability below 4 is disqualifying rather than a
deduction: a problem whose failure mode is a confident wrong answer is worse than no
attempt, because it consumes the run and emits a false result into the record.

- **open-problem:** `verifiability` · `certificateSize` · `untriedAngle` ·
  `barrierClarity` · `reformulationSurface` · `partialCredit` · `decomposability`
- **crosswalk:** `verifiability` · `costToKill` · `searchShape` · `priorArtLeverage` ·
  `decomposability` · `inputSufficiency` · `nullPublishable`

## The loop

Each run's closing structural finding is folded back into the `PROSPECTING` constant
in the script, so the next run's survey starts where the last one's skepticism ended.
That constant is the accumulating part of this workflow; the rankings are its output.

| Run | Profile | Report | Outcome |
|---|---|---|---|
| 1 | crosswalk | [run-01-report.md](run-01-report.md) | 39 surveyed, 12 shortlisted, **0 survived** |
| 2 | crosswalk | [run-02-report.md](run-02-report.md) | 38 surveyed, 17 below the floor, 15 shortlisted, **10 survived** |
| 3 | open-problem | [run-03-report.md](run-03-report.md) | 37 surveyed, 24 below the floor, 13 shortlisted, **11 survived** |

### What run 1 taught run 2

Every one of the 12 deaths fell into one of two archetypes. **The normalization play**
("papers report the deciding quantity in incompatible units, so rebuild the table and
the dispute becomes arithmetic") fails because whether the data can resolve the dispute
is only knowable after building the whole table — and convention chaos is usually a
symptom of an underdetermined measurement, not its cause. **The compute-frontier play**
("the obstruction is engineering, so push the known search one step") fails on
arithmetic: published frontiers sit exactly where a competent person already spent the
available constant factors, and a model buys 2–10× where the next step costs 10–1000×.

Run 1 also exposed a defect in the filter rather than in the candidates. Two skeptics
held a unanimous-survival veto and both were told to default to skepticism, which is
unfalsifiable — so 0/12 carried no information. Separately the rubric saturated:
totals spanned 24–28 on a 30-point scale because `selfContained` and `resourceFree`
scored 4–5 for everything, the survey stage having already filtered on them.

### What run 2 taught run 3

Five domains converged independently on one target shape:

> Two or more authoritative sources describing the same objects under the same or
> translatable formalism, with no published crosswalk between them, where at least
> one source date-stamps its records.

In nine of ten surviving candidates the skeptics made the same correction: the headline
claim was already occupied, the unmaintained joined table was not. The salvage was
always *stop hunting the discrepancy, publish the crosswalk* — which is why
`nullPublishable` became a scored axis. The hit rate on discrepancies is low; a joined
table has value whether or not anything disagrees.

Two anti-patterns worth naming, both of which killed candidates in run 2. "Nobody has
cross-checked this because it's tedious" is usually false in a specific way — the
adjudicating body is often the ingesting body. And days-old announcements are the worst
possible target: one candidate lost two of its three sub-questions to a blog comment
thread inside 24 hours. Recency is negative value, because the crowd is fastest exactly
where the problem is newest.

### What run 3 taught run 4

Run 3 was the first under the `open-problem` profile. The verifiability floor did most
of the work — 24 of 37 candidates fell below it, against 17 of 38 in run 2, which is the
expected cost of hunting resolutions instead of tables.

Every entry that survived with its value intact shared one signal:

> A field with an accumulating body of **sufficient** conditions and no necessity or
> obstruction machinery at all.

That asymmetry is reliable because sufficiency is what constructive methods and automated
search produce, leaving the necessity side structurally under-attacked. It generalizes
into a target-selection rule: **prefer problems where the negative direction is the
deliverable.** "Certify that no object of this kind exists in this delimited class" is
publishable at every class size, is self-certifying, and is what exhaustive symbolic case
analysis is differentially good at. Record-beating framings have no partial credit and
compete against decades of specialist tooling.

Three mistakes cost more than anything else, and are now checked during prospecting:
**assuming the space is unswept** (four of eleven entries lost most of their value to a
published algorithm that already outputs the objects the plan meant to find);
**attacking a proxy for the real property** (spectra instead of the operator algebra —
the proxy is always cheaper and provably decides a different question); and **a kill
condition that cannot fire** (two entries specified exits that arithmetic shows always
pass, so the probe was never instrumented).
