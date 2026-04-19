import { Request, Response, NextFunction } from 'express';
import { authService } from '../../modules/auth/auth.service';
import { AppError } from '../utils/errors';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
  };
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('No token provided', 401));
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const payload = authService.verifyAccessToken(token);
    (req as AuthenticatedRequest).user = payload as { userId: string; email: string };
    next();
  } catch (error) {
    next(error);
  }
}
