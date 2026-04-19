import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { prisma } from '../../config/database';
import { runGitHubIngestionDirect } from '../../queue/queue.manager';

const router = Router();

router.use(authenticate);

// Get user's repositories
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

// Trigger GitHub data ingestion (direct, no queue)
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user?.githubUsername) {
      return res.status(400).json({ 
        success: false, 
        error: 'No GitHub account linked' 
      });
    }

    const job = await prisma.analysisJob.create({
      data: {
        userId,
        type: 'GITHUB_INGESTION',
        status: 'RUNNING',
        message: 'Fetching GitHub data...',
      },
    });

    // Run directly in background
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
      data: { jobId: job.id, message: 'GitHub sync started' }
    });
  } catch (error) {
    next(error);
  }
});

// Get repository details
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

export { router as githubRouter };
