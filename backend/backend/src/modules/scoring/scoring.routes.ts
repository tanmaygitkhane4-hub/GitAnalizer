import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { prisma } from '../../config/database';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const score = await prisma.score.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { score } });
  } catch (error) {
    next(error);
  }
});

export { router as scoringRouter };
