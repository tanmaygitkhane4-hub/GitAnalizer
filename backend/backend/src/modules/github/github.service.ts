import axios, { AxiosInstance } from 'axios';
import { prisma } from '../../config/database';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  size: number;
  private: boolean;
  fork: boolean;
  default_branch: string;
  html_url: string;
  clone_url: string;
  topics: string[];
  pushed_at: string;
  created_at: string;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
  };
  stats?: { additions: number; deletions: number };
  files?: Array<{ filename: string }>;
}

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  html_url: string;
}

export class GitHubService {
  private client: AxiosInstance;

  /**
   * @param token — optional user OAuth token. Falls back to the server's PAT from env.
   *                The PAT allows fetching any public profile/repo without user OAuth.
   */
  constructor(token?: string) {
    const resolvedToken = token || process.env.GITHUB_TOKEN;

    if (!resolvedToken) {
      throw new Error('GITHUB_TOKEN is not set in environment variables');
    }

    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `Bearer ${resolvedToken}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
  }

  /** Fetch a public GitHub user profile */
  async fetchUserProfile(username: string): Promise<GitHubUser> {
    const response = await this.client.get<GitHubUser>(`/users/${username}`);
    return response.data;
  }

  async fetchUserRepositories(username: string): Promise<GitHubRepo[]> {
    const repos: GitHubRepo[] = [];
    let page = 1;

    while (true) {
      const response = await this.client.get<GitHubRepo[]>(
        `/users/${username}/repos`,
        { params: { per_page: 100, page, sort: 'updated', type: 'owner' } }
      );

      if (response.data.length === 0) break;
      repos.push(...response.data.filter(r => !r.private));  // only public repos via PAT

      if (response.data.length < 100) break;
      page++;
    }

    return repos;
  }

  async fetchLanguages(fullName: string): Promise<Record<string, number>> {
    try {
      const response = await this.client.get(`/repos/${fullName}/languages`);
      return response.data;
    } catch {
      return {};
    }
  }

  async fetchCommits(fullName: string, limit = 50): Promise<GitHubCommit[]> {
    try {
      const response = await this.client.get<GitHubCommit[]>(
        `/repos/${fullName}/commits`,
        { params: { per_page: Math.min(limit, 100) } }
      );
      return response.data;
    } catch {
      return [];
    }
  }

  async fetchContents(fullName: string, path = ''): Promise<any[]> {
    try {
      const response = await this.client.get(`/repos/${fullName}/contents/${path}`);
      return Array.isArray(response.data) ? response.data : [response.data];
    } catch {
      return [];
    }
  }

  async hasTestFiles(fullName: string): Promise<boolean> {
    try {
      const contents = await this.fetchContents(fullName);
      const testIndicators = ['test', 'tests', '__tests__', 'spec', 'specs', 'cypress', 'jest', 'vitest'];
      return contents.some((item: any) =>
        testIndicators.some(t => item.name.toLowerCase().includes(t))
      );
    } catch {
      return false;
    }
  }

  async hasReadme(fullName: string): Promise<boolean> {
    try {
      await this.client.get(`/repos/${fullName}/readme`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Main ingestion: fetches all public repos + commits for a GitHub username.
   * Uses the server PAT — no user OAuth required.
   */
  async ingestUserData(userId: string, username: string): Promise<void> {
    console.log(`📡 Fetching GitHub data for @${username} using server PAT...`);

    const repos = await this.fetchUserRepositories(username);
    console.log(`📦 Found ${repos.length} public repos for @${username}`);

    // Process up to 30 repos to keep it fast
    for (const repo of repos.slice(0, 30)) {
      try {
        const [languages, hasTests, hasReadme] = await Promise.all([
          this.fetchLanguages(repo.full_name),
          this.hasTestFiles(repo.full_name),
          this.hasReadme(repo.full_name),
        ]);

        const dbRepo = await prisma.repository.upsert({
          where: { githubId: repo.id },
          update: {
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            language: repo.language,
            languages: JSON.stringify(languages),
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            watchers: repo.watchers_count,
            openIssues: repo.open_issues_count,
            size: repo.size,
            isPrivate: repo.private,
            isFork: repo.fork,
            hasTests,
            hasReadme,
            defaultBranch: repo.default_branch,
            htmlUrl: repo.html_url,
            cloneUrl: repo.clone_url,
            topics: JSON.stringify(repo.topics || []),
            pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
          },
          create: {
            userId,
            githubId: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            language: repo.language,
            languages: JSON.stringify(languages),
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            watchers: repo.watchers_count,
            openIssues: repo.open_issues_count,
            size: repo.size,
            isPrivate: repo.private,
            isFork: repo.fork,
            hasTests,
            hasReadme,
            defaultBranch: repo.default_branch,
            htmlUrl: repo.html_url,
            cloneUrl: repo.clone_url,
            topics: JSON.stringify(repo.topics || []),
            pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
          },
        });

        // Fetch and store commits (latest 30)
        const commits = await this.fetchCommits(repo.full_name, 30);
        for (const commit of commits) {
          await prisma.commit.upsert({
            where: { sha: commit.sha },
            update: {},
            create: {
              repositoryId: dbRepo.id,
              sha: commit.sha,
              message: commit.commit.message,
              authorName: commit.commit.author.name,
              authorEmail: commit.commit.author.email,
              additions: commit.stats?.additions || 0,
              deletions: commit.stats?.deletions || 0,
              changedFiles: commit.files?.length || 0,
              committedAt: new Date(commit.commit.author.date),
            },
          }).catch(() => {}); // skip duplicates
        }

        console.log(`  ✓ ${repo.name} (${commits.length} commits)`);
      } catch (err) {
        console.warn(`  ⚠ Skipped ${repo.name}: ${(err as Error).message}`);
      }
    }

    console.log(`✅ Ingestion complete for @${username}`);
  }
}

/** Singleton using the server PAT — used anywhere we don't have a user token */
export const githubService = new GitHubService();
