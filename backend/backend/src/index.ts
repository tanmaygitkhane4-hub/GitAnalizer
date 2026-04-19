import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { authRouter } from './modules/auth/auth.routes';
import { githubRouter } from './modules/github/github.routes';
import { analysisRouter } from './modules/analysis/analysis.routes';
import { jobsRouter } from './modules/jobs/jobs.routes';
import { scoringRouter } from './modules/scoring/scoring.routes';
import { reportsRouter } from './modules/reports/reports.routes';
import { errorHandler } from './shared/middleware/error.middleware';
import { prisma } from './config/database';
import { initQueues } from './queue/queue.manager';

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Passport (no session — JWT only)
app.use(passport.initialize());

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Health check
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch {
    res.status(503).json({ status: 'unhealthy', error: 'Database connection failed' });
  }
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/github', githubRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/scoring', scoringRouter);
app.use('/api/reports', reportsRouter);

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    
    await initQueues();
    console.log('✅ Job queues initialized');

    app.listen(PORT, () => {
      console.log(`🚀 Dev Career API running on http://localhost:${PORT}`);
      console.log(`📦 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

bootstrap();

export { app };
