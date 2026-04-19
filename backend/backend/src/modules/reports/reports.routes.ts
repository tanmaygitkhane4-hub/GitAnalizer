import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { prisma } from '../../config/database';

const router = Router();
router.use(authenticate);

router.get('/latest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const [report, score, repos, jobs] = await Promise.all([
      prisma.report.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.score.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.repository.findMany({
        where: { userId },
        include: { analysis: true },
        orderBy: { stars: 'desc' },
        take: 10,
      }),
      prisma.jobMatch.findMany({ where: { userId }, orderBy: { matchScore: 'desc' }, take: 5 }),
    ]);

    // Build gap analysis from score data
    const gapAnalysis = score ? buildGapAnalysis(score) : null;
    const roadmap = gapAnalysis ? buildRoadmap(gapAnalysis) : [];

    res.json({
      success: true,
      data: { report, score, repositories: repos, jobMatches: jobs, gapAnalysis, roadmap },
    });
  } catch (error) {
    next(error);
  }
});

function buildGapAnalysis(score: any) {
  const gaps: string[] = [];
  if (score.codeQuality < 60) gaps.push('Improve code quality: add tests, reduce complexity');
  if (score.consistency < 50) gaps.push('Commit more regularly to show active development');
  if (score.security < 60) gaps.push('Add security practices: input validation, auth checks');
  if (score.uiUx < 50) gaps.push('Improve documentation: better READMEs, add topics');
  if (score.projectDepth < 50) gaps.push('Build more diverse, complex projects');
  return { level: score.level, gaps, targetLevel: getNextLevel(score.level) };
}

function getNextLevel(level: string) {
  const map: Record<string, string> = { JUNIOR: 'MID', MID: 'SENIOR', SENIOR: 'STAFF', STAFF: 'PRINCIPAL' };
  return map[level] || 'PRINCIPAL';
}

function buildRoadmap(gap: any) {
  return [
    { week: '1-2', focus: 'Foundation', tasks: ['Audit existing repos', 'Add README to top 3 projects', 'Set up CI/CD'] },
    { week: '3-4', focus: 'Testing', tasks: ['Add unit tests to main project', 'Aim for 40% coverage', 'Document test strategy'] },
    { week: '5-8', focus: 'Architecture', tasks: ['Refactor largest project', 'Apply clean architecture', 'Add error handling'] },
    { week: '9-12', focus: 'Visibility', tasks: ['Deploy a showcase project', 'Write a technical blog post', 'Contribute to open source'] },
  ];
}

export { router as reportsRouter };
