export const meta = {
  name: 'science-feasibility',
  description: 'Survey unsolved scientific problems and rank them by how tractable they look for an Opus 5 class model',
  whenToUse:
    'When you want a ranked, skeptically-vetted shortlist of open scientific problems worth attacking with a model, plus a theory of attack for each. It does NOT attempt solutions.',
  phases: [
    { title: 'Survey', detail: 'one agent per domain hunts genuinely open problems' },
    { title: 'Score', detail: 'rate each candidate against the tractability rubric' },
    { title: 'Refute', detail: 'skeptics grade the objections against each top candidate' },
    { title: 'Synthesize', detail: 'rank survivors, write the theory of attack for each' },
  ],
};

// Written in the post-Claude-5 prompting style: state the goal and the failure
// modes that actually matter, then get out of the model's way. No worked
// examples, no rule lists — those narrow the search more than they help.
//
// v2, informed by run 1 (docs/science-feasibility/run-01-report.md), which
// returned 0 survivors from 12 shortlisted. Three changes, all traceable to
// that run:
//   - Prospecting is steered away from the two archetypes that produced every
//     one of the 12 deaths, and toward the shapes that would have survived.
//   - The rubric drops two axes that carried no variance (every candidate
//     scored 4-5 on both) and adds cost-to-kill, whose absence is what let
//     twelve doomed candidates reach full write-up.
//   - Refutation grades severity instead of voting. Run 1 gave two skeptics a
//     unanimous-survival veto and told both to default to skepticism, which is
//     an unfalsifiable filter — nothing can survive it, so a 0/12 result
//     carried no information about the candidates.

const DOMAINS = args?.domains ?? [
  {
    key: 'pure-math',
    brief:
      'Pure mathematics and mathematical logic: open conjectures, unresolved cases of partially-proved theorems, combinatorial constructions nobody has found, problems already formalized in Lean/Coq or plausibly formalizable.',
  },
  {
    key: 'theory-cs',
    brief:
      'Theoretical computer science: complexity separations, open bounds on algorithms and data structures, unresolved constructions in coding theory, cryptanalysis, distributed systems impossibility results.',
  },
  {
    key: 'physics',
    brief:
      'Physics: unresolved theory questions, anomalies with existing public datasets, condensed-matter and statistical-mechanics models with unknown exact solutions, problems where the bottleneck is analysis rather than new apparatus.',
  },
  {
    key: 'bio-med',
    brief:
      'Biology and medicine: mechanisms unexplained despite large public datasets, drug repurposing and target hypotheses, protein and sequence questions, contradictions sitting unreconciled across published literature.',
  },
  {
    key: 'chem-materials',
    brief:
      'Chemistry, materials, and climate/energy: unexplained reaction mechanisms, materials design targets, catalysis puzzles, model discrepancies where the open question is which existing hypothesis is right.',
  },
];

