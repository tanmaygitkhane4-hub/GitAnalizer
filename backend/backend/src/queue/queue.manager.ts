import { prisma } from '../config/database';
import { GitHubService } from '../modules/github/github.service';
import { scoringEngine } from '../modules/scoring/scoring.engine';

// Queue is disabled (no Redis required) — direct execution mode
export const analysisQueue: null = null;

/** Init queues (no-op in PAT direct-execution mode) */
export async function initQueues() {
  console.log('⚠️  Running without Redis — all analysis runs directly via GitHub PAT');
}

/**
 * Ingest GitHub data for a user using the server PAT.
 * No user OAuth token needed — uses the server's GITHUB_TOKEN env var.
 */
export async function runGitHubIngestionDirect(
  userId: string,
  githubUsername: string
): Promise<{ success: boolean }> {
  console.log(`🚀 Starting GitHub ingestion for @${githubUsername} (userId: ${userId})`);

  // Always use the server PAT — no user token lookup needed
  const githubService = new GitHubService();
  await githubService.ingestUserData(userId, githubUsername);

  console.log('📊 Calculating scores...');

  const repos = await prisma.repository.findMany({
    where: { userId },
    include: {
      analysis: true,
      commits: { take: 100 },
    },
  });

  if (repos.length > 0) {
    await scoringEngine.calculateScore({ repositories: repos, userId });
    console.log(`✅ Scored ${repos.length} repos for @${githubUsername}`);
  }

  return { success: true };
}

/** Full analysis = ingestion + scoring (same thing currently) */
export async function runFullAnalysisDirect(
  userId: string,
  githubUsername: string
): Promise<{ success: boolean }> {
  console.log('🚀 Starting full analysis...');
  return runGitHubIngestionDirect(userId, githubUsername);
}