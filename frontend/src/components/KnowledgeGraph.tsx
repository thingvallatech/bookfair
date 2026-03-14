'use client';

import { useEffect, useRef } from 'react';

// TODO: implement d3 force-directed graph
// This component will render a force-directed graph using d3-force showing
// the relationships between biological mechanisms (nodes), analogies (edges),
// and generated algorithms (leaf nodes). Node size will encode novelty score;
// edge thickness will encode similarity score. Color clusters by source domain.

export interface GraphNode {
  id: string;
  label: string;
  type: 'mechanism' | 'analogy' | 'algorithm';
  domain?: string;
  score?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight?: number;
}

export interface KnowledgeGraphProps {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  width?: number;
  height?: number;
  className?: string;
}

const PLACEHOLDER_NODES: GraphNode[] = [
  { id: 'n1', label: 'Slime Mold Pathfinding', type: 'mechanism', domain: 'Mycology', score: 0.91 },
  { id: 'n2', label: 'Ant Colony Pheromones', type: 'mechanism', domain: 'Entomology', score: 0.65 },
  { id: 'n3', label: 'Quorum Sensing', type: 'mechanism', domain: 'Microbiology', score: 0.83 },
  { id: 'n4', label: 'Network Routing', type: 'analogy', score: 0.87 },
  { id: 'n5', label: 'TSP Optimization', type: 'analogy', score: 0.94 },
  { id: 'n6', label: 'Consensus Protocol', type: 'analogy', score: 0.89 },
  { id: 'n7', label: 'BioGen-047', type: 'algorithm', score: 0.912 },
  { id: 'n8', label: 'BioGen-044', type: 'algorithm', score: 0.801 },
];

const PLACEHOLDER_EDGES: GraphEdge[] = [
  { source: 'n1', target: 'n4', weight: 0.87 },
  { source: 'n2', target: 'n5', weight: 0.94 },
  { source: 'n3', target: 'n6', weight: 0.89 },
  { source: 'n4', target: 'n7', weight: 0.91 },
  { source: 'n5', target: 'n8', weight: 0.80 },
];

const NODE_COLORS: Record<GraphNode['type'], string> = {
  mechanism: '#14b8a6',
  analogy: '#f59e0b',
  algorithm: '#6366f1',
};

export default function KnowledgeGraph({
  nodes = PLACEHOLDER_NODES,
  edges = PLACEHOLDER_EDGES,
  width = 600,
  height = 400,
  className = '',
}: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // TODO: Replace this static placeholder layout with a live d3-force simulation.
    //
    // Implementation steps:
    // 1. import * as d3 from 'd3';
    // 2. Create a forceSimulation with:
    //    - d3.forceManyBody() for repulsion
    //    - d3.forceLink(edges).id(d => d.id).distance(80) for edges
    //    - d3.forceCenter(width / 2, height / 2)
    //    - d3.forceCollide(d => 20 + (d.score ?? 0) * 10)
    // 3. Bind nodes/edges to SVG <circle> and <line> elements
    // 4. On each simulation tick, update element positions
    // 5. Add zoom/pan via d3.zoom()
    // 6. Add hover tooltips showing node label and score
    // 7. Return () => simulation.stop() for cleanup
  }, [nodes, edges, width, height]);

  // Static placeholder: hand-positioned nodes in an organic layout
  const staticPositions: Record<string, [number, number]> = {
    n1: [120, 160],
    n2: [120, 280],
    n3: [120, 380],
    n4: [300, 120],
    n5: [300, 260],
    n6: [300, 380],
    n7: [480, 160],
    n8: [480, 280],
  };

  return (
    <div className={`relative ${className}`}>
      {/* Legend */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
        {(Object.entries(NODE_COLORS) as [GraphNode['type'], string][]).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-gray-500 capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Placeholder overlay */}
      <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
        <span className="text-[10px] text-gray-700 font-mono bg-background/80 px-2 py-0.5 rounded">
          Static preview — d3 force simulation pending
        </span>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full"
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Edges */}
        <g>
          {edges.map((edge) => {
            const [sx, sy] = staticPositions[edge.source] ?? [0, 0];
            const [tx, ty] = staticPositions[edge.target] ?? [0, 0];
            return (
              <line
                key={`${edge.source}-${edge.target}`}
                x1={sx}
                y1={sy}
                x2={tx}
                y2={ty}
                strokeWidth={(edge.weight ?? 0.5) * 2}
                stroke="rgba(255,255,255,0.08)"
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((node) => {
            const [cx, cy] = staticPositions[node.id] ?? [width / 2, height / 2];
            const r = 8 + (node.score ?? 0.5) * 8;
            const color = NODE_COLORS[node.type];
            return (
              <g key={node.id}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={color}
                  fillOpacity={0.2}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeOpacity={0.6}
                />
                <text
                  x={cx}
                  y={cy + r + 12}
                  textAnchor="middle"
                  fontSize={9}
                  fill="rgba(255,255,255,0.4)"
                  fontFamily="var(--font-mono)"
                >
                  {node.label.length > 18 ? node.label.slice(0, 16) + '…' : node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
