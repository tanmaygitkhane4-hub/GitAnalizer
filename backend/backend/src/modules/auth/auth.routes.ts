import { Router, Request, Response } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();

// ─── Email / Password auth ───────────────────────────────────────────────────
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));

// ─── GitHub OAuth (only active when GITHUB_CLIENT_ID is configured) ──────────
if (process.env.GITHUB_CLIENT_ID) {
  // Dynamically load passport and strategy only when OAuth is configured
  const passport = require('passport');
  const { Strategy: GitHubStrategy } = require('passport-github2');

  passport.use(new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: process.env.GITHUB_CALLBACK_URL!,
      scope: ['user:email', 'read:org', 'repo'],
    },
    (accessToken: string, _refreshToken: string, profile: any, done: Function) => {
      done(null, { ...profile, accessToken });
    }
  ));

  router.get('/github', passport.authenticate('github', {
    scope: ['user:email', 'read:org', 'repo'],
    session: false,
  }));

  router.get('/github/callback',
    passport.authenticate('github', { failureRedirect: '/login', session: false }),
    authController.githubCallback.bind(authController)
  );
} else {
  // Stub routes — return helpful message when OAuth is not configured
  router.get('/github', (_req: Request, res: Response) => {
    res.status(503).json({
      success: false,
      error: 'GitHub OAuth is not configured. Use email/password login and provide your GitHub username separately.',
      hint: 'POST /api/auth/register with {email, password, name} then PATCH /api/github/username with {username}',
    });
  });
}

// ─── Protected routes ────────────────────────────────────────────────────────
router.get('/me', authenticate, authController.getProfile.bind(authController));

export { router as authRouter };
