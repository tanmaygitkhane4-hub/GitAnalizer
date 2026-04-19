/**
 * API client for the CodeAudit backend (Express API at backend/backend).
 * In development: http://localhost:4000
 * All requests require a Bearer token in Authorization header.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return json;
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
  githubUsername: string | null;
  bio: string | null;
  createdAt: string;
  _count: {
    repositories: number;
    scores: number;
    reports: number;
  };
}

export async function register(email: string, password: string, name?: string) {
  const res = await request<{ success: boolean; data: { user: UserProfile; tokens: AuthTokens } }>(
    '/api/auth/register',
    { method: 'POST', body: JSON.stringify({ email, password, name }) }
  );
  setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
  return res.data;
}

export async function login(email: string, password: string) {
  const res = await request<{ success: boolean; data: { user: UserProfile; tokens: AuthTokens } }>(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) }
  );
  setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
  return res.data;
}

export async function logout() {
  clearTokens();
}

export async function getProfile() {
  return request<{ success: boolean; data: { user: UserProfile } }>('/api/auth/me');
}

// GitHub OAuth — redirect the browser to the backend OAuth endpoint
export function startGitHubOAuth() {
  window.location.href = `${API_BASE}/api/auth/github`;
}

// Called after GitHub OAuth callback redirect with ?accessToken=...&refreshToken=...
export function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('accessToken');
  const refreshToken = params.get('refreshToken');
  if (accessToken && refreshToken) {
    setTokens(accessToken, refreshToken);
    return true;
  }
  return false;
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ─── Analysis ──────────────────────────────────────────────────────────────

export interface AnalysisJob {
  id: string;
  type: string;
  status: string;
  message: string | null;
  createdAt: string;
}

export interface Score {
  composite: number;
  codeQuality: number;
  consistency: number;
  security: number;
  uiUx: number;
  projectDepth: number;
  testing: number;
  documentation: number;
  level: string;
  percentile: number;
  createdAt: string;
}

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  hasTests: boolean;
  hasReadme: boolean;
  htmlUrl: string;
  pushedAt: string | null;
  _count?: { commits: number };
  analysis?: {
    codeQuality: number;
    testCoverage: number;
    security: number;
    documentation: number;
    architecture: number;
  } | null;
}

export async function startAnalysis() {
  return request<{ success: boolean; data: { jobId: string; message: string } }>(
    '/api/analysis/start',
    { method: 'POST' }
  );
}

export async function getAnalysisResults() {
  return request<{
    success: boolean;
    data: {
      score: Score | null;
      repositories: Repository[];
      recentJobs: AnalysisJob[];
    };
  }>('/api/analysis/results');
}

export async function syncGitHub() {
  return request<{ success: boolean; data: { jobId: string; message: string } }>(
    '/api/github/sync',
    { method: 'POST' }
  );
}

export async function getRepositories() {
  return request<{ success: boolean; data: { repositories: Repository[] } }>(
    '/api/github/repositories'
  );
}

export async function getScore() {
  return request<{ success: boolean; data: { score: Score | null } }>('/api/scoring');
}

export async function getLatestReport() {
  return request<{
    success: boolean;
    data: {
      score: Score | null;
      repositories: Repository[];
      gapAnalysis: any;
      roadmap: any[];
    };
  }>('/api/reports/latest');
}

export async function getJobs() {
  return request<{ success: boolean; data: { jobs: AnalysisJob[] } }>('/api/jobs');
}

export { getToken, setTokens, clearTokens };
