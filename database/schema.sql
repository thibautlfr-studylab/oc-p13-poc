-- ============================================================
-- Your Car Your Way — Schéma de base de données (PostgreSQL)
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Domaine : Utilisateur
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    birth_date      DATE,
    address         TEXT,
    language        CHAR(2) NOT NULL DEFAULT 'fr',   -- ISO 639-1 (ex: 'fr', 'en')
    currency        CHAR(3) NOT NULL DEFAULT 'EUR',  -- ISO 4217 (ex: 'EUR', 'GBP', 'USD')
    email_verified_at TIMESTAMP,
    role            VARCHAR(10) NOT NULL DEFAULT 'client',  -- 'client' | 'agent'
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Token de vérification email / réinitialisation mot de passe
CREATE TABLE user_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    type        VARCHAR(30) NOT NULL,  -- 'email_verification' | 'password_reset'
    expires_at  TIMESTAMP NOT NULL,
    used_at     TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Domaine : Agence
-- ============================================================

CREATE TABLE agencies (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(255) NOT NULL,
    city         VARCHAR(100) NOT NULL,
    country_code CHAR(2) NOT NULL,  -- ISO 3166-1 alpha-2 (ex: 'FR', 'GB', 'US')
    address      TEXT NOT NULL,
    phone        VARCHAR(30),
    email        VARCHAR(255)
);

-- ============================================================
-- Domaine : Véhicule
-- ============================================================

CREATE TABLE vehicle_categories (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acriss_code  CHAR(4) NOT NULL,  -- Norme ACRISS (ex: 'CCAR', 'SDAR')
    name         VARCHAR(100) NOT NULL,
    description  TEXT,
    daily_rate   DECIMAL(10, 2) NOT NULL  -- Tarif de base journalier en EUR
);

-- ============================================================
-- Domaine : Location
-- ============================================================

CREATE TABLE offers (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_departure_id   UUID NOT NULL REFERENCES agencies(id),
    agency_return_id      UUID NOT NULL REFERENCES agencies(id),
    vehicle_category_id   UUID NOT NULL REFERENCES vehicle_categories(id),
    departure_datetime    TIMESTAMP NOT NULL,
    return_datetime       TIMESTAMP NOT NULL,
    total_price           DECIMAL(10, 2) NOT NULL,
    available             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_dates CHECK (return_datetime > departure_datetime)
);

CREATE TABLE reservations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    offer_id        UUID NOT NULL REFERENCES offers(id),
    -- pending | confirmed | modified | cancelled
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_amount    DECIMAL(10, 2) NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'EUR',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Domaine : Paiement
-- ============================================================

CREATE TABLE payments (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id              UUID NOT NULL REFERENCES reservations(id),
    stripe_payment_intent_id    VARCHAR(255) NOT NULL UNIQUE,
    amount                      DECIMAL(10, 2) NOT NULL,
    currency                    CHAR(3) NOT NULL,
    -- pending | succeeded | failed | refunded | partially_refunded
    status                      VARCHAR(30) NOT NULL DEFAULT 'pending',
    refunded_amount             DECIMAL(10, 2),
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Domaine : Support client — Messagerie asynchrone
-- ============================================================

CREATE TABLE conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    subject     VARCHAR(255),
    -- open | closed
    status      VARCHAR(20) NOT NULL DEFAULT 'open',
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    -- 'client' | 'agent'
    sender_type      VARCHAR(10) NOT NULL,
    content          TEXT NOT NULL,
    sent_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Domaine : Support client — Chat synchrone
-- ============================================================

CREATE TABLE chat_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    -- waiting | active | ended
    status      VARCHAR(20) NOT NULL DEFAULT 'waiting',
    started_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at    TIMESTAMP
);

-- ============================================================
-- Domaine : Support client — Messages de chat synchrone
-- ============================================================

CREATE TABLE chat_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_id   UUID NOT NULL REFERENCES users(id),
    content     TEXT NOT NULL,
    sent_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Index
-- ============================================================

CREATE INDEX idx_users_email            ON users(email);
CREATE INDEX idx_reservations_user_id   ON reservations(user_id);
CREATE INDEX idx_reservations_offer_id  ON reservations(offer_id);
CREATE INDEX idx_payments_reservation   ON payments(reservation_id);
CREATE INDEX idx_messages_conversation  ON messages(conversation_id);
CREATE INDEX idx_conversations_user_id  ON conversations(user_id);
CREATE INDEX idx_offers_departure       ON offers(departure_datetime);
CREATE INDEX idx_offers_agency_dep      ON offers(agency_departure_id);
CREATE INDEX idx_user_tokens_user_id    ON user_tokens(user_id);
CREATE INDEX idx_chat_messages_session  ON chat_messages(session_id);
