import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { prisma } from '../../config/database';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const jobs = await prisma.analysisJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ success: true, data: { jobs } });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const job = await prisma.analysisJob.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    res.json({ success: true, data: { job } });
  } catch (error) {
    next(error);
  }
});

export { router as jobsRouter };
