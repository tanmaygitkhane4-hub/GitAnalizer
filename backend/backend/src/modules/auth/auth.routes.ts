import { Router } from 'express';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { authController } from './auth.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();

// Configure GitHub OAuth Strategy
passport.use(new GitHubStrategy(
  {
    clientID: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    callbackURL: process.env.GITHUB_CALLBACK_URL!,
    scope: ['user:email', 'read:org', 'repo'],
  },
  (accessToken: string, _refreshToken: string, profile: any, done: Function) => {
    done(null, { ...profile, accessToken });
  }
));

// Email/Password auth
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));

// GitHub OAuth
router.get('/github', passport.authenticate('github', { 
  scope: ['user:email', 'read:org', 'repo'],
  session: false 
}));

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login', session: false }),
  authController.githubCallback.bind(authController)
);

// Protected routes
router.get('/me', authenticate, authController.getProfile.bind(authController));

export { router as authRouter };
