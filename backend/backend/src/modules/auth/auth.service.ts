import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/utils/errors';
import type { User } from '@prisma/client';

interface RegisterPayload {
  email: string;
  password: string;
  name?: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface TokenPayload {
  userId: string;
  email: string | null;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly JWT_SECRET = process.env.JWT_SECRET!;
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
  private readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  async register(payload: RegisterPayload): Promise<{ user: Partial<User>; tokens: AuthTokens }> {
    const existing = await prisma.user.findUnique({ 
      where: { email: payload.email } 
    });
    
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const hashedPassword = await bcrypt.hash(payload.password, this.SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: payload.email,
        password: hashedPassword,
        name: payload.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        githubUsername: true,
        createdAt: true,
      },
    });

    const tokens = this.generateTokens({ userId: user.id, email: user.email });
    return { user, tokens };
  }

  async login(payload: LoginPayload): Promise<{ user: Partial<User>; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user || !user.password) {
      throw new AppError('Invalid credentials', 401);
    }

    const isValid = await bcrypt.compare(payload.password, user.password);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    const tokens = this.generateTokens({ userId: user.id, email: user.email });

    const { password: _, ...safeUser } = user;
    return { user: safeUser, tokens };
  }

  async githubOAuth(githubProfile: {
    id: string;
    username: string;
    displayName: string;
    photos: Array<{ value: string }>;
    emails: Array<{ value: string }>;
    accessToken: string;
  }): Promise<{ user: Partial<User>; tokens: AuthTokens; isNew: boolean }> {
    const email = githubProfile.emails?.[0]?.value;
    const avatar = githubProfile.photos?.[0]?.value;

    let user = await prisma.user.findUnique({
      where: { githubId: githubProfile.id },
    });

    const isNew = !user;

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          githubUsername: githubProfile.username,
          avatar,
          accessToken: githubProfile.accessToken,
          name: user.name || githubProfile.displayName,
        },
      });
    } else {
      // Check if email exists already
      const existingByEmail = email 
        ? await prisma.user.findUnique({ where: { email } })
        : null;

      if (existingByEmail) {
        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            githubId: githubProfile.id,
            githubUsername: githubProfile.username,
            avatar,
            accessToken: githubProfile.accessToken,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            githubId: githubProfile.id,
            githubUsername: githubProfile.username,
            email,
            avatar,
            name: githubProfile.displayName,
            accessToken: githubProfile.accessToken,
          },
        });
      }
    }

    const tokens = this.generateTokens({ userId: user.id, email: user.email });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p, accessToken: _a, ...safeUser } = user as any;
    return { user: safeUser, tokens, isNew };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as TokenPayload;
      
      const user = await prisma.user.findUnique({ 
        where: { id: payload.userId } 
      });
      
      if (!user) {
        throw new AppError('User not found', 401);
      }

      return this.generateTokens({ userId: user.id, email: user.email });
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }
  }

  async getProfile(userId: string): Promise<Record<string, any>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        githubUsername: true,
        bio: true,
        portfolioLinks: true,
        createdAt: true,
        _count: {
          select: {
            repositories: true,
            scores: true,
            reports: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN,
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
    } catch {
      throw new AppError('Invalid or expired token', 401);
    }
  }
}

export const authService = new AuthService();