// Carried forward from run 1's closing section. This is the part of the
// workflow that accumulates: each run's structural finding becomes the next
// run's prospecting filter.
const PROSPECTING = `
The single highest-yield target, which run 2 converged on from five independent directions:

> Two or more authoritative sources describing the same objects under the same or translatable formalism, with no published crosswalk between them, where at least one source date-stamps its records.

The deliverable there is the crosswalk itself, not a discrepancy. That matters because the hit rate on finding discrepancies is nearly always low, while the joined table has value whether or not anything disagrees. In nine of ten run-2 candidates the headline claim turned out to be occupied and the unmaintained joined table did not — so prefer the table from the start rather than being forced into it later.

Also good, in rough order:

- Claims with expiry dates. One side of a live dispute made a dated, reversible prediction that later data can now check. A genuine out-of-sample test is worth more than any other single property.
- Entries on maintained record tables where the record-holder's method is published and the symmetry it exploits is narrow. Refereed, unambiguous, and moving one is a real result.
- Smaller adjacent targets. For any famous open problem, ask whether a tracked incremental record sits next to it with a short certificate. Attacking the neighbour beats attacking the monument.
- Refereed claims resting on a control the authors never ran, where the control set is assemblable from public data whose sufficiency is obvious on inspection.

What to avoid. Each of these killed something in a previous run:

- The normalization play: "n papers report the deciding quantity in incompatible units, so rebuild them onto one axis and the dispute becomes arithmetic." Whether the data can resolve the dispute is only knowable after building the whole table, and convention chaos is usually a symptom of an underdetermined measurement rather than its cause. Admit only if input sufficiency is confirmable up front.
- The compute-frontier play: "the obstruction is engineering, so re-implement the known search with better symmetry breaking and push one step." Published frontiers sit where a competent person already spent the available constant factors. A model buys 2-10x; the next step usually costs 10-1000x. Admit only if a specific >=10x state-space reduction is identifiable before any code is written.
- "Nobody has cross-checked this because it is tedious." Usually false, and false in a specific way: the adjudicating body is often the ingesting body. Name the body that would have done the check and say why it has not.
- Assuming two sources are independent silos. Check membership overlap and mutual citation first — a cross-silo edge evaporates when the silos turn out to be one room.
- "Cycle the full classical toolkit against the open entries." That is already the table maintainer's method, and the open entries are the fixed point of that sweep.
- Days-old announcements. Recency is negative value: the crowd is fastest exactly where the problem is newest.
- Definitional disputes dressed as empirical ones. Ask whether a perfect measurement would settle it. If not, the best available deliverable is legibility tooling.
- Promising to build a table that already exists. Search for it first.

For every candidate, state how someone would find out cheaply that it is hopeless, and state what ships if the headline claim fails. If the only way to learn it is hopeless is to do the project, or if a failed headline claim leaves nothing publishable, it does not belong on the list.
`;

const CANDIDATES = {
  type: 'object',
  required: ['candidates'],
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'statement', 'status', 'whyOpen', 'whatWouldCount', 'cheapProbe'],
        properties: {
          name: { type: 'string' },
          statement: { type: 'string', description: 'the open question, stated precisely enough to act on' },
          status: { type: 'string', description: 'what is currently known, what has been ruled out, most recent serious attempt' },
          whyOpen: { type: 'string', description: 'the actual obstruction, not "it is hard"' },
          whatWouldCount: { type: 'string', description: 'what a checkable answer looks like — a proof, a construction, a counterexample, a fit to specific data' },
          cheapProbe: { type: 'string', description: 'the bounded action — one download, one lookup, one calibration against a known answer — that would reveal within an hour that this is hopeless' },
          inputsSufficient: { type: 'string', description: 'why the public inputs plausibly carry enough resolution to settle it, and how that can be confirmed before committing' },
          sources: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};

const SCORED = {
  type: 'object',
  required: ['scored'],
  properties: {
    scored: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'scores', 'total', 'theoryOfAttack', 'firstMove', 'killCondition'],
        properties: {
          name: { type: 'string' },
          scores: {
            type: 'object',
            required: ['verifiability', 'costToKill', 'searchShape', 'priorArtLeverage', 'decomposability', 'inputSufficiency', 'nullPublishable'],
            properties: {
              verifiability: { type: 'number', description: '0-5: can a candidate answer be checked cheaply and unambiguously by something external — a proof kernel, a truth table, held-out data the claim was not fit to. Not "a careful audit trail"' },
              costToKill: { type: 'number', description: '0-5: 5 if a bounded, concretely specified probe falsifies the central assumption in the first hour; 1 if learning it is hopeless requires building the deliverable' },
              searchShape: { type: 'number', description: '0-5: the space of candidate answers is structured enough to search rather than astronomically flat' },
              priorArtLeverage: { type: 'number', description: '0-5: progress plausibly comes from connecting existing results across silos, which is where a model has an edge over a specialist' },
              decomposability: { type: 'number', description: '0-5: splits into sub-lemmas or cases that can be attacked and banked independently, so a stalled run still emits something' },
              inputSufficiency: { type: 'number', description: '0-5: the public inputs demonstrably carry enough resolution to separate the hypotheses, and that can be confirmed before the work rather than after' },
              nullPublishable: { type: 'number', description: '0-5: if the headline claim fails — no discrepancy found, no record moved — something complete and useful still ships. 5 if the null result is itself the artifact; 0 if a failed headline claim leaves nothing' },
            },
          },
          total: { type: 'number' },
          theoryOfAttack: { type: 'string', description: 'the specific reason to think a model could crack this — which capability meets which structural feature of the problem' },
          firstMove: { type: 'string', description: 'the concrete opening step a solving run should take' },
          killCondition: { type: 'string', description: 'the observation that should make a solving run abandon this problem early — and it must be observable well before the project is finished' },
          shipsOnNull: { type: 'string', description: 'the concrete artifact that exists at the end even if the headline claim comes back empty' },
        },
      },
    },
  },
};

