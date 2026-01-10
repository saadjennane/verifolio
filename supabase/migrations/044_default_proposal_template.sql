-- ============================================================================
-- 044_default_proposal_template.sql
-- Créer le template par défaut "Verifolio - Standard"
-- ============================================================================

-- Cette migration crée un template système par défaut pour les nouveaux utilisateurs.
-- Le template est créé avec owner_user_id NULL pour indiquer qu'il est système.
-- Les utilisateurs peuvent le dupliquer pour créer leurs propres templates.

-- D'abord, ajouter la possibilité d'avoir des templates système (owner_user_id NULL)
ALTER TABLE proposal_templates
  ALTER COLUMN owner_user_id DROP NOT NULL;

-- Ajouter une colonne pour marquer les templates système
ALTER TABLE proposal_templates
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Créer le template par défaut
INSERT INTO proposal_templates (
  id,
  owner_user_id,
  name,
  description,
  theme,
  is_default,
  is_system,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  NULL,
  'Verifolio - Standard',
  'Template standard avec mise en page classique. Sections personnalisables avec variables dynamiques.',
  '{"primaryColor": "#111111", "accentColor": "#3B82F6", "font": "Inter"}'::jsonb,
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  theme = EXCLUDED.theme,
  updated_at = NOW();

-- Créer les 7 sections du template
-- Section 1: Couverture / Intro
INSERT INTO proposal_template_sections (
  id,
  template_id,
  title,
  body,
  position,
  is_enabled,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Introduction',
  'Bonjour {{contact_name}},

Nous avons le plaisir de vous présenter notre proposition pour **{{deal_title}}**.

Cette proposition a été préparée par {{company_name}} pour répondre aux besoins exprimés par {{client_name}}.

Nous restons à votre disposition pour toute question.',
  0,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  position = EXCLUDED.position,
  updated_at = NOW();

-- Section 2: Contexte & Besoin
INSERT INTO proposal_template_sections (
  id,
  template_id,
  title,
  body,
  position,
  is_enabled,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0001-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Contexte & Besoin',
  '**Contexte**

{{client_name}} souhaite [décrire le contexte du projet].

**Besoin identifié**

Suite à nos échanges, nous avons identifié les besoins suivants :
- [Besoin 1]
- [Besoin 2]
- [Besoin 3]

**Objectifs**

Les objectifs principaux de ce projet sont :
- [Objectif 1]
- [Objectif 2]',
  1,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  position = EXCLUDED.position,
  updated_at = NOW();

-- Section 3: Notre Offre & Approche
INSERT INTO proposal_template_sections (
  id,
  template_id,
  title,
  body,
  position,
  is_enabled,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0001-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Notre Offre & Approche',
  '**Notre approche**

Pour répondre à vos besoins, {{company_name}} propose une approche structurée en plusieurs phases :

**Phase 1 : Analyse**
- Audit de l''existant
- Définition des spécifications

**Phase 2 : Réalisation**
- Développement / Production
- Tests et validation

**Phase 3 : Livraison**
- Mise en production
- Formation et documentation',
  2,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  position = EXCLUDED.position,
  updated_at = NOW();

-- Section 4: Détails de la Prestation
INSERT INTO proposal_template_sections (
  id,
  template_id,
  title,
  body,
  position,
  is_enabled,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0001-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'Détails de la Prestation',
  '**Livrables inclus**

- [Livrable 1]
- [Livrable 2]
- [Livrable 3]

**Ce qui est inclus**

- Support pendant la durée du projet
- Révisions selon les modalités définies
- Documentation technique

**Ce qui n''est pas inclus**

- [Élément non inclus 1]
- [Élément non inclus 2]',
  3,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  position = EXCLUDED.position,
  updated_at = NOW();

-- Section 5: Planning & Modalités
INSERT INTO proposal_template_sections (
  id,
  template_id,
  title,
  body,
  position,
  is_enabled,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0001-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'Planning & Modalités',
  '**Planning prévisionnel**

- **Démarrage** : À définir
- **Phase 1** : [Durée]
- **Phase 2** : [Durée]
- **Livraison finale** : [Date estimée]

**Modalités de collaboration**

- Points d''avancement réguliers
- Communication par email / visio
- Accès à un espace de suivi partagé

**Prérequis**

Pour le bon déroulement du projet, {{client_name}} s''engage à :
- Fournir les éléments nécessaires dans les délais convenus
- Désigner un interlocuteur principal',
  4,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  position = EXCLUDED.position,
  updated_at = NOW();

-- Section 6: Tarif & Conditions
INSERT INTO proposal_template_sections (
  id,
  template_id,
  title,
  body,
  position,
  is_enabled,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0001-000000000006',
  '00000000-0000-0000-0000-000000000001',
  'Tarif & Conditions',
  '**Tarification**

Le montant total de cette prestation s''élève à **[MONTANT] € HT**.

**Conditions de paiement**

- Acompte de 30% à la signature
- Solde à la livraison
- Paiement à 30 jours

**Validité**

Cette proposition est valable 30 jours à compter de sa date d''émission.

**Conditions générales**

Les conditions générales de vente de {{company_name}} s''appliquent à cette proposition.',
  5,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  position = EXCLUDED.position,
  updated_at = NOW();

-- Section 7: Conclusion / CTA
INSERT INTO proposal_template_sections (
  id,
  template_id,
  title,
  body,
  position,
  is_enabled,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0001-000000000007',
  '00000000-0000-0000-0000-000000000001',
  'Conclusion',
  'Nous espérons que cette proposition répond à vos attentes.

{{company_name}} se tient à votre disposition pour tout complément d''information.

Pour accepter cette proposition, vous pouvez utiliser les boutons ci-dessous.

Au plaisir de collaborer avec {{client_name}}.

Cordialement,
**{{company_name}}**',
  6,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  position = EXCLUDED.position,
  updated_at = NOW();

-- Mettre à jour les politiques RLS pour permettre la lecture des templates système
DROP POLICY IF EXISTS "Users can view own templates" ON proposal_templates;
CREATE POLICY "Users can view own or system templates"
  ON proposal_templates FOR SELECT
  USING (owner_user_id = auth.uid() OR is_system = true);

-- Garder les autres politiques pour les templates utilisateur uniquement
DROP POLICY IF EXISTS "Users can create own templates" ON proposal_templates;
CREATE POLICY "Users can create own templates"
  ON proposal_templates FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own templates" ON proposal_templates;
CREATE POLICY "Users can update own templates"
  ON proposal_templates FOR UPDATE
  USING (owner_user_id = auth.uid() AND is_system = false);

DROP POLICY IF EXISTS "Users can delete own templates" ON proposal_templates;
CREATE POLICY "Users can delete own templates"
  ON proposal_templates FOR DELETE
  USING (owner_user_id = auth.uid() AND is_system = false);

-- Permettre la lecture des sections des templates système
DROP POLICY IF EXISTS "Users can view sections of own templates" ON proposal_template_sections;
CREATE POLICY "Users can view sections of own or system templates"
  ON proposal_template_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposal_templates
      WHERE id = template_id
      AND (owner_user_id = auth.uid() OR is_system = true)
    )
  );

-- Index pour la recherche de templates système
CREATE INDEX IF NOT EXISTS idx_proposal_templates_is_system
  ON proposal_templates(is_system) WHERE is_system = true;

COMMENT ON COLUMN proposal_templates.is_system IS 'Templates système disponibles pour tous les utilisateurs (lecture seule)';
