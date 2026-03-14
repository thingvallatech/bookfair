import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const stats = [
  {
    label: 'Total Mechanisms',
    value: '2,841',
    delta: '+12 this week',
    deltaPositive: true,
    icon: '⬡',
    color: 'teal',
  },
  {
    label: 'Analogies Found',
    value: '547',
    delta: '+34 this week',
    deltaPositive: true,
    icon: '⟷',
    color: 'teal',
  },
  {
    label: 'Algorithms Generated',
    value: '128',
    delta: '+7 this week',
    deltaPositive: true,
    icon: '⌬',
    color: 'amber',
  },
  {
    label: 'Best Benchmark Score',
    value: '94.3%',
    delta: '+2.1% vs last run',
    deltaPositive: true,
    icon: '◈',
    color: 'amber',
  },
];

const recentActivity = [
  {
    id: 1,
    type: 'analogy',
    message: 'New analogy discovered: Slime mold pathfinding → network routing optimization',
    time: '2 minutes ago',
    badge: 'Analogy',
    badgeColor: 'teal',
  },
  {
    id: 2,
    type: 'algorithm',
    message: 'Algorithm BioGen-047 achieved 91.2% on TSP benchmark suite',
    time: '18 minutes ago',
    badge: 'Algorithm',
    badgeColor: 'amber',
  },
  {
    id: 3,
    type: 'discovery',
    message: 'Discovery run #89 completed: 14 new mechanisms indexed from mycology corpus',
    time: '1 hour ago',
    badge: 'Discovery',
    badgeColor: 'green',
  },
  {
    id: 4,
    type: 'analogy',
    message: 'High-novelty analogy flagged: Cephalopod camouflage → adversarial robustness',
    time: '3 hours ago',
    badge: 'Analogy',
    badgeColor: 'teal',
  },
  {
    id: 5,
    type: 'benchmark',
    message: 'New benchmark suite "Graph Traversal v2" added with 24 test cases',
    time: '5 hours ago',
    badge: 'Benchmark',
    badgeColor: 'green',
  },
];

const quickNavItems = [
  {
    href: '/analogies',
    title: 'Analogy Browser',
    description: 'Explore bio-mechanism to CS-problem mappings with novelty and similarity scores.',
    icon: '⟷',
    color: 'teal',
  },
  {
    href: '/algorithms',
    title: 'Generated Algorithms',
    description: 'Browse all bio-inspired algorithms produced by the discovery pipeline.',
    icon: '⌬',
    color: 'teal',
  },
  {
    href: '/benchmarks',
    title: 'Benchmark Dashboard',
    description: 'Compare algorithm performance across standardized problem suites.',
    icon: '◈',
    color: 'amber',
  },
  {
    href: '/discovery',
    title: 'Discovery Runner',
    description: 'Launch new discovery runs and monitor pipeline progress in real time.',
    icon: '✦',
    color: 'amber',
  },
];

type BadgeColor = 'teal' | 'amber' | 'green';

function badgeClass(color: BadgeColor): string {
  return {
    teal: 'badge-teal',
    amber: 'badge-amber',
    green: 'badge-green',
  }[color];
}

export default function DashboardPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      {/* Hero */}
      <section className="pt-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center shrink-0 animate-glow">
            <span className="text-primary-400 text-xl font-bold">B</span>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
              BioSpark
            </h1>
            <p className="mt-1 text-lg text-primary-400 font-medium">
              Discovering algorithms nature already invented
            </p>
            <p className="mt-2 text-gray-400 text-sm max-w-xl">
              An automated research system that extracts biological mechanisms from scientific
              literature, identifies structural analogies to computational problems, and generates
              novel bio-inspired algorithms.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          System Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="card-hover group">
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-lg font-mono ${stat.color === 'teal' ? 'text-primary-500/70' : 'text-accent-500/70'}`}
                >
                  {stat.icon}
                </span>
              </div>
              <p className="stat-value">{stat.value}</p>
              <p className="stat-label">{stat.label}</p>
              <p
                className={`text-xs mt-2 font-medium ${stat.deltaPositive ? 'text-green-400' : 'text-red-400'}`}
              >
                {stat.delta}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Navigation */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Explore
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickNavItems.map((item) => (
            <Link key={item.href} href={item.href} className="card-hover group flex items-start gap-4">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  item.color === 'teal'
                    ? 'bg-primary-600/20 border border-primary-500/30 group-hover:bg-primary-600/30'
                    : 'bg-accent/10 border border-accent/20 group-hover:bg-accent/20'
                } transition-colors duration-150`}
              >
                <span
                  className={`font-mono text-sm ${item.color === 'teal' ? 'text-primary-400' : 'text-accent'}`}
                >
                  {item.icon}
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-100 group-hover:text-white transition-colors duration-150">
                  {item.title}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{item.description}</p>
              </div>
              <span className="ml-auto text-gray-600 group-hover:text-primary-400 transition-colors duration-150 shrink-0 mt-0.5">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Recent Activity
          </h2>
          <span className="text-xs text-gray-600">Live feed</span>
        </div>
        <div className="card divide-y divide-white/5">
          {recentActivity.map((item) => (
            <div key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 leading-relaxed">{item.message}</p>
                <p className="text-xs text-gray-600 mt-0.5">{item.time}</p>
              </div>
              <span className={`${badgeClass(item.badgeColor as BadgeColor)} shrink-0`}>
                {item.badge}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
