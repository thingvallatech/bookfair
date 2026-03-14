import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Algorithms',
};

type AlgorithmStatus = 'active' | 'evaluating' | 'archived' | 'failed';

interface Algorithm {
  id: string;
  name: string;
  generation: number;
  fitness_score: number;
  status: AlgorithmStatus;
  source_analogy: string;
  benchmark_suite: string;
  created_at: string;
}

const PLACEHOLDER_ALGORITHMS: Algorithm[] = [
  {
    id: 'alg-047',
    name: 'BioGen-047',
    generation: 12,
    fitness_score: 0.912,
    status: 'active',
    source_analogy: 'Slime mold pathfinding → network routing',
    benchmark_suite: 'TSP Standard v3',
    created_at: '2026-03-12T10:23:00Z',
  },
  {
    id: 'alg-046',
    name: 'BioGen-046',
    generation: 12,
    fitness_score: 0.887,
    status: 'evaluating',
    source_analogy: 'Quorum sensing → distributed consensus',
    benchmark_suite: 'Graph Traversal v2',
    created_at: '2026-03-11T18:00:00Z',
  },
  {
    id: 'alg-045',
    name: 'BioGen-045',
    generation: 11,
    fitness_score: 0.843,
    status: 'active',
    source_analogy: 'Cephalopod camouflage → adversarial robustness',
    benchmark_suite: 'MNIST Adversarial',
    created_at: '2026-03-10T09:15:00Z',
  },
  {
    id: 'alg-044',
    name: 'BioGen-044',
    generation: 11,
    fitness_score: 0.801,
    status: 'archived',
    source_analogy: 'Ant colony pheromones → TSP optimization',
    benchmark_suite: 'TSP Standard v3',
    created_at: '2026-03-08T14:30:00Z',
  },
  {
    id: 'alg-043',
    name: 'BioGen-043',
    generation: 10,
    fitness_score: 0.778,
    status: 'archived',
    source_analogy: 'Dendritic integration → feature hierarchies',
    benchmark_suite: 'CIFAR-10 Classification',
    created_at: '2026-03-07T11:00:00Z',
  },
  {
    id: 'alg-042',
    name: 'BioGen-042',
    generation: 10,
    fitness_score: 0.512,
    status: 'failed',
    source_analogy: 'CRISPR → program synthesis',
    benchmark_suite: 'SyGuS 2024',
    created_at: '2026-03-06T16:45:00Z',
  },
  {
    id: 'alg-041',
    name: 'BioGen-041',
    generation: 9,
    fitness_score: 0.833,
    status: 'active',
    source_analogy: 'Immune system clonal selection → hyperparameter optimization',
    benchmark_suite: 'HPO-Bench',
    created_at: '2026-03-05T08:20:00Z',
  },
  {
    id: 'alg-040',
    name: 'BioGen-040',
    generation: 9,
    fitness_score: 0.759,
    status: 'archived',
    source_analogy: 'Mycelium network → load balancing',
    benchmark_suite: 'Cloud Scheduling v1',
    created_at: '2026-03-04T13:10:00Z',
  },
];

const STATUS_STYLES: Record<AlgorithmStatus, string> = {
  active: 'badge-green',
  evaluating: 'badge-teal',
  archived: 'badge bg-gray-800 text-gray-400 border border-gray-700/50',
  failed: 'badge bg-red-900/40 text-red-400 border border-red-800/50',
};

function FitnessBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.85 ? 'bg-primary-500' : score >= 0.7 ? 'bg-accent' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden w-20">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-gray-300 w-10 text-right">{score.toFixed(3)}</span>
    </div>
  );
}

export default function AlgorithmsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="section-title text-2xl">Generated Algorithms</h1>
          <p className="section-subtitle">
            Bio-inspired algorithms produced by the discovery pipeline, sorted by fitness score.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="badge-green">
            {PLACEHOLDER_ALGORITHMS.filter((a) => a.status === 'active').length} Active
          </span>
          <span className="badge-teal">
            {PLACEHOLDER_ALGORITHMS.filter((a) => a.status === 'evaluating').length} Evaluating
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-secondary/50">
                <th className="table-header">Name</th>
                <th className="table-header">Generation</th>
                <th className="table-header">Source Analogy</th>
                <th className="table-header">Benchmark Suite</th>
                <th className="table-header">Fitness Score</th>
                <th className="table-header">Status</th>
                <th className="table-header">Created</th>
              </tr>
            </thead>
            <tbody>
              {PLACEHOLDER_ALGORITHMS.map((alg) => (
                <tr
                  key={alg.id}
                  className="hover:bg-surface-secondary/30 transition-colors duration-100 group"
                >
                  <td className="table-cell">
                    <span className="font-mono text-primary-400 font-medium text-xs">
                      {alg.name}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="font-mono text-gray-400 text-xs">Gen {alg.generation}</span>
                  </td>
                  <td className="table-cell max-w-xs">
                    <span className="text-gray-400 text-xs line-clamp-1">{alg.source_analogy}</span>
                  </td>
                  <td className="table-cell">
                    <span className="text-gray-400 text-xs">{alg.benchmark_suite}</span>
                  </td>
                  <td className="table-cell w-36">
                    <FitnessBar score={alg.fitness_score} />
                  </td>
                  <td className="table-cell">
                    <span className={STATUS_STYLES[alg.status]}>{alg.status}</span>
                  </td>
                  <td className="table-cell">
                    <span className="text-gray-600 text-xs font-mono">
                      {new Date(alg.created_at).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
          <p className="text-xs text-gray-600">
            Showing {PLACEHOLDER_ALGORITHMS.length} algorithms
          </p>
          <div className="flex gap-2">
            <button className="btn-secondary text-xs py-1 px-3">Previous</button>
            <button className="btn-secondary text-xs py-1 px-3">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
