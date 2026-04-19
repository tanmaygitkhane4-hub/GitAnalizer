import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { prisma } from '../../config/database';
import { runFullAnalysisDirect } from '../../queue/queue.manager';

const router = Router();
router.use(authenticate);

// Trigger full analysis (direct, no queue required)
router.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user?.githubUsername) {
      return res.status(400).json({ success: false, error: 'No GitHub account linked' });
    }

    const job = await prisma.analysisJob.create({
      data: { userId, type: 'FULL_ANALYSIS', status: 'RUNNING', message: 'Starting analysis...' },
    });

    // Run directly (no queue) — update job status async
    runFullAnalysisDirect(userId, user.githubUsername)
      .then(() => prisma.analysisJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', message: 'Analysis complete!' },
      }))
      .catch((err: Error) => prisma.analysisJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', message: err.message },
      }));

    res.json({ success: true, data: { jobId: job.id, message: 'Analysis started' } });
  } catch (error) {
    next(error);
  }
});

// Get analysis results
router.get('/results', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const [score, repos, jobs] = await Promise.all([
      prisma.score.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.repository.findMany({
        where: { userId },
        include: { analysis: true, _count: { select: { commits: true } } },
        orderBy: { stars: 'desc' },
        take: 20,
      }),
      prisma.analysisJob.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);
    res.json({ success: true, data: { score, repositories: repos, recentJobs: jobs } });
  } catch (error) {
    next(error);
  }
});

export { router as analysisRouter };
