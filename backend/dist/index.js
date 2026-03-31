"use strict";
/**
 * WERA LABOUR PLATFORM — API Server
 * Acuity Workspace | Kadzitu Standard
 * Zero-Burn: Render Free Tier | Supabase Postgres
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_1 = require("./routes/auth");
const providers_1 = require("./routes/providers");
const services_1 = require("./routes/services");
const bookings_1 = require("./routes/bookings");
const payments_1 = require("./routes/payments");
const reviews_1 = require("./routes/reviews");
const matching_1 = require("./routes/matching");
const admin_1 = require("./routes/admin");
const notifications_1 = require("./routes/notifications");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_2 = require("./middleware/auth");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 10000;
// ── Security ──────────────────────────────────────────────────
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// ── Rate Limiting ─────────────────────────────────────────────
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
});
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many auth attempts. Please try again later.' },
});
app.use(limiter);
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
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
app.use('/api/v1/auth', authLimiter, auth_1.authRouter);
app.use('/api/v1/providers', providers_1.providersRouter);
app.use('/api/v1/services', services_1.servicesRouter);
app.use('/api/v1/bookings', auth_2.authMiddleware, bookings_1.bookingsRouter);
app.use('/api/v1/payments', auth_2.authMiddleware, payments_1.paymentsRouter);
app.use('/api/v1/reviews', reviews_1.reviewsRouter);
app.use('/api/v1/matching', auth_2.authMiddleware, matching_1.matchingRouter);
app.use('/api/v1/admin', auth_2.authMiddleware, admin_1.adminRouter);
app.use('/api/v1/notifications', auth_2.authMiddleware, notifications_1.notificationsRouter);
// 404
app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found', platform: 'Wera API v1' });
});
// Error handler
app.use(errorHandler_1.errorHandler);
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
exports.default = app;
//# sourceMappingURL=index.js.map