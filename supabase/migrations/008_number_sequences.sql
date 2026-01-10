-- Migration: 008_number_sequences.sql
-- Description: Table et fonction RPC pour la numérotation automatique des documents
-- Date: 2025-12-24

-- ============================================================================
-- TABLE: number_sequences
-- Stocke les compteurs de séquence par utilisateur, type de document et période
-- ============================================================================

CREATE TABLE IF NOT EXISTS number_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('invoice', 'quote')),
  period_key TEXT NOT NULL,
  prefix_key TEXT NOT NULL DEFAULT '',
  last_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte unique pour éviter les doublons
  CONSTRAINT number_sequences_unique UNIQUE (user_id, doc_type, period_key, prefix_key)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_number_sequences_lookup
  ON number_sequences (user_id, doc_type, period_key);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_number_sequences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_number_sequences_updated_at ON number_sequences;
CREATE TRIGGER trigger_number_sequences_updated_at
  BEFORE UPDATE ON number_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_number_sequences_updated_at();

-- ============================================================================
-- FONCTION RPC: next_sequence
-- Incrémente et retourne la prochaine valeur de séquence de façon atomique
-- Utilise UPSERT pour créer la séquence si elle n'existe pas
-- ============================================================================

CREATE OR REPLACE FUNCTION next_sequence(
  p_user_id UUID,
  p_doc_type TEXT,
  p_period_key TEXT,
  p_prefix_key TEXT DEFAULT ''
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_value INTEGER;
BEGIN
  -- Validation du doc_type
  IF p_doc_type NOT IN ('invoice', 'quote') THEN
    RAISE EXCEPTION 'Invalid doc_type: %. Must be invoice or quote', p_doc_type;
  END IF;

  -- UPSERT atomique avec increment
  INSERT INTO number_sequences (user_id, doc_type, period_key, prefix_key, last_value)
  VALUES (p_user_id, p_doc_type, p_period_key, p_prefix_key, 1)
  ON CONFLICT (user_id, doc_type, period_key, prefix_key)
  DO UPDATE SET
    last_value = number_sequences.last_value + 1,
    updated_at = NOW()
  RETURNING last_value INTO v_next_value;

  RETURN v_next_value;
END;
$$;

-- Accorder les permissions pour l'appel RPC
GRANT EXECUTE ON FUNCTION next_sequence(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION next_sequence(UUID, TEXT, TEXT, TEXT) TO anon;

-- Désactiver RLS pour cette table (mode dev)
ALTER TABLE number_sequences DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

COMMENT ON TABLE number_sequences IS 'Compteurs de séquence pour la numérotation automatique des documents';
COMMENT ON COLUMN number_sequences.period_key IS 'Clé de période: global, YYYY, ou YYYY-MM selon les tokens du pattern';
COMMENT ON COLUMN number_sequences.prefix_key IS 'Préfixe optionnel pour différencier les séquences (ex: par client)';
COMMENT ON FUNCTION next_sequence IS 'Retourne la prochaine valeur de séquence de façon atomique (thread-safe)';
