/**
 * API client for the CodeAudit backend (Express API at backend/backend).
 * Development: http://localhost:4000
 *
 * Authentication flow (no GitHub OAuth required):
 *   1. User enters GitHub username → GET /api/github/validate/:username (public, uses server PAT)
 *   2. Register/login with email + password
 *   3. Link GitHub username → PATCH /api/github/username
 *   4. Trigger analysis → POST /api/github/sync + POST /api/analysis/start
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || `Request failed (${res.status})`);
  }
  return json;
}

// ─── Types ──────────────────────────────────────────────────────────────────

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
  _count?: {
    repositories: number;
    scores: number;
    reports: number;
  };
}

export interface GitHubProfile {
  login: string;
  name: string | null;
  avatar: string;
  bio: string | null;
  publicRepos: number;
  followers: number;
  profileUrl: string;
}

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

// ─── Auth ──────────────────────────────────────────────────────────────────

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

// ─── GitHub (PAT-powered — no OAuth needed) ───────────────────────────────

/**
 * Validate a GitHub username using the server PAT.
 * Public — no auth token required.
 */
export async function validateGitHubUsername(username: string): Promise<GitHubProfile> {
  const res = await request<{ success: boolean; data: GitHubProfile }>(
    `/api/github/validate/${encodeURIComponent(username)}`
  );
  return res.data;
}

/**
 * Link a GitHub username to the authenticated user.
 * The server verifies it exists via the PAT.
 */
export async function linkGitHubUsername(username: string) {
  return request<{ success: boolean; data: { user: UserProfile }; message: string }>(
    '/api/github/username',
    { method: 'PATCH', body: JSON.stringify({ username }) }
  );
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

// ─── Analysis ─────────────────────────────────────────────────────────────

export async function startAnalysis() {
  return request<{ success: boolean; data: { jobId: string; message: string } }>(
    '/api/analysis/start',
    { method: 'POST' }
  );
}

export async function getAnalysisResults() {
  return request<{
    success: boolean;
    data: { score: Score | null; repositories: Repository[]; recentJobs: AnalysisJob[] };
  }>('/api/analysis/results');
}

export async function getScore() {
  return request<{ success: boolean; data: { score: Score | null } }>('/api/scoring');
}

export async function getLatestReport() {
  return request<{
    success: boolean;
    data: { score: Score | null; repositories: Repository[]; gapAnalysis: any; roadmap: any[] };
  }>('/api/reports/latest');
}

export async function getJobs() {
  return request<{ success: boolean; data: { jobs: AnalysisJob[] } }>('/api/jobs');
}

// ─── OAuth callback (for when GitHub OAuth IS configured) ─────────────────

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
