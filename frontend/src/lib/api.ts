/**
 * BioSpark API client
 *
 * Base URL is set via the NEXT_PUBLIC_API_URL environment variable.
 * All functions return typed data using fetch.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Mechanism {
  id: string;
  name: string;
  description: string;
  source_domain: string;
  organism: string;
  tags: string[];
  created_at: string;
  /** @deprecated use source_domain */
  domain?: string;
  key_properties?: string[];
  scale?: string;
}

export interface Analogy {
  id: string;
  bio_mechanism: string;
  cs_problem: string;
  source_domain: string;
  novelty_score: number;
  similarity_score: number;
  description: string;
  tags: string[];
  created_at: string;
  /** Raw API fields — may be present when fetching from /api/analogies */
  mechanism_id?: string;
  problem_id?: string;
  structural_similarity?: number;
  status?: string;
  mapping_explanation?: string;
}

export interface Algorithm {
  id: string;
  name: string;
  generation: number;
  fitness_score: number;
  status: 'active' | 'evaluating' | 'archived' | 'failed';
  source_analogy: string;
  benchmark_suite: string;
  code_snippet?: string;
  created_at: string;
  /** Raw API field */
  analogy_id?: string;
  code?: string;
}

export interface BenchmarkResult {
  id: string;
  algorithm_id: string;
  algorithm_name: string;
  suite: string;
  score: number;
  baseline_score: number;
  runs: number;
  last_updated: string;
  /** Raw API fields */
  benchmark_name?: string;
  best_fitness?: number;
  mean_fitness?: number;
  baseline_comparison?: number;
}

export type DiscoveryRunStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface DiscoveryRun {
  id: string;
  target_problem: string;
  bio_domains: string[];
  population_size: number;
  generations: number;
  status: DiscoveryRunStatus;
  progress: number;
  mechanisms_found: number;
  analogies_found: number;
  started_at: string;
  duration_seconds: number | null;
  error_message?: string;
  /** Raw API fields */
  current_generation?: number;
  algorithms_generated?: number;
}

export interface CreateDiscoveryRunRequest {
  target_problem: string;
  bio_domains: string[];
  population_size: number;
  generations: number;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface ListParams {
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, body || res.statusText);
  }

  return res.json() as Promise<T>;
}

function buildQuery(params: ListParams): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Fetch all indexed biological mechanisms.
 */
export function getMechanisms(
  params: ListParams & { domain?: string; search?: string } = {},
): Promise<PaginatedResponse<Mechanism>> {
  return request<PaginatedResponse<Mechanism>>(`/api/mechanisms${buildQuery(params)}`);
}

/**
 * Fetch bio-to-CS analogies, optionally filtered by domain or minimum novelty score.
 */
export function getAnalogies(
  params: ListParams & {
    domain?: string;
    min_novelty?: number;
    min_similarity?: number;
    search?: string;
    status?: string;
  } = {},
): Promise<PaginatedResponse<Analogy>> {
  return request<PaginatedResponse<Analogy>>(`/api/analogies${buildQuery(params)}`);
}

/**
 * Fetch a single analogy by ID.
 */
export function getAnalogy(id: string): Promise<Analogy> {
  return request<Analogy>(`/api/analogies/${id}`);
}

/**
 * Fetch generated algorithms, optionally filtered by status or benchmark suite.
 */
export function getAlgorithms(
  params: ListParams & {
    status?: Algorithm['status'];
    suite?: string;
    search?: string;
  } = {},
): Promise<PaginatedResponse<Algorithm>> {
  return request<PaginatedResponse<Algorithm>>(`/api/algorithms${buildQuery(params)}`);
}

/**
 * Fetch a single algorithm by ID.
 */
export function getAlgorithm(id: string): Promise<Algorithm> {
  return request<Algorithm>(`/api/algorithms/${id}`);
}

/**
 * Fetch benchmark results / leaderboard.
 */
export function getBenchmarks(
  params: ListParams & { suite?: string; algorithm_id?: string } = {},
): Promise<PaginatedResponse<BenchmarkResult>> {
  return request<PaginatedResponse<BenchmarkResult>>(`/api/benchmarks${buildQuery(params)}`);
}

/**
 * @deprecated Use getBenchmarks() instead.
 */
export const getBenchmarkLeaderboard = () =>
  request<BenchmarkResult[]>('/api/benchmarks/leaderboard');

/**
 * Fetch all discovery pipeline runs.
 */
export function getDiscoveryRuns(
  params: ListParams & { status?: DiscoveryRunStatus } = {},
): Promise<PaginatedResponse<DiscoveryRun>> {
  return request<PaginatedResponse<DiscoveryRun>>(`/api/discovery/runs${buildQuery(params)}`);
}

/**
 * Fetch a single discovery run by ID.
 */
export function getDiscoveryRun(id: string): Promise<DiscoveryRun> {
  return request<DiscoveryRun>(`/api/discovery/runs/${id}`);
}

/**
 * Launch a new discovery pipeline run.
 */
export function createDiscoveryRun(data: CreateDiscoveryRunRequest): Promise<DiscoveryRun> {
  return request<DiscoveryRun>('/api/discovery/runs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
