'use client';

import { useState } from 'react';
import type { Metadata } from 'next';

// Note: metadata export only works in server components; for client pages, set it in a parent.
// We export a title constant for reference.
export const PAGE_TITLE = 'Discovery';

type RunStatus = 'running' | 'completed' | 'failed' | 'queued';

interface DiscoveryRun {
  id: string;
  target_problem: string;
  bio_domains: string[];
  population_size: number;
  generations: number;
  status: RunStatus;
  progress: number;
  mechanisms_found: number;
  analogies_found: number;
  started_at: string;
  duration_seconds: number | null;
}

const PAST_RUNS: DiscoveryRun[] = [
  {
    id: 'run-089',
    target_problem: 'Distributed network routing with fault tolerance',
    bio_domains: ['Mycology', 'Entomology'],
    population_size: 100,
    generations: 50,
    status: 'completed',
    progress: 100,
    mechanisms_found: 14,
    analogies_found: 6,
    started_at: '2026-03-12T08:00:00Z',
    duration_seconds: 3420,
  },
  {
    id: 'run-090',
    target_problem: 'Adversarial robustness in image classifiers',
    bio_domains: ['Marine Biology', 'Neuroscience'],
    population_size: 150,
    generations: 75,
    status: 'running',
    progress: 63,
    mechanisms_found: 9,
    analogies_found: 3,
    started_at: '2026-03-12T14:30:00Z',
    duration_seconds: null,
  },
  {
    id: 'run-088',
    target_problem: 'Combinatorial optimization for vehicle routing',
    bio_domains: ['Entomology', 'Microbiology'],
    population_size: 200,
    generations: 100,
    status: 'completed',
    progress: 100,
    mechanisms_found: 21,
    analogies_found: 11,
    started_at: '2026-03-10T10:00:00Z',
    duration_seconds: 7890,
  },
  {
    id: 'run-087',
    target_problem: 'Program synthesis from natural language specifications',
    bio_domains: ['Molecular Biology'],
    population_size: 80,
    generations: 40,
    status: 'failed',
    progress: 34,
    mechanisms_found: 3,
    analogies_found: 0,
    started_at: '2026-03-09T16:00:00Z',
    duration_seconds: 1240,
  },
  {
    id: 'run-091',
    target_problem: 'Hyperparameter optimization for large language models',
    bio_domains: ['Neuroscience', 'Immunology'],
    population_size: 120,
    generations: 60,
    status: 'queued',
    progress: 0,
    mechanisms_found: 0,
    analogies_found: 0,
    started_at: '2026-03-13T09:00:00Z',
    duration_seconds: null,
  },
];

const BIO_DOMAINS = [
  'Mycology',
  'Entomology',
  'Marine Biology',
  'Neuroscience',
  'Molecular Biology',
  'Microbiology',
  'Botany',
  'Immunology',
  'Evolutionary Biology',
  'Biophysics',
];

