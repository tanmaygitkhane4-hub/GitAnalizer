/**
 * Central data-fetching hooks for the CodeAudit dashboard.
 * Uses polling for live job status and one-shot fetches for static data.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getAnalysisResults,
  getProfile,
  getJobs,
  getLatestReport,
  getRepositories,
  isAuthenticated,
  type Score,
  type Repository,
  type AnalysisJob,
  type UserProfile,
} from '@/lib/api';

// ─── Generic fetch hook ────────────────────────────────────────────────────

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: any[] = []
): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const run = useCallback(async () => {
    if (!isAuthenticated()) {
      setLoading(false);
      setError('Not authenticated');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || 'Something went wrong');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    run();
    return () => { mountedRef.current = false; };
  }, [run]);

  return { data, loading, error, refresh: run };
}

// ─── Polled hook (re-fetches every N ms while active jobs exist) ──────────

export function usePolled<T>(
  fetcher: () => Promise<T>,
  shouldContinue: (data: T | null) => boolean,
  intervalMs = 3000,
  deps: any[] = []
): FetchState<T> {
  const base = useFetch<T>(fetcher, deps);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (shouldContinue(base.data)) {
      timerRef.current = setInterval(base.refresh, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [base.data, base.refresh, shouldContinue, intervalMs]);

  return base;
}

// ─── Typed domain hooks ────────────────────────────────────────────────────

/** Current user profile */
export function useProfile(): FetchState<UserProfile> {
  const { data, ...rest } = useFetch(() => getProfile().then(r => r.data.user));
  return { data, ...rest };
}

/** Analysis results: score + repos + recent jobs. Polls while a job is RUNNING. */
export function useAnalysisResults() {
  return usePolled(
    () => getAnalysisResults().then(r => r.data),
    (data) => data?.recentJobs?.some(j => j.status === 'RUNNING') ?? false,
    4000
  );
}

/** Latest report with roadmap and gap analysis */
export function useLatestReport() {
  return useFetch(() => getLatestReport().then(r => r.data));
}

/** Job history, polls while any job is RUNNING */
export function useJobs() {
  return usePolled(
    () => getJobs().then(r => r.data.jobs),
    (jobs) => jobs?.some(j => j.status === 'RUNNING') ?? false,
    3000
  );
}

/** Repositories list */
export function useRepositories() {
  return useFetch(() => getRepositories().then(r => r.data.repositories));
}

// ─── Derived helpers ───────────────────────────────────────────────────────

/** Parse JSON string field from Prisma (topics, languages stored as JSON strings in SQLite) */
export function parseJsonField<T = any>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Build language stack (name + percentage) from a list of repos */
export function buildLanguageStack(
  repos: Repository[]
): { name: string; value: number; color: string }[] {
  const counts: Record<string, number> = {};
  repos.forEach(r => {
    if (r.language) counts[r.language] = (counts[r.language] || 0) + r.stars + 1;
    const langs = parseJsonField<Record<string, number>>(
      (r as any).languages,
      {}
    );
    Object.entries(langs).forEach(([l, bytes]) => {
      counts[l] = (counts[l] || 0) + bytes;
    });
  });

  const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1;
  const palette = [
    '#a78bfa', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
    '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
  ];

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, val], i) => ({
      name,
      value: Math.round((val / total) * 100),
      color: palette[i % palette.length],
    }));
}

/** Build radar chart data from a real score */
export function buildRadarFromScore(score: Score) {
  return [
    { axis: 'Code Quality', actual: score.codeQuality, claimed: Math.min(100, score.codeQuality + 15) },
    { axis: 'Consistency', actual: score.consistency, claimed: Math.min(100, score.consistency + 20) },
    { axis: 'Security', actual: score.security, claimed: Math.min(100, score.security + 10) },
    { axis: 'UI/UX Docs', actual: score.uiUx, claimed: Math.min(100, score.uiUx + 25) },
    { axis: 'Project Depth', actual: score.projectDepth, claimed: Math.min(100, score.projectDepth + 15) },
  ];
}

/** Map score level to a human-readable label */
export function levelLabel(level: string = 'JUNIOR'): string {
  const map: Record<string, string> = {
    JUNIOR: 'Junior',
    MID: 'Mid-Level',
    SENIOR: 'Senior',
    STAFF: 'Staff',
  };
  return map[level] ?? level;
}

/** Get next level label */
export function nextLevelLabel(level: string = 'JUNIOR'): string {
  const map: Record<string, string> = {
    JUNIOR: 'Mid-Level',
    MID: 'Senior',
    SENIOR: 'Staff',
    STAFF: 'Principal',
  };
  return map[level] ?? 'Principal';
}
