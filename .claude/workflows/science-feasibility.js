export const meta = {
  name: 'science-feasibility',
  description: 'Survey unsolved scientific problems and rank them by how tractable they look for an Opus 5 class model',
  whenToUse:
    'When you want a ranked, skeptically-vetted shortlist of open scientific problems worth attacking with a model, plus a theory of attack for each. It does NOT attempt solutions. Pass args.profile to choose what counts as a good target: "open-problem" (default) hunts genuine open questions where a solution is the deliverable; "crosswalk" hunts auditable bookkeeping with a high success rate.',
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
// Two profiles, because "feasible" means different things depending on what you
// will accept as an outcome.
//
//   crosswalk     — tuned by runs 1-2 (see docs/science-feasibility/). Optimizes
//                   for a deliverable that ships whether or not the headline
//                   claim lands. High success rate; the deliverables are
//                   auditable bookkeeping rather than solved questions.
//   open-problem  — the default. Optimizes for genuine open questions where a
//                   solution is the only deliverable. Most attempts fail, and
//                   that is priced in: the rubric drops null-publishability and
//                   spends the weight on whether a solution would be short
//                   enough to find and checkable once found.

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

const PROFILES = {
  'open-problem': {
    label: 'genuine open questions',
    prospecting: `
Hunt real open questions — ones where the deliverable is a resolution, not a table about the literature. Most attempts on these fail. That is accepted here and you should not compensate by drifting toward safe bookkeeping projects; a candidate whose deliverable is a survey, a crosswalk, or an audit does not belong in this run.

The strongest signal, which run 3 found in every entry that survived with its value intact:

> A field with an accumulating body of SUFFICIENT conditions and no necessity or obstruction machinery at all.

That asymmetry is reliable because sufficiency is what constructive methods and automated search produce, so the necessity side is structurally under-attacked. It generalizes: prefer problems where the NEGATIVE direction is the deliverable. "Certify that no object of this kind exists in this explicitly delimited class" is publishable at every class size, is self-certifying, and is what a model is differentially good at — exhaustive, error-prone, symbolic case analysis that humans avoid. Record-beating framings — find a denser packing, a better function, a new solvable model — have no partial credit and compete against decades of specialist tooling.

Two structural properties that decide whether a plan runs at all:

- The object space is finite and enumerable at a size you can state in advance — graphs on at most 8 vertices, magmas of order at most 15, presentations of total length at most L. Then "we swept class C and found nothing" is itself the result.
- A reformulation exists that turns an existential real-quantifier problem into ideal membership or LP feasibility at fixed low degree: moments instead of eigenvalues, invariants instead of coordinates, transfer operators instead of the full Hilbert space. This is usually the difference between a plan that terminates and one that dies at "elimination did not finish."

What makes a genuine open problem attackable:

- A resolution would be short. A counterexample small enough to exhibit and check, a construction whose certificate fits on a page, a proof measured in pages rather than volumes. Length is the binding constraint on what can be found in one run, and a short solution is also self-certifying in a way a long one is not.
- The statement is precise and its status is documented — you can tell what has been ruled out and by whom. Formalized in Lean or mathlib is ideal; plausibly formalizable is good.
- There is a named barrier, and you can say whether your angle evades it. Relativization, natural proofs, algebrization in complexity; a documented analytic wall in stat mech; a specific obstruction that killed prior attempts. A named barrier you can reason about is worth more than vague hardness, because it converts "is this hopeless" into a checkable question.
- A specific angle is identifiable that serious attackers plausibly have not exhausted — and you must name it. An equivalent reformulation into a theory with developed machinery that nobody has pushed through; a structural fact that reduces a search space by a real factor; a lemma from an adjacent field that applies. "More compute" is not an angle. "A model is smart" is not an angle.
- Special cases and improved bounds count. A resolved case of an open conjecture, or a bound moved in the direction the machinery natively works, is a real result even when the full problem stays open. Prefer problems that admit these.

What to avoid:

- Monuments. Riemann, P vs NP, Navier-Stokes, Hodge. Attacking these is not a plan, and a shortlist containing them is a shortlist that did no work.
- Anything whose resolution plainly requires a definition or framework nobody has yet. That is a research programme, not a target.
- Days-old announcements. Recency is negative value — the crowd is fastest exactly where the problem is newest, and one earlier candidate lost two of three sub-questions to a blog comment thread inside 24 hours.
- Pushing a published search frontier by re-implementing the known method. Frontiers sit where a competent person already spent the constant factors: a model buys 2-10x, the next step usually costs 10-1000x. Admit one of these only when a specific >=10x structural reduction is identifiable before any code is written.
- Problems whose only checkable output is an informal argument. If a wrong answer looks exactly like a right one, the run emits a false result into the record and that is worse than no attempt.
- Anything already closed. Check before returning it, and treat folklore and unpublished-but-known results as closed.

Three mistakes cost more points than anything else in run 3. Check each before returning a candidate:

- Assuming the space is unswept. Four of eleven entries lost half or all their value to a published algorithm that already outputs the objects the plan meant to find. Search specifically for an automated pipeline in the target literature, not just for the result. "Nobody has swept this programmatically" is a claim that requires a citation.
- Attacking a proxy for the real property. Spectra instead of the operator algebra, convex hulls instead of the bodies, admissible multisets instead of full spectra with placement. The proxy is always cheaper to compute and provably decides a different question. Confirm on a worked example that the computed predicate is logically equivalent to the target property.
- A kill condition that cannot fire. Two entries specified exits that arithmetic shows will always pass. Compute the kill condition at pitch time rather than asserting it — a probe whose only possible outcome is "proceed" is not instrumented.

For every candidate, name the barrier the angle must evade, and say how someone would learn cheaply that the angle fails.`,
    axes: {
      verifiability:
        '0-5: a claimed resolution is checkable by something external and pre-existing — a proof-assistant kernel, an exhibited object verified by direct computation, a certificate a referee can check mechanically. Reserve 5 for machine-checkable. A problem whose answer can only be argued for scores 0-2',
      certificateSize:
        '0-5: if a resolution exists, it is plausibly short enough to be found and written in one concerted effort — a small counterexample, a page-length construction, a proof of ordinary paper length. 1 if the expected solution is a monograph',
      untriedAngle:
        '0-5: a specific, named angle exists that serious prior attackers plausibly have not exhausted. 5 if the angle is concrete and its novelty is arguable from the literature; 0 if the only angle on offer is more effort or more compute',
      barrierClarity:
        '0-5: the obstruction that has kept this open is named and understood well enough to say whether the proposed angle evades it. High scores mean hopelessness is cheaply checkable; low scores mean the run cannot tell whether it is wasting itself',
      reformulationSurface:
        '0-5: the problem plausibly maps into a framework with developed machinery, and that mapping is not the standard one every specialist already tries',
      partialCredit:
        '0-5: special cases, improved bounds, or resolved sub-lemmas are themselves real results, so a run that falls short of the full problem still lands something',
      decomposability:
        '0-5: splits into sub-lemmas or cases that can be attacked and banked independently',
    },
    scoringNotes: `Verifiability and certificate size carry the most weight. Together they decide whether a run can find a resolution at all and know it has one — everything else only matters if those two hold.

Be strict about untriedAngle. This is where optimism leaks in. An angle that a specialist would recognize as the obvious first thing to try is not untried, whatever the literature happens to have written down. If you cannot name the angle in one sentence, score it 0.

Do not inflate scores to fill a list. A short honest shortlist is the useful output; a long one padded with monuments and vague hardness is not.`,
    extraCandidateFields: {
      namedBarrier: {
        type: 'string',
        description: 'the specific documented obstruction that has kept this open, and what a successful attack would have to do about it',
      },
      angle: {
        type: 'string',
        description: 'the specific angle that plausibly has not been exhausted, in one or two sentences, concrete enough to argue about',
      },
    },
  },

  crosswalk: {
    label: 'auditable deliverables with a high success rate',
    prospecting: `
The single highest-yield target, which run 2 converged on from five independent directions:

> Two or more authoritative sources describing the same objects under the same or translatable formalism, with no published crosswalk between them, where at least one source date-stamps its records.

The deliverable there is the crosswalk itself, not a discrepancy. That matters because the hit rate on finding discrepancies is nearly always low, while the joined table has value whether or not anything disagrees. In nine of ten run-2 candidates the headline claim turned out to be occupied and the unmaintained joined table did not — so prefer the table from the start rather than being forced into it later.

Also good, in rough order:

- Claims with expiry dates. One side of a live dispute made a dated, reversible prediction that later data can now check. A genuine out-of-sample test is worth more than any other single property.
- Entries on maintained record tables where the record-holder's method is published and the symmetry it exploits is narrow.
- Refereed claims resting on a control the authors never ran, where the control set is assemblable from public data whose sufficiency is obvious on inspection.

What to avoid. Each of these killed something in a previous run:

- The normalization play: "n papers report the deciding quantity in incompatible units, so rebuild them onto one axis and the dispute becomes arithmetic." Whether the data can resolve the dispute is only knowable after building the whole table, and convention chaos is usually a symptom of an underdetermined measurement rather than its cause. Admit only if input sufficiency is confirmable up front.
- The compute-frontier play: "the obstruction is engineering, so push the known search one step." Admit only if a specific >=10x state-space reduction is identifiable before any code is written.
- "Nobody has cross-checked this because it is tedious." Usually false, and false in a specific way: the adjudicating body is often the ingesting body. Name the body that would have done the check and say why it has not.
- Assuming two sources are independent silos. Check membership overlap and mutual citation first — a cross-silo edge evaporates when the silos turn out to be one room.
- Days-old announcements. Recency is negative value.
- Definitional disputes dressed as empirical ones. Ask whether a perfect measurement would settle it. If not, the best available deliverable is legibility tooling.
- Promising to build a table that already exists. Search for it first.

For every candidate, state how someone would find out cheaply that it is hopeless, and what ships if the headline claim fails.`,
    axes: {
      verifiability:
        '0-5: can a candidate answer be checked cheaply and unambiguously by something external — a proof kernel, a truth table, held-out data the claim was not fit to. Not "a careful audit trail"',
      costToKill:
        '0-5: 5 if a bounded, concretely specified probe falsifies the central assumption in the first hour; 1 if learning it is hopeless requires building the deliverable',
      searchShape: '0-5: the space of candidate answers is structured enough to search rather than astronomically flat',
      priorArtLeverage:
        '0-5: progress plausibly comes from connecting existing results across silos, which is where a model has an edge over a specialist',
      decomposability:
        '0-5: splits into sub-lemmas or cases that can be attacked and banked independently, so a stalled run still emits something',
      inputSufficiency:
        '0-5: the public inputs demonstrably carry enough resolution to separate the hypotheses, and that can be confirmed before the work rather than after',
      nullPublishable:
        '0-5: if the headline claim fails — no discrepancy found, no record moved — something complete and useful still ships. 5 if the null result is itself the artifact; 0 if a failed headline claim leaves nothing',
    },
    scoringNotes: `Verifiability and cost-to-kill carry the most weight. A problem where a wrong answer looks exactly like a right one is worse than no attempt, and an earlier run carried twelve doomed candidates to full write-up because none could be falsified before the project was essentially complete.

Null-publishability is the tiebreaker. If nothing ships when the headline claim fails, cap the total at 15 regardless of the other axes and say so in theoryOfAttack.`,
    extraCandidateFields: {
      shipsOnNull: {
        type: 'string',
        description: 'the concrete artifact that exists at the end even if the headline claim comes back empty',
      },
    },
  },
};

const profile = PROFILES[args?.profile ?? 'open-problem'];
if (!profile) throw new Error(`unknown profile: ${args?.profile} — expected one of ${Object.keys(PROFILES).join(', ')}`);

const AXES = Object.keys(profile.axes);
const MAX_TOTAL = AXES.length * 5;

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
          whatWouldCount: {
            type: 'string',
            description: 'what a checkable answer looks like — a proof, a construction, a counterexample, a fit to specific data',
          },
          cheapProbe: {
            type: 'string',
            description: 'the bounded action — one download, one lookup, one calibration against a known answer — that would reveal within an hour that this is hopeless',
          },
          sources: { type: 'array', items: { type: 'string' } },
          ...profile.extraCandidateFields,
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
            required: AXES,
            properties: Object.fromEntries(Object.entries(profile.axes).map(([k, d]) => [k, { type: 'number', description: d }])),
          },
          total: { type: 'number', description: `sum of the ${AXES.length} axes, max ${MAX_TOTAL}` },
          theoryOfAttack: {
            type: 'string',
            description: 'the specific reason to think a model could crack this — which capability meets which structural feature of the problem',
          },
          firstMove: { type: 'string', description: 'the concrete opening step a solving run should take' },
          killCondition: {
            type: 'string',
            description: 'the observation that should make a solving run abandon this problem early — and it must be observable well before the project is finished',
          },
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
            description:
              'fatal: the problem is closed, misstated, or the attack is provably a dead end. serious: the attack likely fails but the problem is real and a different angle might work. minor: a real caveat that changes cost, not viability. none: no objection found',
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
log(`Surveying ${DOMAINS.length} domains — profile: ${profile.label}`);

