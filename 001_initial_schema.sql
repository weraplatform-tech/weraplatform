-- =============================================================
-- WERA LABOUR PLATFORM — SUPABASE SCHEMA
-- Acuity Workspace | Kadzitu Standard
-- Currency: KES | Region: Kenya/East Africa
-- =============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE user_role AS ENUM ('client', 'provider', 'admin', 'super_admin');
CREATE TYPE account_status AS ENUM ('pending', 'active', 'suspended', 'banned');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'disputed');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded', 'escrowed');
CREATE TYPE payment_method AS ENUM ('mpesa', 'card', 'bank_transfer', 'wallet');
CREATE TYPE service_category AS ENUM (
  'skilled_trades', 'construction', 'domestic_services',
  'personal_services', 'professional_services', 'creative_services',
  'hospitality', 'it_technology', 'healthcare', 'education'
);
CREATE TYPE job_type AS ENUM ('one_time', 'recurring', 'full_time', 'part_time', 'contract');
CREATE TYPE notification_type AS ENUM ('booking', 'payment', 'message', 'review', 'system', 'alert');

-- =============================================================
-- PROFILES (extends Supabase auth.users)
-- =============================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'client',
  status        account_status NOT NULL DEFAULT 'pending',
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  display_name  VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  phone         VARCHAR(20) UNIQUE,
  avatar_url    TEXT,
  bio           TEXT,
  location      VARCHAR(255),
  county        VARCHAR(100),
  coordinates   GEOGRAPHY(POINT, 4326),
  id_number     VARCHAR(20) UNIQUE,
  id_verified   verification_status NOT NULL DEFAULT 'unverified',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active   TIMESTAMPTZ DEFAULT NOW(),
  metadata      JSONB DEFAULT '{}'
);

-- =============================================================
-- PROVIDER PROFILES
-- =============================================================

CREATE TABLE provider_profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category          service_category NOT NULL,
  subcategory       VARCHAR(100),
  title             VARCHAR(200) NOT NULL,
  description       TEXT,
  hourly_rate_kes   NUMERIC(10,2) NOT NULL DEFAULT 0,
  daily_rate_kes    NUMERIC(10,2),
  experience_years  INTEGER DEFAULT 0,
  skills            TEXT[] DEFAULT '{}',
  languages         TEXT[] DEFAULT '{"Swahili","English"}',
  is_available      BOOLEAN DEFAULT TRUE,
  radius_km         INTEGER DEFAULT 20,
  rating_avg        NUMERIC(3,2) DEFAULT 0,
  rating_count      INTEGER DEFAULT 0,
  jobs_completed    INTEGER DEFAULT 0,
  response_rate     NUMERIC(5,2) DEFAULT 100,
  verified_skills   TEXT[] DEFAULT '{}',
  portfolio_urls    TEXT[] DEFAULT '{}',
  certifications    JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- SERVICES CATALOG
-- =============================================================

