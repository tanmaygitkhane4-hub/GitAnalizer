import { prisma } from '../config/database';
import { GitHubService } from '../modules/github/github.service';
import { scoringEngine } from '../modules/scoring/scoring.engine';

// Queue is disabled (no Redis required) — set to null so routes can check and fall back to direct execution
export const analysisQueue: null = null;

/**
 * Init queues (DISABLED VERSION)
 */
export async function initQueues() {
  console.log("⚠️ Redis disabled - running without queues (direct execution mode)");
}

/**
 * Direct function to run GitHub ingestion (no queue)
 */
export async function runGitHubIngestionDirect(
  userId: string,
  githubUsername: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user?.accessToken) {
    throw new Error('No GitHub access token');
  }

  console.log("🚀 Fetching repositories...");

  const githubService = new GitHubService(user.accessToken);
  await githubService.ingestUserData(userId, githubUsername);

  console.log("📊 Calculating scores...");

  const repos = await prisma.repository.findMany({
    where: { userId },
    include: {
      analysis: true,
      commits: { take: 100 },
    },
  });

  await scoringEngine.calculateScore({
    repositories: repos,
    userId,
  });

  console.log("✅ Analysis complete!");

  return { success: true };
}

/**
 * Direct full analysis (no queue)
 */
export async function runFullAnalysisDirect(
  userId: string,
  githubUsername: string
) {
  console.log("🚀 Starting full analysis...");
  return runGitHubIngestionDirect(userId, githubUsername);
}