import type { Analogy } from '@/lib/api';

interface AnalogyCardProps {
  analogy: Analogy;
  onClick?: (analogy: Analogy) => void;
}

function ScorePill({ label, value, color }: { label: string; value: number; color: 'teal' | 'amber' }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex flex-col items-center min-w-12">
      <div className="relative w-10 h-10">
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            strokeWidth="3"
            className="stroke-white/5"
          />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            strokeWidth="3"
            strokeDasharray={`${pct * 0.942} 94.2`}
            strokeLinecap="round"
            className={color === 'teal' ? 'stroke-primary-500' : 'stroke-accent'}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold font-mono text-gray-200">
          {pct}
        </span>
      </div>
      <span className="text-[10px] text-gray-600 mt-1 text-center leading-tight">{label}</span>
    </div>
  );
}

export default function AnalogyCard({ analogy, onClick }: AnalogyCardProps) {
  const handleClick = onClick ? () => onClick(analogy) : undefined;

  return (
    <div
      className={`card-hover group flex flex-col gap-4 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(analogy);
              }
            }
          : undefined
      }
    >
      {/* Header: domain badge + scores */}
      <div className="flex items-start justify-between gap-2">
        <span className="badge-teal">{analogy.source_domain}</span>
        <div className="flex gap-3 shrink-0">
          <ScorePill label="Novelty" value={analogy.novelty_score} color="teal" />
          <ScorePill label="Similarity" value={analogy.similarity_score} color="amber" />
        </div>
      </div>

      {/* Analogy mapping */}
      <div className="space-y-2">
        {/* Bio mechanism */}
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-primary-500 text-xs font-mono font-bold">BIO</span>
          <p className="text-sm font-medium text-gray-200 leading-snug">{analogy.bio_mechanism}</p>
        </div>

        {/* Arrow */}
        <div className="flex items-center gap-2 pl-8">
          <div className="h-px flex-1 bg-gradient-to-r from-primary-600/30 to-accent/30" />
          <span className="text-xs text-gray-600 font-mono">analogous to</span>
          <div className="h-px flex-1 bg-gradient-to-r from-accent/30 to-primary-600/30" />
        </div>

        {/* CS problem */}
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-accent text-xs font-mono font-bold">CS</span>
          <p className="text-sm font-medium text-gray-200 leading-snug">{analogy.cs_problem}</p>
        </div>
      </div>

      {/* Description */}
      {analogy.description && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{analogy.description}</p>
      )}

      {/* Footer: tags + date */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-white/5">
        <div className="flex flex-wrap gap-1">
          {analogy.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-gray-500 hover:text-gray-400 transition-colors"
            >
              {tag}
            </span>
          ))}
          {analogy.tags.length > 3 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] text-gray-600">
              +{analogy.tags.length - 3}
            </span>
          )}
        </div>
        <span className="text-[10px] text-gray-700 font-mono shrink-0">
          {new Date(analogy.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
