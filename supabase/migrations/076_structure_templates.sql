-- ============================================================================
-- Migration: Structure Templates for Proposals
-- ============================================================================
-- Créer des templates de structure avec pages pré-définies et placeholders
-- Ces templates sont différents des "design templates" (proposal_templates)
-- qui définissent le thème/couleurs. Ceux-ci définissent la STRUCTURE des pages.

-- ============================================================================
-- Table: structure_templates
-- ============================================================================

CREATE TABLE structure_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  thumbnail_svg TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_structure_templates_owner ON structure_templates(owner_user_id);
CREATE INDEX idx_structure_templates_system ON structure_templates(is_system);
CREATE INDEX idx_structure_templates_category ON structure_templates(category);

-- RLS
ALTER TABLE structure_templates ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les templates système
CREATE POLICY "Anyone can view system structure templates"
  ON structure_templates FOR SELECT
  USING (is_system = true);

-- Les utilisateurs peuvent voir leurs propres templates
CREATE POLICY "Users can view own structure templates"
  ON structure_templates FOR SELECT
  USING (owner_user_id = auth.uid());

-- Les utilisateurs peuvent créer leurs propres templates
CREATE POLICY "Users can create own structure templates"
  ON structure_templates FOR INSERT
  WITH CHECK (owner_user_id = auth.uid() AND is_system = false);

-- Les utilisateurs peuvent modifier leurs propres templates (pas les système)
CREATE POLICY "Users can update own structure templates"
  ON structure_templates FOR UPDATE
  USING (owner_user_id = auth.uid() AND is_system = false);

-- Les utilisateurs peuvent supprimer leurs propres templates (pas les système)
CREATE POLICY "Users can delete own structure templates"
  ON structure_templates FOR DELETE
  USING (owner_user_id = auth.uid() AND is_system = false);

-- ============================================================================
-- Table: structure_template_pages
-- ============================================================================

CREATE TABLE structure_template_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES structure_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT false,
  content JSONB NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_structure_template_pages_template ON structure_template_pages(template_id);
CREATE INDEX idx_structure_template_pages_sort ON structure_template_pages(template_id, sort_order);

-- RLS
ALTER TABLE structure_template_pages ENABLE ROW LEVEL SECURITY;

-- Les pages héritent des permissions du template parent
CREATE POLICY "Users can view pages of accessible templates"
  ON structure_template_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM structure_templates st
      WHERE st.id = template_id
      AND (st.is_system = true OR st.owner_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage pages of own templates"
  ON structure_template_pages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM structure_templates st
      WHERE st.id = template_id
      AND st.owner_user_id = auth.uid()
      AND st.is_system = false
    )
  );

-- ============================================================================
-- Seed: 5 Templates Système
-- ============================================================================

-- 1. Proposition Commerciale
WITH inserted_template AS (
  INSERT INTO structure_templates (name, description, category, is_system)
  VALUES (
    'Proposition Commerciale',
    'Structure complète pour répondre à un appel d''offres ou présenter une offre',
    'commercial',
    true
  )
  RETURNING id
)
INSERT INTO structure_template_pages (template_id, title, sort_order, is_cover, content)
SELECT id, title, sort_order, is_cover, content::jsonb
FROM inserted_template,
(VALUES
  ('Couverture', 0, true, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1,"textAlign":"center"},"content":[{"type":"text","text":"[Titre de la proposition]"}]},{"type":"paragraph","attrs":{"textAlign":"center"},"content":[{"type":"text","text":"[Nom du client]"}]},{"type":"paragraph","attrs":{"textAlign":"center"},"content":[{"type":"text","text":"[Date]"}]}]}'),
  ('Contexte', 1, false, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Contexte et Objectifs"}]},{"type":"paragraph","content":[{"type":"text","text":"Décrivez le contexte du projet et les objectifs du client..."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Enjeux identifiés"}]},{"type":"paragraph","content":[{"type":"text","text":"Listez les enjeux et défis à relever..."}]}]}'),
  ('Notre Solution', 2, false, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Notre Solution"}]},{"type":"paragraph","content":[{"type":"text","text":"Présentez votre approche et méthodologie..."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Livrables"}]},{"type":"paragraph","content":[{"type":"text","text":"Détaillez les livrables prévus..."}]}]}'),
  ('Tarifs', 3, false, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Investissement"}]},{"type":"paragraph","content":[{"type":"text","text":"Présentez votre grille tarifaire..."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Options"}]},{"type":"paragraph","content":[{"type":"text","text":"Listez les options disponibles..."}]}]}'),
  ('Prochaines Étapes', 4, false, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Prochaines Étapes"}]},{"type":"paragraph","content":[{"type":"text","text":"Décrivez le processus de validation et démarrage..."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Conditions"}]},{"type":"paragraph","content":[{"type":"text","text":"Mentionnez les conditions générales..."}]}]}')
) AS pages(title, sort_order, is_cover, content);