const perDomain = await pipeline(
  DOMAINS,

  (d) =>
    agent(
      `Find open scientific problems in this area that are still genuinely unsolved as of today, and that look tractable to a very strong reasoning model working from public information alone — no lab access, no new data collection, no proprietary datasets.

Domain: ${d.brief}

Search the literature and recent preprints — do not work from memory alone, since the frontier moves and half-remembered problems are often already closed. Verify each is still open before returning it. Prefer problems that are precisely stated and whose answers are checkable over problems that are merely famous; a sharp unresolved special case is worth more here than the big conjecture it sits under.
${profile.prospecting}

Return 5-8 candidates. Do not attempt to solve anything.`,
      { label: `survey:${d.key}`, phase: 'Survey', schema: CANDIDATES },
    ),

  (survey, d) =>
    survey &&
    agent(
      `Score each of these open problems on how likely a frontier reasoning model is to make real progress on it, with no lab access and no new data collection.

${JSON.stringify(survey.candidates, null, 2)}

Score each dimension in the schema 0-5 and set total to their sum (max ${MAX_TOTAL}).

${profile.scoringNotes}

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

Serious people have worked on all of these. For each, say what those people tried, why it failed, and whether the proposed angle is meaningfully different from what has already been tried and failed — or the same idea wearing new clothes. A model rediscovering a known dead end is the failure mode to catch here.

Where a candidate names a barrier and claims to evade it, test that claim specifically: does the proposed angle actually get around the obstruction, or does it run straight into it one step later? Where a candidate names an untried angle, judge whether a specialist would call it untried or merely unwritten-down.

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

This run was prospecting for: ${profile.label}. Scores are out of ${MAX_TOTAL} on these axes: ${AXES.join(', ')}.

Survivors, scored and skeptically vetted, already ordered by adjusted score:
${JSON.stringify(survivors, null, 2)}

Killed during refutation — include these briefly with reasons so a later run does not resurrect them:
${JSON.stringify(killed, null, 2)}

Output markdown. Rank the survivors. For each: the problem statement, the score breakdown, the theory of attack, the concrete first move, the kill condition, and the surviving objections stated honestly rather than dismissed — a solving run needs to know what it is walking into. Where a skeptic offered a salvage, prefer the salvaged framing to the original.

Be honest about expected yield. These are real open problems and most attempts on them fail; say plainly which candidates are long shots that survived on the strength of one idea, and which are near-certain to yield something even if less than the full result. A solving run needs to know which kind it is picking up.

Then close with what the top-ranked problems have in common structurally. That pattern is the most reusable thing in this document, because it tells the next prospecting run what shape of problem to look for rather than just which ones. Be specific enough that the finding can be pasted into a prompt.

The audience is the next run, which will try to solve these. Write for that reader. Do not attempt any solution yourself.`,
  { label: 'synthesize', phase: 'Synthesize' },
);

return report;
