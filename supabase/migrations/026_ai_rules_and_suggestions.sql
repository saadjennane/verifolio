-- Migration 026: Règles IA et système de suggestions
-- L'IA peut comprendre, proposer, suggérer
-- L'IA ne peut PAS décider, exécuter, modifier seule

-- Table des règles IA (définit les limites)
CREATE TABLE ai_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('allowed', 'forbidden', 'requires_confirmation')),
  action_category TEXT NOT NULL, -- 'status_change', 'document_generation', 'email_send', 'financial_action'
  action_name TEXT NOT NULL,
  description TEXT NOT NULL,
  requires_user_confirmation BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Règles pré-définies
INSERT INTO ai_rules (rule_type, action_category, action_name, description, requires_user_confirmation) VALUES
  -- CE QUE L'IA PEUT FAIRE (avec confirmation)
  ('allowed', 'document_generation', 'generate_invoice', 'Générer un brouillon de facture pour une mission livrée', true),
  ('allowed', 'document_generation', 'generate_quote', 'Générer un brouillon de devis pour un deal', true),
  ('allowed', 'email_send', 'suggest_reminder', 'Suggérer l''envoi d''une relance client', true),
  ('allowed', 'analysis', 'detect_transitions', 'Détecter des transitions logiques dans le workflow', false),
  ('allowed', 'analysis', 'suggest_actions', 'Proposer des actions contextuelles', false),
  ('allowed', 'analysis', 'prioritize_urgent', 'Suggérer la priorisation de deals urgents', false),
  ('allowed', 'content_generation', 'draft_proposal', 'Rédiger un brouillon de proposition', true),
  ('allowed', 'content_generation', 'draft_email', 'Rédiger un brouillon d''email', true),

  -- CE QUE L'IA NE PEUT PAS FAIRE (interdit sans confirmation utilisateur)
  ('forbidden', 'status_change', 'change_deal_status', 'Changer le statut d''un deal automatiquement', true),
  ('forbidden', 'status_change', 'change_mission_status', 'Changer le statut d''une mission automatiquement', true),
  ('forbidden', 'document_send', 'send_document', 'Envoyer un document sans confirmation', true),
  ('forbidden', 'financial_action', 'mark_invoice_paid', 'Marquer une facture comme payée', true),
  ('forbidden', 'financial_action', 'create_payment', 'Créer un paiement automatiquement', true),
  ('forbidden', 'email_send', 'send_email', 'Envoyer un email sans confirmation', true),
  ('forbidden', 'data_deletion', 'delete_entity', 'Supprimer une entité (deal, mission, client)', true);

-- Table des suggestions IA (ce que l'IA propose à l'utilisateur)
CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL, -- 'action', 'reminder', 'warning', 'optimization'
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('deal', 'mission', 'client', 'invoice', 'review_request')),
  entity_id UUID,

  -- Action proposée (optionnel, pour suggestions actionnables)
  suggested_action JSONB, -- { "type": "generate_invoice", "params": {...} }

  -- Métadonnées
  context JSONB, -- Données contextuelles qui ont déclenché la suggestion

  -- État
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed', 'executed')),
  dismissed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_ai_suggestions_user_status ON ai_suggestions(user_id, status);
CREATE INDEX idx_ai_suggestions_entity ON ai_suggestions(entity_type, entity_id);
CREATE INDEX idx_ai_suggestions_priority ON ai_suggestions(priority, created_at);

-- RLS pour ai_suggestions
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI suggestions"
  ON ai_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI suggestions"
  ON ai_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert AI suggestions"
  ON ai_suggestions FOR INSERT
  WITH CHECK (true);

-- Table des logs d'actions IA (traçabilité)
CREATE TABLE ai_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_id UUID REFERENCES ai_suggestions(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_name TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,

  -- Résultat
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'cancelled')),
  user_confirmed BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,

  -- Contexte
  input_data JSONB,
  output_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_action_logs_user ON ai_action_logs(user_id, created_at);
CREATE INDEX idx_ai_action_logs_entity ON ai_action_logs(entity_type, entity_id);

-- RLS pour ai_action_logs
ALTER TABLE ai_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI action logs"
  ON ai_action_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Fonction pour créer une suggestion IA
