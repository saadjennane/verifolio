-- Migration: 010_template_styling.sql
-- Description: Ajouter les colonnes de style de template à la table companies
-- Date: 2025-12-25

-- Ajouter colonnes template styling à companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS template_primary_color TEXT DEFAULT '#1e40af';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS template_accent_color TEXT DEFAULT '#3b82f6';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS template_font_family TEXT DEFAULT 'system';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS template_logo_position TEXT DEFAULT 'left';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS template_show_bank_details BOOLEAN DEFAULT TRUE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS template_show_notes BOOLEAN DEFAULT TRUE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS template_show_payment_conditions BOOLEAN DEFAULT TRUE;

-- Commentaires
COMMENT ON COLUMN companies.template_primary_color IS 'Couleur principale du template (hex, ex: #1e40af)';
COMMENT ON COLUMN companies.template_accent_color IS 'Couleur accent du template (hex, ex: #3b82f6)';
COMMENT ON COLUMN companies.template_font_family IS 'Police du template: system, serif, mono';
COMMENT ON COLUMN companies.template_logo_position IS 'Position du logo: left, center, right';
COMMENT ON COLUMN companies.template_show_bank_details IS 'Afficher les coordonnées bancaires';
COMMENT ON COLUMN companies.template_show_notes IS 'Afficher les notes du document';
COMMENT ON COLUMN companies.template_show_payment_conditions IS 'Afficher les conditions de paiement';