const STATUS_STYLES: Record<RunStatus, string> = {
  running: 'badge-teal',
  completed: 'badge-green',
  failed: 'badge bg-red-900/40 text-red-400 border border-red-800/50',
  queued: 'badge bg-gray-800 text-gray-400 border border-gray-700/50',
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function DiscoveryPage() {
  const [selectedDomains, setSelectedDomains] = useState<string[]>(['Mycology', 'Entomology']);
  const [targetProblem, setTargetProblem] = useState('');
  const [populationSize, setPopulationSize] = useState(100);
  const [generations, setGenerations] = useState(50);
  const [submitted, setSubmitted] = useState(false);

  function toggleDomain(domain: string) {
    setSelectedDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    // In production, would call createDiscoveryRun() from api.ts
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="section-title text-2xl">Discovery Runner</h1>
        <p className="section-subtitle">
          Launch a new bio-inspired algorithm discovery pipeline run.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* Launch Form */}
        <div className="xl:col-span-2">
          <form onSubmit={handleSubmit} className="card space-y-5">
            <h2 className="text-sm font-semibold text-gray-200">New Discovery Run</h2>

            {/* Target Problem */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                Target Problem <span className="text-red-400">*</span>
              </label>
              <textarea
                value={targetProblem}
                onChange={(e) => setTargetProblem(e.target.value)}
                required
                rows={3}
                placeholder="Describe the computational problem to solve, e.g. 'Optimize load balancing across heterogeneous cloud nodes with dynamic workloads'"
                className="input-field resize-none"
              />
            </div>

            {/* Bio Domains */}
            <div>
              <label className="block text-xs text-gray-500 mb-2 font-medium">
                Biological Domains{' '}
                <span className="text-gray-600">({selectedDomains.length} selected)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {BIO_DOMAINS.map((domain) => {
                  const active = selectedDomains.includes(domain);
                  return (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => toggleDomain(domain)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors duration-150 ${
                        active
                          ? 'bg-primary-900/50 text-primary-300 border-primary-700/50 hover:bg-primary-900/70'
                          : 'bg-surface-secondary text-gray-500 border-white/10 hover:text-gray-300 hover:border-white/20'
                      }`}
                    >
                      {domain}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Population Size */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                Population Size:{' '}
                <span className="text-primary-400 font-mono">{populationSize}</span>
              </label>
              <input
                type="range"
                min={20}
                max={500}
                step={10}
                value={populationSize}
                onChange={(e) => setPopulationSize(parseInt(e.target.value))}
                className="w-full accent-primary-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-0.5 font-mono">
                <span>20</span>
                <span>500</span>
              </div>
            </div>

            {/* Generations */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                Generations: <span className="text-primary-400 font-mono">{generations}</span>
              </label>
              <input
                type="range"
                min={10}
                max={200}
                step={5}
                value={generations}
                onChange={(e) => setGenerations(parseInt(e.target.value))}
                className="w-full accent-primary-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-0.5 font-mono">
                <span>10</span>
                <span>200</span>
              </div>
            </div>

            {/* Estimated cost */}
            <div className="bg-surface-secondary rounded-lg px-3 py-2 text-xs text-gray-500 border border-white/5">
              <span className="text-gray-400 font-medium">Estimated compute:</span>{' '}
              ~{Math.round((populationSize * generations) / 100)} GPU-minutes
            </div>

            <button
              type="submit"
              disabled={submitted || selectedDomains.length === 0 || !targetProblem.trim()}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitted ? 'Run Queued...' : 'Launch Discovery Run'}
            </button>

            {submitted && (
              <p className="text-xs text-green-400 text-center animate-pulse">
                Run queued successfully.
              </p>
            )}
          </form>
        </div>

        {/* Past Runs */}
        <div className="xl:col-span-3 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Recent Runs
          </h2>
          {PAST_RUNS.map((run) => (
            <div key={run.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-primary-400 text-xs font-medium">{run.id}</span>
                    <span className={STATUS_STYLES[run.status]}>{run.status}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-snug">{run.target_problem}</p>
                </div>
              </div>

              {/* Progress bar (only for running) */}
              {run.status === 'running' && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span className="font-mono">{run.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full animate-pulse-slow"
                      style={{ width: `${run.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Stats row */}
              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                <span>
                  Domains:{' '}
                  <span className="text-gray-400">{run.bio_domains.join(', ')}</span>
                </span>
                <span>
                  Pop:{' '}
                  <span className="font-mono text-gray-400">{run.population_size}</span>
                </span>
                <span>
                  Gens:{' '}
                  <span className="font-mono text-gray-400">{run.generations}</span>
                </span>
                {run.mechanisms_found > 0 && (
                  <span>
                    Mechanisms:{' '}
                    <span className="text-primary-400 font-medium">{run.mechanisms_found}</span>
                  </span>
                )}
                {run.analogies_found > 0 && (
                  <span>
                    Analogies:{' '}
                    <span className="text-accent font-medium">{run.analogies_found}</span>
                  </span>
                )}
                {run.duration_seconds !== null && (
                  <span>
                    Duration:{' '}
                    <span className="font-mono text-gray-400">
                      {formatDuration(run.duration_seconds)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
