import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { prisma } from '../../config/database';
import { runGitHubIngestionDirect } from '../../queue/queue.manager';
import { GitHubService } from './github.service';

const router = Router();

// ─── Public endpoint (no auth needed) ────────────────────────────────────────

/**
 * GET /api/github/validate/:username
 * Validates a GitHub username exists and returns their public profile.
 * Uses the server PAT — no user token required.
 */
router.get('/validate/:username', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username } = req.params;
    const svc = new GitHubService(); // uses server PAT
    const profile = await svc.fetchUserProfile(username);
    res.json({
      success: true,
      data: {
        login: profile.login,
        name: profile.name,
        avatar: profile.avatar_url,
        bio: profile.bio,
        publicRepos: profile.public_repos,
        followers: profile.followers,
        profileUrl: profile.html_url,
      },
    });
  } catch (error: any) {
    if (error.response?.status === 404) {
      return res.status(404).json({ success: false, error: 'GitHub username not found' });
    }
    next(error);
  }
});

// ─── All routes below require authentication ──────────────────────────────────
router.use(authenticate);

/**
 * PATCH /api/github/username
 * Link a GitHub username to the authenticated user account.
 * No GitHub OAuth needed — uses the server PAT to verify the user exists.
 */
router.patch('/username', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const { username } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ success: false, error: 'username is required' });
    }

    // Verify the username exists on GitHub via the PAT
    const svc = new GitHubService();
    let profile;
    try {
      profile = await svc.fetchUserProfile(username.trim());
    } catch {
      return res.status(404).json({ success: false, error: `GitHub user "${username}" not found` });
    }

    // Save to DB
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        githubUsername: profile.login,
        avatar: profile.avatar_url,
        name: profile.name || undefined,
      },
      select: { id: true, email: true, name: true, githubUsername: true, avatar: true },
    });

    res.json({ success: true, data: { user }, message: `GitHub account @${profile.login} linked` });
  } catch (error) {
    next(error);
  }
});

// ─── Repositories ─────────────────────────────────────────────────────────────

router.get('/repositories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const repos = await prisma.repository.findMany({
      where: { userId },
      orderBy: { stars: 'desc' },
      include: { _count: { select: { commits: true } } },
    });
    res.json({ success: true, data: { repositories: repos } });
  } catch (error) {
    next(error);
  }
});

router.get('/repositories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const repo = await prisma.repository.findFirst({
      where: { id: req.params.id, userId },
      include: {
        commits: { take: 20, orderBy: { committedAt: 'desc' } },
        analysis: true,
      },
    });

    if (!repo) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }

    res.json({ success: true, data: { repository: repo } });
  } catch (error) {
    next(error);
  }
});

// ─── Sync / Ingestion ─────────────────────────────────────────────────────────

/**
 * POST /api/github/sync
 * Triggers GitHub ingestion for the authenticated user.
 * Uses the server PAT — no user OAuth token required.
 */
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user?.githubUsername) {
      return res.status(400).json({
        success: false,
        error: 'No GitHub username linked. Call PATCH /api/github/username first.',
      });
    }

    const job = await prisma.analysisJob.create({
      data: {
        userId,
        type: 'GITHUB_INGESTION',
        status: 'RUNNING',
        message: `Fetching repos for @${user.githubUsername}...`,
      },
    });

    // Fire and forget — uses server PAT
    runGitHubIngestionDirect(userId, user.githubUsername)
      .then(() => prisma.analysisJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', message: 'GitHub data synced!' },
      }))
      .catch((err: Error) => prisma.analysisJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', message: err.message },
      }));

    res.json({
      success: true,
      data: { jobId: job.id, message: `Syncing @${user.githubUsername} via GitHub PAT` },
    });
  } catch (error) {
    next(error);
  }
});

export { router as githubRouter };
