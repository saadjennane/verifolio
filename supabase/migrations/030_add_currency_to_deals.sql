-- ============================================================================
-- Migration 030: Ajouter currency aux deals
-- ============================================================================

-- Ajouter le champ currency à la table deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EUR';

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_deals_currency ON deals(currency);
