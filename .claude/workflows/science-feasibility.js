export const meta = {
  name: 'science-feasibility',
  description: 'Survey unsolved scientific problems and rank them by how tractable they look for an Opus 5 class model',
  whenToUse:
    'When you want a ranked, skeptically-vetted shortlist of open scientific problems worth attacking with a model, plus a theory of attack for each. It does NOT attempt solutions.',
  phases: [
    { title: 'Survey', detail: 'one agent per domain hunts genuinely open problems' },
    { title: 'Score', detail: 'rate each candidate against the tractability rubric' },
    { title: 'Refute', detail: 'skeptic argues each top candidate is harder than it looks' },
    { title: 'Synthesize', detail: 'rank survivors, write the theory of attack for each' },
  ],
};

// Written in the post-Claude-5 prompting style: state the goal and the failure
// modes that actually matter, then get out of the model's way. No worked
// examples, no rule lists — those narrow the search more than they help.

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

const CANDIDATES = {
  type: 'object',
  required: ['candidates'],
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'statement', 'status', 'whyOpen', 'whatWouldCount'],
        properties: {
          name: { type: 'string' },
          statement: { type: 'string', description: 'the open question, stated precisely enough to act on' },
          status: { type: 'string', description: 'what is currently known, what has been ruled out, most recent serious attempt' },
          whyOpen: { type: 'string', description: 'the actual obstruction, not "it is hard"' },
          whatWouldCount: { type: 'string', description: 'what a checkable answer looks like — a proof, a construction, a counterexample, a fit to specific data' },
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
            required: ['verifiability', 'selfContained', 'searchShape', 'priorArtLeverage', 'decomposability', 'resourceFree'],
            properties: {
              verifiability: { type: 'number', description: '0-5: can a candidate answer be checked cheaply and unambiguously — proof assistant, code, held-out data' },
              selfContained: { type: 'number', description: '0-5: fully specified from public information, no tacit lab knowledge required' },
              searchShape: { type: 'number', description: '0-5: the space of candidate answers is structured enough to search rather than astronomically flat' },
              priorArtLeverage: { type: 'number', description: '0-5: progress plausibly comes from connecting existing results across silos, which is where a model has an edge over a specialist' },
              decomposability: { type: 'number', description: '0-5: splits into sub-lemmas or cases that can be attacked and banked independently' },
              resourceFree: { type: 'number', description: '0-5: needs no new experiment, instrument, or proprietary dataset' },
            },
          },
          total: { type: 'number' },
          theoryOfAttack: { type: 'string', description: 'the specific reason to think a model could crack this — which capability meets which structural feature of the problem' },
          firstMove: { type: 'string', description: 'the concrete opening step a solving run should take' },
          killCondition: { type: 'string', description: 'the observation that should make a solving run abandon this problem early' },
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
        required: ['name', 'survives', 'strongestObjection', 'adjustedTotal'],
        properties: {
          name: { type: 'string' },
          survives: { type: 'boolean' },
          strongestObjection: { type: 'string' },
          alreadySolved: { type: 'boolean', description: 'true if this turns out to be closed, folklore, or misstated' },
          adjustedTotal: { type: 'number' },
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
      `Find open scientific problems in this area that are still genuinely unsolved as of today, and that look tractable to a very strong reasoning model working from public information alone.

Domain: ${d.brief}

Search the literature and recent preprints — do not work from memory alone, since the frontier moves and half-remembered problems are often already closed. Prefer problems that are precisely stated and whose answers are checkable over famous ones that are merely famous. A sharp unresolved special case of a big conjecture is worth more here than the big conjecture. Verify each is still open before returning it.

Return 5-8 candidates. Do not attempt to solve anything.`,
      { label: `survey:${d.key}`, phase: 'Survey', schema: CANDIDATES },
    ),

  (survey, d) =>
    survey &&
    agent(
      `Score each of these open problems on how likely a frontier reasoning model is to make real progress on it, with no lab access and no new data collection.

${JSON.stringify(survey.candidates, null, 2)}

Score each dimension in the schema 0-5 and set total to their sum. Be harsh on verifiability in particular: a problem where a wrong answer looks exactly like a right one is close to worthless to attack, however interesting it is.

The important field is theoryOfAttack. The next run will read it and try to actually solve the problem, so it needs to say why this problem might yield — which specific structural feature of the problem meets which specific model strength (formal verification loops, exhaustive case analysis, cross-domain literature synthesis, program search against a checker, reformulation into a solved framework). "The model is smart" is not a theory of attack. Neither is restating the problem. Say what the crack in it is.

Do not attempt to solve anything.`,
      { label: `score:${d.key}`, phase: 'Score', schema: SCORED },
    ),
);