const REFUTATION = {
  type: 'object',
  required: ['verdicts'],
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'severity', 'strongestObjection'],
        properties: {
          name: { type: 'string' },
          severity: {
            type: 'string',
            enum: ['fatal', 'serious', 'minor', 'none'],
            description: 'fatal: the problem is closed, misstated, or the attack is provably a dead end. serious: the attack likely fails but the problem is real and a different angle might work. minor: a real caveat that changes cost, not viability. none: no objection found',
          },
          strongestObjection: { type: 'string' },
          alreadySolved: { type: 'boolean', description: 'true only if this is closed, folklore, or misstated — cite what closed it' },
          salvage: { type: 'string', description: 'if the objection is fatal to the approach but not to the problem, the reformulation that would survive it' },
        },
      },
    },
  },
};

phase('Survey');
log(`Surveying ${DOMAINS.length} domains for open problems`);

const perDomain = await pipeline(
  DOMAINS,

  (d) =>
    agent(
      `Find open scientific problems in this area that are still genuinely unsolved as of today, and that look tractable to a very strong reasoning model working from public information alone — no lab access, no new data collection, no proprietary datasets.

Domain: ${d.brief}

Search the literature and recent preprints — do not work from memory alone, since the frontier moves and half-remembered problems are often already closed. Verify each is still open before returning it. Prefer problems that are precisely stated and whose answers are checkable over problems that are merely famous; a sharp unresolved special case is worth more here than the big conjecture it sits under.
${PROSPECTING}
Return 5-8 candidates. Do not attempt to solve anything.`,
      { label: `survey:${d.key}`, phase: 'Survey', schema: CANDIDATES },
    ),

  (survey, d) =>
    survey &&
    agent(
      `Score each of these open problems on how likely a frontier reasoning model is to make real progress on it, with no lab access and no new data collection.

${JSON.stringify(survey.candidates, null, 2)}

Score each dimension in the schema 0-5 and set total to their sum. Two axes deserve most of your attention:

Verifiability. A problem where a wrong answer looks exactly like a right one is worse than no attempt, because it consumes the run and emits a false result into the record. Reserve 5 for an external, pre-existing, cheap checker.

Cost-to-kill. An earlier run of this workflow carried twelve doomed candidates to full write-up because none of them could be falsified before the project was essentially complete. If the first move and the kill condition are the same activity, that is a low score, however elegant the problem.

Null-publishability is the tiebreaker that separated the survivors from the near-misses last run. Every candidate that held a positive score after refutation had a deliverable that a zero-discrepancy, zero-improvement outcome still completes. If nothing ships when the headline claim fails, cap the total at 15 regardless of the other axes and say so in theoryOfAttack.

The important field is theoryOfAttack. The next run will read it and try to actually solve the problem, so it needs to say why this problem might yield — which specific structural feature meets which specific model strength (formal verification loops, exhaustive case analysis, cross-domain literature synthesis, program search against a checker, reformulation into a solved framework). "The model is smart" is not a theory of attack. Neither is restating the problem. Say what the crack in it is.

Do not attempt to solve anything.`,
      { label: `score:${d.key}`, phase: 'Score', schema: SCORED },
    ),
);

const scored = perDomain.filter(Boolean).flatMap((r) => r.scored);
log(`${scored.length} candidates scored`);

// Verifiability below 4 is disqualifying regardless of total: the failure mode
// is a confident wrong answer, which is worse than no attempt.
const eligible = scored.filter((c) => (c.scores?.verifiability ?? 0) >= 4);
log(`${scored.length - eligible.length} dropped on the verifiability floor`);

