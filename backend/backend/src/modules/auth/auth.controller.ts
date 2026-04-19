import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';
import { AppError } from '../../shared/utils/errors';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = registerSchema.parse(req.body);
      const result = await authService.register(data);
      res.status(201).json({ 
        success: true, 
        message: 'Account created successfully',
        data: result 
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = loginSchema.parse(req.body);
      const result = await authService.login(data);
      res.json({ 
        success: true, 
        message: 'Login successful',
        data: result 
      });
    } catch (error) {
      next(error);
    }
  }

  async githubCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const githubProfile = req.user as any;
      if (!githubProfile) {
        throw new AppError('GitHub authentication failed', 401);
      }

      const result = await authService.githubOAuth(githubProfile);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      res.redirect(
        `${frontendUrl}/auth/callback?` +
        `accessToken=${result.tokens.accessToken}&` +
        `refreshToken=${result.tokens.refreshToken}&` +
        `isNew=${result.isNew}`
      );
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new AppError('Refresh token required', 400);
      }
      const tokens = await authService.refreshTokens(refreshToken);
      res.json({ success: true, data: { tokens } });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const profile = await authService.getProfile(userId);
      res.json({ success: true, data: { user: profile } });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