-- 2. Devis Détaillé
WITH inserted_template AS (
  INSERT INTO structure_templates (name, description, category, is_system)
  VALUES (
    'Devis Détaillé',
    'Structure pour un devis technique avec périmètre, planning et budget',
    'quote',
    true
  )
  RETURNING id
)
INSERT INTO structure_template_pages (template_id, title, sort_order, is_cover, content)
SELECT id, title, sort_order, is_cover, content::jsonb
FROM inserted_template,
(VALUES
  ('Couverture', 0, true, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1,"textAlign":"center"},"content":[{"type":"text","text":"Devis"}]},{"type":"paragraph","attrs":{"textAlign":"center"},"content":[{"type":"text","text":"[Référence du devis]"}]},{"type":"paragraph","attrs":{"textAlign":"center"},"content":[{"type":"text","text":"[Client]"}]}]}'),
  ('Périmètre', 1, false, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Périmètre du Projet"}]},{"type":"paragraph","content":[{"type":"text","text":"Décrivez le périmètre inclus et exclu..."}]}]}'),
  ('Livrables', 2, false, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Livrables"}]},{"type":"paragraph","content":[{"type":"text","text":"Listez tous les livrables avec leur description..."}]}]}'),
  ('Planning', 3, false, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Planning Prévisionnel"}]},{"type":"paragraph","content":[{"type":"text","text":"Décrivez les phases et jalons du projet..."}]}]}'),
  ('Budget', 4, false, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Budget"}]},{"type":"paragraph","content":[{"type":"text","text":"Présentez le budget détaillé..."}]}]}')
) AS pages(title, sort_order, is_cover, content);

-- 3. Présentation Agence
WITH inserted_template AS (
  INSERT INTO structure_templates (name, description, category, is_system)
  VALUES (
    'Présentation Agence',
    'Pour présenter votre agence, vos références et votre méthodologie',
    'agency',
    true
  )
  RETURNING id
)
INSERT INTO structure_template_pages (template_id, title, sort_order, is_cover, content)
SELECT id, title, sort_order, is_cover, content::jsonb
FROM inserted_template,
(VALUES
  ('Couverture', 0, true, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1,"textAlign":"center"},"content":[{"type":"text","text":"[Nom de l''agence]"}]},{"type":"paragraph","attrs":{"textAlign":"center"},"content":[{"type":"text","text":"Présentation"}]}]}'),
  ('À Propos', 1, false, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"À Propos de Nous"}]},{"type":"paragraph","content":[{"type":"text","text":"Présentez votre agence, votre histoire, vos valeurs..."}]}]}'),
  ('Nos Références', 2, false, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Nos Références"}]},{"type":"paragraph","content":[{"type":"text","text":"Présentez vos projets phares et clients..."}]}]}'),
  ('Méthodologie', 3, false, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Notre Méthodologie"}]},{"type":"paragraph","content":[{"type":"text","text":"Décrivez votre approche et processus de travail..."}]}]}'),
  ('Contact', 4, false, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Contactez-Nous"}]},{"type":"paragraph","content":[{"type":"text","text":"Coordonnées et formulaire de contact..."}]}]}')
) AS pages(title, sort_order, is_cover, content);

-- 4. Projet Créatif
WITH inserted_template AS (
  INSERT INTO structure_templates (name, description, category, is_system)
  VALUES (
    'Projet Créatif',
    'Structure adaptée aux projets créatifs avec brief, moodboard et concept',
    'creative',
    true
  )
  RETURNING id
)
INSERT INTO structure_template_pages (template_id, title, sort_order, is_cover, content)
SELECT id, title, sort_order, is_cover, content::jsonb
FROM inserted_template,
(VALUES
  ('Couverture', 0, true, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1,"textAlign":"center"},"content":[{"type":"text","text":"[Titre du projet]"}]},{"type":"paragraph","attrs":{"textAlign":"center"},"content":[{"type":"text","text":"Direction Artistique"}]}]}'),
  ('Brief', 1, false, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Le Brief"}]},{"type":"paragraph","content":[{"type":"text","text":"Résumé du brief client et des contraintes..."}]}]}'),
  ('Moodboard', 2, false, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Moodboard"}]},{"type":"paragraph","content":[{"type":"text","text":"Insérez vos images d''inspiration et références visuelles..."}]}]}'),
  ('Concept', 3, false, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Concept Créatif"}]},{"type":"paragraph","content":[{"type":"text","text":"Présentez votre direction artistique et concept..."}]}]}'),
  ('Détails Techniques', 4, false, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Spécifications Techniques"}]},{"type":"paragraph","content":[{"type":"text","text":"Formats, dimensions, contraintes techniques..."}]}]}')
) AS pages(title, sort_order, is_cover, content);

-- 5. Document Vierge
WITH inserted_template AS (
  INSERT INTO structure_templates (name, description, category, is_system)
  VALUES (
    'Document Vierge',
    'Structure minimale pour partir de zéro',
    'general',
    true
  )
  RETURNING id
)
INSERT INTO structure_template_pages (template_id, title, sort_order, is_cover, content)
SELECT id, title, sort_order, is_cover, content::jsonb
FROM inserted_template,
(VALUES
  ('Couverture', 0, true, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1,"textAlign":"center"},"content":[{"type":"text","text":"[Titre du document]"}]},{"type":"paragraph","attrs":{"textAlign":"center"}}]}'),
  ('Page 1', 1, false, '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"[Titre de la section]"}]},{"type":"paragraph","content":[{"type":"text","text":"Commencez à rédiger ici..."}]}]}')
) AS pages(title, sort_order, is_cover, content);

-- ============================================================================
-- Trigger: updated_at
-- ============================================================================

CREATE TRIGGER update_structure_templates_updated_at
  BEFORE UPDATE ON structure_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