phase('Refute');

const shortlist = eligible.sort((a, b) => b.total - a.total).slice(0, 15);

const verdicts = (
  await parallel([
    () =>
      agent(
        `Check whether these problems are actually still open.

${JSON.stringify(shortlist, null, 2)}

Search for recent resolutions, and treat folklore results and unpublished-but-known solutions as closed. Where a candidate proposes a method, check whether someone has already run that exact method and published the outcome — that is the most common way one of these dies.

Mark severity fatal only when you can point to what closed it. A problem you merely suspect is closed is serious, not fatal, and say what would settle it.`,
        { label: 'refute:openness', phase: 'Refute', schema: REFUTATION },
      ),
    () =>
      agent(
        `These problems are shortlisted as tractable for a model to attack. Argue the opposite for each, on grounds of difficulty rather than status.

${JSON.stringify(shortlist, null, 2)}

Serious people have worked on all of these. For each, say what those people tried, why it failed, and whether the proposed theory of attack is meaningfully different from what has already been tried and failed — or the same idea wearing new clothes. A model rediscovering a known dead end is the failure mode to catch here.

Grade honestly rather than defensively. Reserve fatal for an obstruction you can name that provably defeats this approach; use serious when the approach likely fails but the problem itself is still worth someone's attention, and fill in salvage with the angle that would survive your objection. A blanket "this is hard, experts failed" is not an objection — every open problem has that property, and grading everything fatal produces no information.`,
        { label: 'refute:difficulty', phase: 'Refute', schema: REFUTATION },
      ),
  ])
).filter(Boolean);

const PENALTY = { fatal: 99, serious: 6, minor: 2, none: 0 };

const objections = new Map();
for (const v of verdicts.flatMap((r) => r.verdicts)) {
  objections.set(v.name, [...(objections.get(v.name) ?? []), v]);
}

const assessed = shortlist.map((c) => {
  const vs = objections.get(c.name) ?? [];
  // Hard kill only for demonstrated closure, or for both skeptics independently
  // finding the approach fatal. A single fatal grade downgrades heavily but
  // leaves the candidate rankable — one skeptic's certainty is not a fact.
  const closed = vs.some((v) => v.alreadySolved);
  const bothFatal = vs.length > 1 && vs.every((v) => v.severity === 'fatal');
  return {
    ...c,
    objections: vs.map((v) => ({ severity: v.severity, objection: v.strongestObjection, salvage: v.salvage })),
    killed: closed || bothFatal,
    killReason: closed ? 'demonstrated closure' : bothFatal ? 'both skeptics fatal' : null,
    adjustedTotal: c.total - vs.reduce((sum, v) => sum + (PENALTY[v.severity] ?? 0), 0),
  };
});

const survivors = assessed.filter((c) => !c.killed).sort((a, b) => b.adjustedTotal - a.adjustedTotal);
const killed = assessed.filter((c) => c.killed);
log(`${survivors.length} of ${shortlist.length} survived refutation`);

phase('Synthesize');

const report = await agent(
  `Write the final ranked report on open scientific problems worth attacking with a frontier model.

Survivors, scored and skeptically vetted, already ordered by adjusted score:
${JSON.stringify(survivors, null, 2)}

Killed during refutation — include these briefly with reasons so a later run does not resurrect them:
${JSON.stringify(killed, null, 2)}

Output markdown. Rank the survivors. For each: the problem statement, the score breakdown, the theory of attack, the concrete first move, the kill condition, and the surviving objections stated honestly rather than dismissed — a solving run needs to know what it is walking into. Where a skeptic offered a salvage, prefer the salvaged framing to the original.

Then close with what the top-ranked problems have in common structurally. That pattern is the most reusable thing in this document, because it tells the next prospecting run what shape of problem to look for rather than just which ones. Be specific enough that the finding can be pasted into a prompt.

The audience is the next run, which will try to solve these. Write for that reader. Do not attempt any solution yourself.`,
  { label: 'synthesize', phase: 'Synthesize' },
);

return report;