CREATE OR REPLACE FUNCTION create_ai_suggestion(
  p_user_id UUID,
  p_type TEXT,
  p_priority TEXT,
  p_title TEXT,
  p_description TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_suggested_action JSONB DEFAULT NULL,
  p_context JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_suggestion_id UUID;
BEGIN
  INSERT INTO ai_suggestions (
    user_id,
    suggestion_type,
    priority,
    title,
    description,
    entity_type,
    entity_id,
    suggested_action,
    context
  ) VALUES (
    p_user_id,
    p_type,
    p_priority,
    p_title,
    p_description,
    p_entity_type,
    p_entity_id,
    p_suggested_action,
    p_context
  )
  RETURNING id INTO v_suggestion_id;

  RETURN v_suggestion_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour détecter des suggestions automatiques
-- Exemple: Mission DELIVERED depuis > 7 jours → suggérer facturation
CREATE OR REPLACE FUNCTION detect_invoice_suggestions()
RETURNS void AS $$
DECLARE
  v_mission RECORD;
BEGIN
  FOR v_mission IN
    SELECT
      m.id,
      m.user_id,
      m.title,
      m.delivered_at
    FROM missions m
    WHERE m.status = 'to_invoice'
      AND m.delivered_at IS NOT NULL
      AND m.delivered_at < NOW() - INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM ai_suggestions s
        WHERE s.entity_type = 'mission'
          AND s.entity_id = m.id
          AND s.suggestion_type = 'action'
          AND s.status = 'pending'
          AND s.suggested_action->>'type' = 'generate_invoice'
      )
  LOOP
    PERFORM create_ai_suggestion(
      v_mission.user_id,
      'action',
      'medium',
      'Mission livrée - Facturation suggérée',
      'La mission "' || v_mission.title || '" a été livrée il y a plus de 7 jours. Souhaites-tu générer la facture ?',
      'mission',
      v_mission.id,
      jsonb_build_object('type', 'generate_invoice', 'mission_id', v_mission.id),
      jsonb_build_object('delivered_days_ago', EXTRACT(DAY FROM NOW() - v_mission.delivered_at))
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour suggérer des relances de factures
CREATE OR REPLACE FUNCTION detect_invoice_reminder_suggestions()
RETURNS void AS $$
DECLARE
  v_invoice RECORD;
BEGIN
  FOR v_invoice IN
    SELECT
      i.id,
      i.user_id,
      i.numero,
      i.date_emission
    FROM invoices i
    WHERE i.status = 'sent'
      AND i.date_emission < NOW() - INTERVAL '10 days'
      AND NOT EXISTS (
        SELECT 1 FROM ai_suggestions s
        WHERE s.entity_type = 'invoice'
          AND s.entity_id = i.id
          AND s.suggestion_type = 'reminder'
          AND s.status = 'pending'
      )
  LOOP
    PERFORM create_ai_suggestion(
      v_invoice.user_id,
      'reminder',
      'medium',
      'Relance client suggérée',
      'La facture ' || v_invoice.numero || ' a été envoyée il y a plus de 10 jours. Souhaites-tu relancer le client ?',
      'invoice',
      v_invoice.id,
      jsonb_build_object('type', 'send_reminder_email', 'invoice_id', v_invoice.id),
      jsonb_build_object('sent_days_ago', EXTRACT(DAY FROM NOW() - v_invoice.date_emission))
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour détecter les deals urgents
CREATE OR REPLACE FUNCTION detect_urgent_deal_suggestions()
RETURNS void AS $$
DECLARE
  v_deal RECORD;
BEGIN
  FOR v_deal IN
    SELECT
      d.id,
      d.user_id,
      d.title,
      d.expected_closing_date
    FROM deals d
    WHERE d.status IN ('draft', 'sent')
      AND d.expected_closing_date IS NOT NULL
      AND d.expected_closing_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM deal_badges db
        WHERE db.deal_id = d.id AND db.badge = 'urgent'
      )
      AND NOT EXISTS (
        SELECT 1 FROM ai_suggestions s
        WHERE s.entity_type = 'deal'
          AND s.entity_id = d.id
          AND s.suggestion_type = 'warning'
          AND s.status = 'pending'
      )
  LOOP
    PERFORM create_ai_suggestion(
      v_deal.user_id,
      'warning',
      'high',
      'Deal urgent - Date de clôture proche',
      'Le deal "' || v_deal.title || '" a une date de clôture dans moins de 7 jours. Souhaites-tu le marquer comme URGENT ?',
      'deal',
      v_deal.id,
      jsonb_build_object('type', 'add_urgent_badge', 'deal_id', v_deal.id),
      jsonb_build_object('days_until_closing', EXTRACT(DAY FROM v_deal.expected_closing_date - NOW()))
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour suggérer des demandes de review
CREATE OR REPLACE FUNCTION detect_review_request_suggestions()
RETURNS void AS $$
DECLARE
  v_mission RECORD;
BEGIN
  FOR v_mission IN
    SELECT
      m.id,
      m.user_id,
      m.title,
      m.invoiced_at
    FROM missions m
    WHERE m.status = 'invoiced'
      AND m.invoiced_at IS NOT NULL
      AND m.invoiced_at < NOW() - INTERVAL '14 days'
      AND NOT EXISTS (
        SELECT 1 FROM review_requests rr
        WHERE rr.user_id = m.user_id
          AND EXISTS (
            SELECT 1 FROM invoices i
            JOIN mission_invoices mi ON mi.invoice_id = i.id
            WHERE mi.mission_id = m.id AND rr.invoice_id = i.id
          )
      )
      AND NOT EXISTS (
        SELECT 1 FROM ai_suggestions s
        WHERE s.entity_type = 'mission'
          AND s.entity_id = m.id
          AND s.suggestion_type = 'action'
          AND s.suggested_action->>'type' = 'create_review_request'
          AND s.status = 'pending'
      )
  LOOP
    PERFORM create_ai_suggestion(
      v_mission.user_id,
      'action',
      'low',
      'Demande d''avis client suggérée',
      'La mission "' || v_mission.title || '" est facturée depuis plus de 14 jours. Souhaites-tu demander un avis client ?',
      'mission',
      v_mission.id,
      jsonb_build_object('type', 'create_review_request', 'mission_id', v_mission.id),
      jsonb_build_object('invoiced_days_ago', EXTRACT(DAY FROM NOW() - v_mission.invoiced_at))
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_ai_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_suggestions_updated_at
  BEFORE UPDATE ON ai_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_suggestions_updated_at();

-- Vue pour les suggestions actives par priorité
CREATE VIEW active_ai_suggestions AS
SELECT
  s.*,
  CASE
    WHEN s.entity_type = 'deal' THEN (SELECT title FROM deals WHERE id = s.entity_id)
    WHEN s.entity_type = 'mission' THEN (SELECT title FROM missions WHERE id = s.entity_id)
    WHEN s.entity_type = 'invoice' THEN (SELECT numero FROM invoices WHERE id = s.entity_id)
    ELSE NULL
  END as entity_title
FROM ai_suggestions s
WHERE s.status = 'pending'
ORDER BY
  CASE s.priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  s.created_at DESC;

COMMENT ON TABLE ai_rules IS 'Définit les règles et limites de ce que l''IA peut et ne peut pas faire';
COMMENT ON TABLE ai_suggestions IS 'Suggestions générées par l''IA pour aider l''utilisateur (toujours avec confirmation)';
COMMENT ON TABLE ai_action_logs IS 'Traçabilité de toutes les actions déclenchées par l''IA';
COMMENT ON FUNCTION create_ai_suggestion IS 'Crée une nouvelle suggestion IA pour un utilisateur';
COMMENT ON FUNCTION detect_invoice_suggestions IS 'Détecte les missions livrées qui devraient être facturées';
COMMENT ON FUNCTION detect_invoice_reminder_suggestions IS 'Détecte les factures envoyées nécessitant une relance';
COMMENT ON FUNCTION detect_urgent_deal_suggestions IS 'Détecte les deals avec date de clôture proche';
COMMENT ON FUNCTION detect_review_request_suggestions IS 'Détecte les missions facturées pour lesquelles demander un avis';
