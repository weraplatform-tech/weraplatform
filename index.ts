/**
 * WERA LABOUR PLATFORM — API Server
 * Acuity Workspace | Kadzitu Standard
 * Zero-Burn: Render Free Tier | Supabase Postgres
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { authRouter } from './routes/auth';
import { providersRouter } from './routes/providers';
import { servicesRouter } from './routes/services';
import { bookingsRouter } from './routes/bookings';
import { paymentsRouter } from './routes/payments';
import { reviewsRouter } from './routes/reviews';
import { matchingRouter } from './routes/matching';
import { adminRouter } from './routes/admin';
import { notificationsRouter } from './routes/notifications';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 10000;

// ── Security ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate Limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts. Please try again later.' },
});

app.use(limiter);
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    platform: 'Wera Labour Platform',
    owner: 'Acuity Workspace',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    currency: 'KES',
    region: 'East Africa',
  });
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/providers', providersRouter);
app.use('/api/v1/services', servicesRouter);
app.use('/api/v1/bookings', authMiddleware, bookingsRouter);
app.use('/api/v1/payments', authMiddleware, paymentsRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/matching', authMiddleware, matchingRouter);
app.use('/api/v1/admin', authMiddleware, adminRouter);
app.use('/api/v1/notifications', authMiddleware, notificationsRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found', platform: 'Wera API v1' });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   WERA LABOUR PLATFORM — API SERVER      ║
  ║   Acuity Workspace | Kadzitu Standard    ║
  ║   Port: ${PORT} | Region: East Africa     ║
  ║   Currency: KES | Zero-Burn Mode         ║
  ╚══════════════════════════════════════════╝
  `);
});

export default app;
