'use client';

import { useState } from 'react';
import AnalogyCard from '@/components/AnalogyCard';
import type { Analogy } from '@/lib/api';

const PLACEHOLDER_ANALOGIES: Analogy[] = [
  {
    id: '1',
    bio_mechanism: 'Slime mold (Physarum polycephalum) shortest-path foraging',
    cs_problem: 'Network routing optimization',
    source_domain: 'Mycology',
    novelty_score: 0.91,
    similarity_score: 0.87,
    description:
      'Slime mold extends pseudopodia to explore nutrients and reinforces successful paths, mirroring Dijkstra-like shortest-path behavior in distributed networks without central coordination.',
    tags: ['graph theory', 'distributed systems', 'optimization'],
    created_at: '2026-03-12T10:23:00Z',
  },
  {
    id: '2',
    bio_mechanism: 'Cephalopod chromatophore skin camouflage',
    cs_problem: 'Adversarial robustness in neural networks',
    source_domain: 'Marine Biology',
    novelty_score: 0.88,
    similarity_score: 0.72,
    description:
      'Octopus skin dynamically reconfigures chromatophore patterns to match backgrounds, analogous to adaptive perturbation masking that makes models robust to adversarial inputs.',
    tags: ['deep learning', 'adversarial ML', 'adaptation'],
    created_at: '2026-03-11T15:47:00Z',
  },
  {
    id: '3',
    bio_mechanism: 'Ant colony pheromone trail reinforcement',
    cs_problem: 'Combinatorial optimization (TSP)',
    source_domain: 'Entomology',
    novelty_score: 0.65,
    similarity_score: 0.94,
    description:
      'Ants deposit pheromone proportional to path quality; evaporation prevents premature convergence. Well-studied analogy underpinning Ant Colony Optimization algorithms.',
    tags: ['swarm intelligence', 'metaheuristics', 'graph traversal'],
    created_at: '2026-03-10T08:15:00Z',
  },
  {
    id: '4',
    bio_mechanism: 'Dendritic integration in pyramidal neurons',
    cs_problem: 'Feature hierarchy learning in deep networks',
    source_domain: 'Neuroscience',
    novelty_score: 0.79,
    similarity_score: 0.81,
    description:
      'Dendrites perform non-linear local computations before summation at the soma, structurally analogous to attention mechanisms aggregating features across depth.',
    tags: ['neural architecture', 'attention', 'neuroscience'],
    created_at: '2026-03-09T12:30:00Z',
  },
  {
    id: '5',
    bio_mechanism: 'CRISPR-Cas9 targeted genome editing',
    cs_problem: 'Precise program synthesis and code patching',
    source_domain: 'Molecular Biology',
    novelty_score: 0.95,
    similarity_score: 0.68,
    description:
      'Guide RNA directs Cas9 to a specific genomic locus for precise cuts, analogous to LLM-guided symbolic search for minimal code edits that satisfy correctness specifications.',
    tags: ['program synthesis', 'LLM agents', 'symbolic AI'],
    created_at: '2026-03-08T09:00:00Z',
  },
  {
    id: '6',
    bio_mechanism: 'Quorum sensing in bacterial colonies',
    cs_problem: 'Consensus algorithms in distributed systems',
    source_domain: 'Microbiology',
    novelty_score: 0.83,
    similarity_score: 0.89,
    description:
      'Bacteria emit and detect signal molecules to gauge population density before collectively switching gene expression, mirroring threshold-based consensus protocols like Raft.',
    tags: ['distributed consensus', 'multi-agent', 'threshold systems'],
    created_at: '2026-03-07T14:20:00Z',
  },
];

const DOMAINS = ['All Domains', 'Mycology', 'Marine Biology', 'Entomology', 'Neuroscience', 'Molecular Biology', 'Microbiology'];

export default function AnalogiesPage() {
  const [domain, setDomain] = useState('All Domains');
  const [minNovelty, setMinNovelty] = useState(0);
  const [search, setSearch] = useState('');

  const filtered = PLACEHOLDER_ANALOGIES.filter((a) => {
    const matchesDomain = domain === 'All Domains' || a.source_domain === domain;
    const matchesNovelty = a.novelty_score >= minNovelty;
    const matchesSearch =
      search === '' ||
      a.bio_mechanism.toLowerCase().includes(search.toLowerCase()) ||
      a.cs_problem.toLowerCase().includes(search.toLowerCase()) ||
      a.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchesDomain && matchesNovelty && matchesSearch;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="section-title text-2xl">Analogy Browser</h1>
        <p className="section-subtitle">
          Structural mappings between biological mechanisms and computational problems.
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-48">
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">Search</label>
            <input
              type="text"
              placeholder="mechanism, problem, or tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Domain filter */}
          <div className="w-52">
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">Domain</label>
            <div className="relative">
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="select-field pr-8"
              >
                {DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Min novelty */}
          <div className="w-48">
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">
              Min Novelty Score:{' '}
              <span className="text-primary-400 font-mono">{minNovelty.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={minNovelty}
              onChange={(e) => setMinNovelty(parseFloat(e.target.value))}
              className="w-full accent-primary-500 cursor-pointer"
            />
          </div>
        </div>

        <p className="text-xs text-gray-600 mt-3">
          Showing {filtered.length} of {PLACEHOLDER_ANALOGIES.length} analogies
        </p>
      </div>

      {/* Results grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-gray-500 text-sm">No analogies match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((analogy) => (
            <AnalogyCard key={analogy.id} analogy={analogy} />
          ))}
        </div>
      )}
    </div>
  );
}