CREATE TABLE services (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id     UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  title           VARCHAR(300) NOT NULL,
  description     TEXT NOT NULL,
  category        service_category NOT NULL,
  subcategory     VARCHAR(100),
  price_kes       NUMERIC(10,2) NOT NULL,
  price_type      VARCHAR(20) DEFAULT 'fixed' CHECK (price_type IN ('fixed','hourly','daily','negotiable')),
  images          TEXT[] DEFAULT '{}',
  tags            TEXT[] DEFAULT '{}',
  is_active       BOOLEAN DEFAULT TRUE,
  is_featured     BOOLEAN DEFAULT FALSE,
  views           INTEGER DEFAULT 0,
  bookings_count  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- BOOKINGS
-- =============================================================

CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_ref       VARCHAR(20) UNIQUE NOT NULL DEFAULT 'WR-' || UPPER(SUBSTRING(uuid_generate_v4()::TEXT, 1, 8)),
  client_id         UUID NOT NULL REFERENCES profiles(id),
  provider_id       UUID NOT NULL REFERENCES profiles(id),
  service_id        UUID REFERENCES services(id),
  status            booking_status NOT NULL DEFAULT 'pending',
  job_type          job_type NOT NULL DEFAULT 'one_time',
  title             VARCHAR(300) NOT NULL,
  description       TEXT,
  location          VARCHAR(255),
  coordinates       GEOGRAPHY(POINT, 4326),
  scheduled_start   TIMESTAMPTZ NOT NULL,
  scheduled_end     TIMESTAMPTZ,
  actual_start      TIMESTAMPTZ,
  actual_end        TIMESTAMPTZ,
  quoted_amount_kes NUMERIC(12,2) NOT NULL,
  final_amount_kes  NUMERIC(12,2),
  platform_fee_kes  NUMERIC(12,2) GENERATED ALWAYS AS (COALESCE(final_amount_kes, quoted_amount_kes) * 0.15) STORED,
  provider_payout_kes NUMERIC(12,2) GENERATED ALWAYS AS (COALESCE(final_amount_kes, quoted_amount_kes) * 0.85) STORED,
  notes             TEXT,
  cancellation_reason TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- PAYMENTS
-- =============================================================

CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id        UUID NOT NULL REFERENCES bookings(id),
  payer_id          UUID NOT NULL REFERENCES profiles(id),
  recipient_id      UUID NOT NULL REFERENCES profiles(id),
  amount_kes        NUMERIC(12,2) NOT NULL,
  platform_fee_kes  NUMERIC(12,2) NOT NULL,
  net_amount_kes    NUMERIC(12,2) NOT NULL,
  method            payment_method NOT NULL,
  status            payment_status NOT NULL DEFAULT 'pending',
  mpesa_ref         VARCHAR(100),
  mpesa_receipt     VARCHAR(100),
  transaction_id    VARCHAR(255),
  escrow_released   BOOLEAN DEFAULT FALSE,
  escrow_release_at TIMESTAMPTZ,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- REVIEWS
-- =============================================================

CREATE TABLE reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id    UUID UNIQUE NOT NULL REFERENCES bookings(id),
  reviewer_id   UUID NOT NULL REFERENCES profiles(id),
  reviewee_id   UUID NOT NULL REFERENCES profiles(id),
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         VARCHAR(200),
  body          TEXT,
  is_public     BOOLEAN DEFAULT TRUE,
  response      TEXT,
  response_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- MESSAGES
-- =============================================================

CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID REFERENCES bookings(id),
  participant1_id UUID NOT NULL REFERENCES profiles(id),
  participant2_id UUID NOT NULL REFERENCES profiles(id),
  last_message TEXT,
  last_msg_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(id),
  body            TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- NOTIFICATIONS
-- =============================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       VARCHAR(255) NOT NULL,
  body        TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  action_url  TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- WALLET / EARNINGS
-- =============================================================

CREATE TABLE wallets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE NOT NULL REFERENCES profiles(id),
  balance_kes     NUMERIC(14,2) NOT NULL DEFAULT 0,
  pending_kes     NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_earned_kes NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_spent_kes NUMERIC(14,2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id   UUID NOT NULL REFERENCES wallets(id),
  type        VARCHAR(30) NOT NULL CHECK (type IN ('credit','debit','escrow_hold','escrow_release','refund','withdrawal')),
  amount_kes  NUMERIC(12,2) NOT NULL,
  balance_after_kes NUMERIC(14,2) NOT NULL,
  reference   VARCHAR(100),
  description TEXT,
  booking_id  UUID REFERENCES bookings(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TRAINING & CERTIFICATIONS
-- =============================================================

CREATE TABLE training_courses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(300) NOT NULL,
  description TEXT,
  category    service_category,
  duration_h  INTEGER,
  price_kes   NUMERIC(10,2) DEFAULT 0,
  is_free     BOOLEAN DEFAULT TRUE,
  modules     JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_certifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id),
  course_id     UUID REFERENCES training_courses(id),
  title         VARCHAR(300) NOT NULL,
  issuer        VARCHAR(200),
  issued_at     DATE NOT NULL,
  expires_at    DATE,
  cert_url      TEXT,
  verified      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_coordinates ON profiles USING GIST(coordinates);
CREATE INDEX idx_provider_profiles_category ON provider_profiles(category);
CREATE INDEX idx_provider_profiles_available ON provider_profiles(is_available);
CREATE INDEX idx_provider_profiles_coordinates ON provider_profiles(user_id);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_active ON services(is_active);
CREATE INDEX idx_services_provider ON services(provider_id);
CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_provider ON bookings(provider_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_scheduled ON bookings(scheduled_start);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);

-- Full text search
CREATE INDEX idx_services_search ON services USING GIN(to_tsvector('english', title || ' ' || description));
CREATE INDEX idx_provider_search ON provider_profiles USING GIN(to_tsvector('english', title || ' ' || COALESCE(description,'')));

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles: users read their own, admins read all
CREATE POLICY "profiles_own_read" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_own_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (status = 'active');

-- Services: public read active, providers manage own
CREATE POLICY "services_public_read" ON services FOR SELECT USING (is_active = TRUE);
CREATE POLICY "services_provider_manage" ON services FOR ALL USING (
  provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid())
);

-- Bookings: clients and providers see their own
CREATE POLICY "bookings_participant_read" ON bookings FOR SELECT USING (
  auth.uid() = client_id OR auth.uid() = provider_id
);
CREATE POLICY "bookings_client_create" ON bookings FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Notifications: own only
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (auth.uid() = user_id);

-- Wallets: own only
CREATE POLICY "wallets_own" ON wallets FOR ALL USING (auth.uid() = user_id);

-- =============================================================
-- TRIGGERS — auto-update timestamps
-- =============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_provider_updated BEFORE UPDATE ON provider_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create wallet on new profile
CREATE OR REPLACE FUNCTION create_wallet_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets(user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_wallet AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION create_wallet_for_user();

-- Update provider rating on new review
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE provider_profiles SET
    rating_avg = (SELECT AVG(rating) FROM reviews WHERE reviewee_id = NEW.reviewee_id),
    rating_count = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = NEW.reviewee_id)
  WHERE user_id = NEW.reviewee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_rating AFTER INSERT OR UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_provider_rating();
