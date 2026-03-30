# Wera Labour Platform 🚀

[![Deploy](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render)](https://render.com)
[![DB](https://img.shields.io/badge/DB-Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![AI](https://img.shields.io/badge/AI-OpenRouter-FF6B6B)](https://openrouter.ai)
[![Payments](https://img.shields.io/badge/Payments-M--Pesa-00A651)](https://developer.safaricom.co.ke)
[![Currency](https://img.shields.io/badge/Currency-KES-gold)](https://wera.co.ke)

> **Acuity Workspace** | Kadzitu Standard | Zero-Burn Infrastructure

Kenya's premier e-commerce labour marketplace — connecting skilled and semi-skilled workers with clients across East Africa. Built for scale, security, and the Kenyan market.

---

## Architecture

```
wera-platform/
├── frontend/          React 18 + Vite + TailwindCSS (Render Static)
├── backend/           Node.js + Express + TypeScript (Render Web)
├── supabase/          PostgreSQL schema, RLS, migrations
├── .github/           GitHub Actions CI/CD
├── render.yaml        Render Blueprint (one-click deploy)
└── .env.example       Environment variable template
```

## Stack

| Layer | Technology | Tier |
|-------|-----------|------|
| Frontend | React 18 + Vite + Tailwind | Render Free |
| Backend | Node.js + Express + TypeScript | Render Free |
| Database | Supabase Postgres (PostGIS) | Supabase Free |
| Auth | Supabase Auth | Supabase Free |
| AI | OpenRouter (DeepSeek-V3) | Pay-per-use |
| Payments | M-Pesa Daraja STK Push | Safaricom |
| CI/CD | GitHub Actions | GitHub Free |
| Monitoring | New Relic | New Relic Free |

**Total fixed monthly cost: $0** (Kadzitu Zero-Burn Standard)

---

## Features

- **Multi-role auth** — Client, Provider, Admin, Super Admin
- **AI Provider Matching** — DeepSeek-V3 ranks best providers per job
- **AI Price Suggestion** — Market-aware KES pricing for any service
- **M-Pesa Escrow** — STK Push → escrow hold → release on completion
- **15% Platform Fee** — Auto-calculated on all transactions
- **Geolocation Matching** — PostGIS-powered proximity search
- **Rating & Reviews** — Verified post-completion review system
- **Admin Console** — Real-time GMV, revenue, and user management
- **Wallet System** — Per-user KES wallet with full transaction ledger

---

## Quick Start

### Prerequisites
- Node.js 20+
- Supabase account (linked to Acuity Workspace)
- Render account (linked to Acuity Workspace)
- OpenRouter API key
- Safaricom Daraja API credentials

### 1. Clone & Install

```bash
git clone https://github.com/acuity-workspace/wera-platform.git
cd wera-platform

# Install root dev tools
npm install

# Install backend
cd backend && npm install && cd ..

# Install frontend
cd frontend && npm install && cd ..
```

### 2. Configure Environment

```bash
cp .env.example backend/.env
cp .env.example frontend/.env.local
# Edit both files with your actual credentials
```

### 3. Database Setup (Supabase)

```bash
# Install Supabase CLI
npm install -g supabase

# Login & link to Acuity Workspace project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push supabase/migrations/001_initial_schema.sql
```

### 4. Run Locally

```bash
npm run dev
# API: http://localhost:10000
# Frontend: http://localhost:5173
```

### 5. Deploy to Render

```bash
# One-click deploy via Blueprint
# Go to: render.com → New → Blueprint → connect repo
# Render reads render.yaml automatically
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | — | Register user |
| POST | `/api/v1/auth/login` | — | Login → JWT |
| GET | `/api/v1/providers` | — | List providers |
| GET | `/api/v1/providers/:id` | — | Provider profile |
| POST | `/api/v1/bookings` | JWT | Create booking |
| PATCH | `/api/v1/bookings/:id/status` | JWT | Update status |
| POST | `/api/v1/payments/mpesa/stk-push` | JWT | M-Pesa payment |
| POST | `/api/v1/payments/mpesa/callback` | — | Safaricom callback |
| POST | `/api/v1/payments/release-escrow/:id` | JWT | Release to provider |
| POST | `/api/v1/matching/providers` | JWT | AI provider match |
| POST | `/api/v1/matching/price-suggest` | JWT | AI price suggestion |
| GET | `/api/v1/admin/stats` | Admin | Platform KPIs |
| GET | `/health` | — | Health check |

---

## Business Model

| Stream | Rate | Target % of Revenue |
|--------|------|---------------------|
| Service Commission | 15% per transaction | 45% |
| Subscription (Business) | KES 2,500/mo | 20% |
| Job Placement Fees | KES 5,000–15,000 | 15% |
| Training Certifications | KES 500–3,000 | 10% |
| Advertising / Sponsored | Variable | 10% |

---

## Scale Path (Kadzitu Standard)

| Stage | Users | Infrastructure Upgrade |
|-------|-------|------------------------|
| MVP | 0–1K | Render Free + Supabase Free |
| Growth | 1K–10K | Render Starter ($7/mo) |
| Scale | 10K–100K | Render Standard + Supabase Pro |
| Enterprise | 100K+ | Google Cloud Run + Cloud SQL |

---

## Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Navy | `#0A1628` | Primary brand, headers, nav |
| Gold | `#C9A84C` | Accent, CTAs, highlights |
| Slate | `#64748B` | Secondary text, borders |

---

## Contact

**Acuity Workspace**  
Alex Kadzitu · akadzitu@acuity.co.ke  
P.O. Box 70388-00200, Nairobi, Kenya  
www.acuity.co.ke

---

*Wera — Kikuyu for "work". Bridging Kenya's employment gap through technology.*
