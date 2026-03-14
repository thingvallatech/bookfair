import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Benchmarks',
};

interface BenchmarkEntry {
  rank: number;
  algorithm: string;
  suite: string;
  score: number;
  baseline_score: number;
  delta: number;
  runs: number;
  last_updated: string;
}

const LEADERBOARD: BenchmarkEntry[] = [
  {
    rank: 1,
    algorithm: 'BioGen-047',
    suite: 'TSP Standard v3',
    score: 0.943,
    baseline_score: 0.871,
    delta: 0.072,
    runs: 24,
    last_updated: '2026-03-12',
  },
  {
    rank: 2,
    algorithm: 'BioGen-041',
    suite: 'HPO-Bench',
    score: 0.921,
    baseline_score: 0.882,
    delta: 0.039,
    runs: 18,
    last_updated: '2026-03-11',
  },
  {
    rank: 3,
    algorithm: 'BioGen-045',
    suite: 'MNIST Adversarial',
    score: 0.912,
    baseline_score: 0.876,
    delta: 0.036,
    runs: 31,
    last_updated: '2026-03-10',
  },
  {
    rank: 4,
    algorithm: 'BioGen-046',
    suite: 'Graph Traversal v2',
    score: 0.887,
    baseline_score: 0.841,
    delta: 0.046,
    runs: 5,
    last_updated: '2026-03-11',
  },
  {
    rank: 5,
    algorithm: 'BioGen-043',
    suite: 'CIFAR-10 Classification',
    score: 0.843,
    baseline_score: 0.823,
    delta: 0.020,
    runs: 12,
    last_updated: '2026-03-09',
  },
  {
    rank: 6,
    algorithm: 'BioGen-040',
    suite: 'Cloud Scheduling v1',
    score: 0.817,
    baseline_score: 0.789,
    delta: 0.028,
    runs: 9,
    last_updated: '2026-03-08',
  },
  {
    rank: 7,
    algorithm: 'BioGen-044',
    suite: 'TSP Standard v3',
    score: 0.801,
    baseline_score: 0.871,
    delta: -0.070,
    runs: 7,
    last_updated: '2026-03-07',
  },
];

const SUITE_STATS = [
  { suite: 'TSP Standard v3', algorithms: 12, best: 0.943, baseline: 0.871 },
  { suite: 'Graph Traversal v2', algorithms: 8, best: 0.887, baseline: 0.841 },
  { suite: 'MNIST Adversarial', algorithms: 15, best: 0.912, baseline: 0.876 },
  { suite: 'HPO-Bench', algorithms: 6, best: 0.921, baseline: 0.882 },
  { suite: 'CIFAR-10 Classification', algorithms: 9, best: 0.843, baseline: 0.823 },
  { suite: 'Cloud Scheduling v1', algorithms: 4, best: 0.817, baseline: 0.789 },
];

function ScoreBar({ score, baseline }: { score: number; baseline: number }) {
  const scorePct = Math.round(score * 100);
  const baselinePct = Math.round(baseline * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 h-2 bg-white/5 rounded-full overflow-hidden w-24">
        {/* Baseline marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-gray-600 z-10"
          style={{ left: `${baselinePct}%` }}
          title={`Baseline: ${baseline.toFixed(3)}`}
        />
        {/* Score bar */}
        <div
          className={`h-full rounded-full ${score >= baseline ? 'bg-primary-500' : 'bg-red-500'}`}
          style={{ width: `${scorePct}%` }}
        />
      </div>
      <span className="font-mono text-xs text-gray-300 w-10 text-right">{score.toFixed(3)}</span>
    </div>
  );
}

export default function BenchmarksPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="section-title text-2xl">Benchmark Dashboard</h1>
        <p className="section-subtitle">
          Algorithm performance across standardized problem suites. Baseline markers indicate
          best-known classical results.
        </p>
      </div>

      {/* Suite overview cards */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Suite Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {SUITE_STATS.map((s) => {
            const improvement = ((s.best - s.baseline) / s.baseline) * 100;
            return (
              <div key={s.suite} className="card-hover">
                <p className="text-sm font-medium text-gray-200 leading-tight">{s.suite}</p>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-white font-mono">
                      {(s.best * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Best score</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${improvement > 0 ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {improvement > 0 ? '+' : ''}
                      {improvement.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">vs baseline</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-2">{s.algorithms} algorithms evaluated</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Leaderboard */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Leaderboard
        </h2>
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-secondary/50">
                  <th className="table-header w-12">Rank</th>
                  <th className="table-header">Algorithm</th>
                  <th className="table-header">Suite</th>
                  <th className="table-header">Score vs Baseline</th>
                  <th className="table-header">Delta</th>
                  <th className="table-header">Runs</th>
                  <th className="table-header">Updated</th>
                </tr>
              </thead>
              <tbody>
                {LEADERBOARD.map((entry) => (
                  <tr
                    key={`${entry.algorithm}-${entry.suite}`}
                    className="hover:bg-surface-secondary/30 transition-colors duration-100"
                  >
                    <td className="table-cell text-center">
                      {entry.rank <= 3 ? (
                        <span
                          className={`font-bold text-sm ${
                            entry.rank === 1
                              ? 'text-accent'
                              : entry.rank === 2
                                ? 'text-gray-300'
                                : 'text-amber-700'
                          }`}
                        >
                          #{entry.rank}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs font-mono">#{entry.rank}</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className="font-mono text-primary-400 font-medium text-xs">
                        {entry.algorithm}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-gray-400 text-xs">{entry.suite}</span>
                    </td>
                    <td className="table-cell w-44">
                      <ScoreBar score={entry.score} baseline={entry.baseline_score} />
                    </td>
                    <td className="table-cell">
                      <span
                        className={`font-mono text-xs font-medium ${entry.delta > 0 ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {entry.delta > 0 ? '+' : ''}
                        {(entry.delta * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-gray-500 text-xs">{entry.runs}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-gray-600 text-xs font-mono">{entry.last_updated}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Chart placeholder */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Performance Over Generations
        </h2>
        <div className="card flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-primary-600/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-primary-500/50 text-xl">◈</span>
            </div>
            <p className="text-sm text-gray-500">Recharts line chart — coming soon</p>
            <p className="text-xs text-gray-600 mt-1">
              Will plot fitness scores per generation across all active suites
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