const scored = perDomain.filter(Boolean).flatMap((r) => r.scored);
log(`${scored.length} candidates scored`);

phase('Refute');

const shortlist = scored.sort((a, b) => b.total - a.total).slice(0, 12);

const verdicts = (
  await parallel([
    () =>
      agent(
        `Try to knock these problems off a shortlist of "worth attacking with a model". Assume the optimistic case has already been made; your job is the other side.

${JSON.stringify(shortlist, null, 2)}

For each, check whether it is actually still open — search for recent resolutions, and treat folklore results and unpublished-but-known solutions as closed. Then find the strongest reason the stated theory of attack fails: an obstruction that has already defeated this exact approach, a verification step that is not as cheap as claimed, a search space that is flatter than it looks, or a hidden dependence on data or apparatus.

Set survives=false when the objection is decisive. Default to skepticism when you are unsure.`,
        { label: 'refute:openness', phase: 'Refute', schema: REFUTATION },
      ),
    () =>
      agent(
        `These problems are shortlisted as tractable for a model to attack. Argue the opposite for each, on grounds of difficulty rather than status.

${JSON.stringify(shortlist, null, 2)}

Serious people have worked on all of these. For each, say what those people tried, why it failed, and whether the proposed theory of attack is meaningfully different from what has already been tried and failed — or whether it is the same idea wearing new clothes. A model rediscovering a known dead end is the failure mode to catch here.

Set survives=false when the objection is decisive. Default to skepticism when you are unsure.`,
        { label: 'refute:difficulty', phase: 'Refute', schema: REFUTATION },
      ),
  ])
).filter(Boolean);

const objections = new Map();
for (const v of verdicts.flatMap((r) => r.verdicts)) {
  const prior = objections.get(v.name) ?? [];
  objections.set(v.name, [...prior, v]);
}

const survivors = shortlist
  .map((c) => {
    const vs = objections.get(c.name) ?? [];
    return {
      ...c,
      objections: vs.map((v) => v.strongestObjection),
      killed: vs.some((v) => v.alreadySolved || v.survives === false),
      adjustedTotal: vs.length ? Math.min(...vs.map((v) => v.adjustedTotal ?? c.total)) : c.total,
    };
  })
  .filter((c) => !c.killed)
  .sort((a, b) => b.adjustedTotal - a.adjustedTotal);

log(`${survivors.length} of ${shortlist.length} survived refutation`);

phase('Synthesize');

const report = await agent(
  `Write the final ranked report on open scientific problems worth attacking with a frontier model.

Survivors, already scored and skeptically vetted:
${JSON.stringify(survivors, null, 2)}

Killed during refutation, with reasons — include these briefly so a later run does not resurrect them:
${JSON.stringify(
  shortlist.filter((c) => (objections.get(c.name) ?? []).some((v) => v.alreadySolved || v.survives === false)),
  null,
  2,
)}

Output markdown. Rank the survivors. For each, give the problem statement, the score breakdown, the theory of attack, the concrete first move, and the kill condition. Then close with what the top-ranked problems have in common structurally — that pattern is the most reusable thing in this document, because it tells the next run what kind of problem to look for, not just which ones.

The audience is the next run, which will try to solve these. Write for that reader. Do not attempt any solution yourself.`,
  { label: 'synthesize', phase: 'Synthesize' },
);

return report;
