-- ============================================================================
-- Migration 050: Seed Job Profiles & Variables
-- Données initiales des métiers et variables suggérées
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Insert Profiles
-- ----------------------------------------------------------------------------

INSERT INTO job_profiles (id, label, category, position) VALUES
  ('mentalist', 'Mentaliste / Magicien / Animateur', 'event', 1),
  ('musician', 'Musicien / Groupe / DJ', 'event', 2),
  ('event_agency', 'Événementiel (agence / organisateur)', 'event', 3),
  ('consultant', 'Consultant (stratégie / ops / RH / finance)', 'b2b', 10),
  ('coach', 'Coach / Formateur', 'b2b', 11),
  ('marketing', 'Prestataire marketing / growth', 'b2b', 12),
  ('developer', 'Développeur web / mobile', 'tech', 20),
  ('nocode', 'No-code / Automations', 'tech', 21),
  ('photographer', 'Photographe / Vidéaste', 'creative', 30),
  ('designer', 'Designer UI/UX / Graphiste', 'creative', 31),
  ('copywriter', 'Rédacteur / Copywriter', 'creative', 32),
  ('community_manager', 'Community Manager', 'creative', 33),
  ('video_editor', 'Monteur vidéo / Motion design', 'creative', 34),
  ('architect', 'Architecte / Décorateur', 'field', 40),
  ('artisan', 'Artisan / Travaux', 'field', 41),
  ('virtual_assistant', 'Assistant virtuel / admin', 'admin', 50),
  ('other', 'Autre métier', 'other', 99);

-- ----------------------------------------------------------------------------
-- Insert Variables: Mentaliste
-- ----------------------------------------------------------------------------

INSERT INTO job_profile_variables (profile_id, key, label, type, options, required_suggestion, examples, help, position) VALUES
  ('mentalist', 'participants_count', 'Nombre de participants', 'number', NULL, true, ARRAY['50', '150', '300'], 'Nombre estimé de participants à l''événement.', 1),
  ('mentalist', 'event_type', 'Type d''événement', 'select', '["Soirée entreprise", "Mariage", "Anniversaire", "Séminaire", "Salon/Foire"]', true, ARRAY['Soirée entreprise', 'Mariage'], 'Nature de l''événement.', 2),
  ('mentalist', 'duration_hours', 'Durée de prestation', 'duration', NULL, true, ARRAY['1h30', '2h', '3h'], 'Durée totale de l''intervention.', 3),
  ('mentalist', 'setup_included', 'Installation incluse', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'L''installation du matériel est-elle comprise ?', 4),
  ('mentalist', 'travel_included', 'Déplacement inclus', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'Les frais de déplacement sont-ils inclus ?', 5);

-- ----------------------------------------------------------------------------
-- Insert Variables: Musicien
-- ----------------------------------------------------------------------------

INSERT INTO job_profile_variables (profile_id, key, label, type, options, required_suggestion, examples, help, position) VALUES
  ('musician', 'set_duration', 'Durée du set', 'duration', NULL, true, ARRAY['2h', '3h', '4h'], 'Durée totale de la prestation musicale.', 1),
  ('musician', 'event_type', 'Type d''événement', 'select', '["Mariage", "Soirée privée", "Concert", "Bar/Restaurant", "Corporate"]', true, ARRAY['Mariage', 'Soirée privée'], 'Nature de l''événement.', 2),
  ('musician', 'sound_system', 'Sonorisation fournie', 'boolean', NULL, true, ARRAY['Oui', 'Non'], 'Le matériel son est-il fourni par le prestataire ?', 3),
  ('musician', 'musicians_count', 'Nombre de musiciens', 'number', NULL, false, ARRAY['1', '3', '5'], 'Nombre de musiciens sur scène.', 4),
  ('musician', 'repertoire', 'Style musical', 'text', NULL, false, ARRAY['Jazz', 'Pop/Rock', 'Musique orientale'], 'Genre ou répertoire principal.', 5);

-- ----------------------------------------------------------------------------
-- Insert Variables: Événementiel
-- ----------------------------------------------------------------------------

INSERT INTO job_profile_variables (profile_id, key, label, type, options, required_suggestion, examples, help, position) VALUES
  ('event_agency', 'event_type', 'Type d''événement', 'select', '["Séminaire", "Soirée gala", "Teambuilding", "Lancement produit", "Conférence"]', true, ARRAY['Séminaire', 'Soirée gala'], 'Nature de l''événement à organiser.', 1),
  ('event_agency', 'guests_count', 'Nombre d''invités', 'number', NULL, true, ARRAY['50', '150', '500'], 'Jauge attendue.', 2),
  ('event_agency', 'services_included', 'Prestations incluses', 'text', NULL, true, ARRAY['Lieu + traiteur', 'Coordination jour J', 'Clé en main'], 'Étendue des services proposés.', 3),
  ('event_agency', 'venue_search', 'Recherche de lieu', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'La recherche de lieu est-elle incluse ?', 4),
  ('event_agency', 'day_coordination', 'Coordination jour J', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'Présence le jour de l''événement ?', 5);

-- ----------------------------------------------------------------------------
-- Insert Variables: Consultant
-- ----------------------------------------------------------------------------

INSERT INTO job_profile_variables (profile_id, key, label, type, options, required_suggestion, examples, help, position) VALUES
  ('consultant', 'mission_scope', 'Périmètre de la mission', 'text', NULL, true, ARRAY['Audit RH', 'Optimisation process', 'Stratégie commerciale'], 'Description courte du périmètre d''intervention.', 1),
  ('consultant', 'days_count', 'Nombre de jours', 'number', NULL, true, ARRAY['5', '10', '20'], 'Volume estimé en jours de prestation.', 2),
  ('consultant', 'work_mode', 'Mode de travail', 'select', '["Sur site", "À distance", "Hybride"]', true, ARRAY['Hybride', 'À distance'], 'Lieu d''exécution de la mission.', 3),
  ('consultant', 'deliverables', 'Livrables attendus', 'text', NULL, false, ARRAY['Rapport d''audit', 'Plan d''action', 'Formation équipe'], 'Principaux livrables de la mission.', 4),
  ('consultant', 'team_size', 'Taille de l''équipe concernée', 'number', NULL, false, ARRAY['5', '15', '50'], 'Nombre de personnes impactées.', 5);

-- ----------------------------------------------------------------------------
-- Insert Variables: Coach / Formateur
-- ----------------------------------------------------------------------------

INSERT INTO job_profile_variables (profile_id, key, label, type, options, required_suggestion, examples, help, position) VALUES
  ('coach', 'session_count', 'Nombre de sessions', 'number', NULL, true, ARRAY['1', '5', '10'], 'Nombre total de sessions prévues.', 1),
  ('coach', 'session_duration', 'Durée par session', 'duration', NULL, true, ARRAY['1h', '2h', 'Demi-journée'], 'Durée de chaque session.', 2),
  ('coach', 'format', 'Format', 'select', '["Individuel", "Groupe", "Mixte"]', true, ARRAY['Individuel', 'Groupe'], 'Coaching individuel ou collectif.', 3),
  ('coach', 'participants_count', 'Nombre de participants', 'number', NULL, false, ARRAY['1', '8', '20'], 'Nombre de personnes formées/coachées.', 4),
  ('coach', 'topic', 'Thématique', 'text', NULL, false, ARRAY['Leadership', 'Gestion du stress', 'Prise de parole'], 'Sujet principal de l''accompagnement.', 5);

-- ----------------------------------------------------------------------------
-- Insert Variables: Marketing
-- ----------------------------------------------------------------------------

INSERT INTO job_profile_variables (profile_id, key, label, type, options, required_suggestion, examples, help, position) VALUES
  ('marketing', 'service_type', 'Type de prestation', 'select', '["SEO", "SEA/Ads", "Emailing", "Stratégie", "Growth hacking"]', true, ARRAY['SEO', 'SEA/Ads'], 'Nature de la prestation marketing.', 1),
  ('marketing', 'duration_months', 'Durée d''accompagnement', 'number', NULL, true, ARRAY['1', '3', '6'], 'Durée en mois de la mission.', 2),
  ('marketing', 'monthly_budget', 'Budget média mensuel', 'number', NULL, false, ARRAY['500', '2000', '10000'], 'Budget publicitaire mensuel (hors honoraires).', 3),
  ('marketing', 'reporting_frequency', 'Fréquence de reporting', 'select', '["Hebdomadaire", "Bi-mensuel", "Mensuel"]', false, ARRAY['Mensuel', 'Bi-mensuel'], 'Rythme des rapports de performance.', 4),
  ('marketing', 'kpis', 'KPIs suivis', 'text', NULL, false, ARRAY['Trafic, Leads', 'ROAS, CPA', 'MRR, Churn'], 'Indicateurs clés à suivre.', 5);

-- ----------------------------------------------------------------------------
-- Insert Variables: Développeur
-- ----------------------------------------------------------------------------

INSERT INTO job_profile_variables (profile_id, key, label, type, options, required_suggestion, examples, help, position) VALUES
  ('developer', 'project_type', 'Type de projet', 'select', '["Site vitrine", "Application web", "Application mobile", "API/Backend", "Refonte"]', true, ARRAY['Application web', 'Site vitrine'], 'Nature du développement.', 1),
  ('developer', 'estimated_days', 'Estimation en jours', 'number', NULL, true, ARRAY['5', '15', '40'], 'Volume estimé de travail.', 2),
  ('developer', 'tech_stack', 'Technologies', 'text', NULL, true, ARRAY['React, Node.js', 'Flutter', 'WordPress'], 'Stack technique utilisée.', 3),
  ('developer', 'maintenance_included', 'Maintenance incluse', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'Une période de maintenance est-elle incluse ?', 4),
  ('developer', 'hosting_setup', 'Mise en prod incluse', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'Le déploiement est-il compris ?', 5);

-- ----------------------------------------------------------------------------
-- Insert Variables: No-code
-- ----------------------------------------------------------------------------

INSERT INTO job_profile_variables (profile_id, key, label, type, options, required_suggestion, examples, help, position) VALUES
  ('nocode', 'platform', 'Plateforme principale', 'select', '["Notion", "Airtable", "Make/Zapier", "Bubble", "Webflow"]', true, ARRAY['Make/Zapier', 'Notion'], 'Outil no-code principal utilisé.', 1),
  ('nocode', 'automations_count', 'Nombre d''automations', 'number', NULL, true, ARRAY['3', '10', '25'], 'Nombre de workflows/automations à créer.', 2),
  ('nocode', 'systems_connected', 'Systèmes à connecter', 'text', NULL, true, ARRAY['CRM + Email', 'Stripe + Notion', 'Google Sheets + Slack'], 'Outils/systèmes à intégrer.', 3),
  ('nocode', 'training_included', 'Formation incluse', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'Une formation à l''utilisation est-elle prévue ?', 4),
  ('nocode', 'documentation', 'Documentation fournie', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'Une documentation technique est-elle livrée ?', 5);

-- ----------------------------------------------------------------------------
-- Insert Variables: Photographe
-- ----------------------------------------------------------------------------

INSERT INTO job_profile_variables (profile_id, key, label, type, options, required_suggestion, examples, help, position) VALUES
  ('photographer', 'coverage_duration', 'Durée de couverture', 'duration', NULL, true, ARRAY['4h', '8h', 'Journée complète'], 'Temps de présence sur place.', 1),
  ('photographer', 'deliverables_count', 'Nombre de photos/vidéos livrées', 'number', NULL, true, ARRAY['50', '200', '500'], 'Nombre de fichiers retouchés/montés livrés.', 2),
  ('photographer', 'shooting_type', 'Type de shooting', 'select', '["Mariage", "Corporate", "Portrait", "Produit", "Événement"]', true, ARRAY['Mariage', 'Corporate'], 'Nature de la prestation photo/vidéo.', 3),
  ('photographer', 'delivery_delay', 'Délai de livraison', 'text', NULL, false, ARRAY['2 semaines', '1 mois', '48h'], 'Délai pour recevoir les fichiers finaux.', 4),
  ('photographer', 'raw_files_included', 'Fichiers RAW inclus', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'Les fichiers bruts sont-ils fournis ?', 5);

-- ----------------------------------------------------------------------------
-- Insert Variables: Designer
-- ----------------------------------------------------------------------------

INSERT INTO job_profile_variables (profile_id, key, label, type, options, required_suggestion, examples, help, position) VALUES
  ('designer', 'deliverable_type', 'Type de livrable', 'select', '["Maquettes UI", "Identité visuelle", "Print", "Illustrations", "Packaging"]', true, ARRAY['Maquettes UI', 'Identité visuelle'], 'Nature des livrables design.', 1),
  ('designer', 'screens_count', 'Nombre d''écrans/pages', 'number', NULL, true, ARRAY['5', '15', '30'], 'Volume de pages ou écrans à concevoir.', 2),
  ('designer', 'revisions_count', 'Nombre d''allers-retours', 'number', NULL, true, ARRAY['2', '3', '5'], 'Nombre de cycles de révision inclus.', 3),
  ('designer', 'source_files', 'Fichiers sources inclus', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'Les fichiers sources (Figma, AI...) sont-ils fournis ?', 4),
  ('designer', 'brand_guidelines', 'Charte graphique existante', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'Une charte graphique existe-t-elle déjà ?', 5);

-- ----------------------------------------------------------------------------
-- Insert Variables: Copywriter
-- ----------------------------------------------------------------------------

INSERT INTO job_profile_variables (profile_id, key, label, type, options, required_suggestion, examples, help, position) VALUES
  ('copywriter', 'content_type', 'Type de contenu', 'select', '["Articles SEO", "Pages web", "Emails", "Scripts vidéo", "Livres blancs"]', true, ARRAY['Articles SEO', 'Pages web'], 'Nature des contenus à produire.', 1),
  ('copywriter', 'word_count', 'Volume en mots', 'number', NULL, true, ARRAY['1000', '5000', '20000'], 'Volume total estimé en mots.', 2),
  ('copywriter', 'pieces_count', 'Nombre de contenus', 'number', NULL, true, ARRAY['4', '10', '20'], 'Nombre d''articles/pages/emails.', 3),
  ('copywriter', 'seo_optimization', 'Optimisation SEO', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'Les contenus doivent-ils être optimisés SEO ?', 4),
  ('copywriter', 'tone', 'Ton éditorial', 'text', NULL, false, ARRAY['Professionnel', 'Décontracté', 'Expert'], 'Style rédactionnel souhaité.', 5);

-- ----------------------------------------------------------------------------
-- Insert Variables: Community Manager
-- ----------------------------------------------------------------------------

INSERT INTO job_profile_variables (profile_id, key, label, type, options, required_suggestion, examples, help, position) VALUES
  ('community_manager', 'platforms', 'Réseaux sociaux', 'text', NULL, true, ARRAY['Instagram, LinkedIn', 'TikTok, YouTube', 'Facebook, Twitter'], 'Plateformes à gérer.', 1),
  ('community_manager', 'posts_per_week', 'Publications par semaine', 'number', NULL, true, ARRAY['3', '7', '14'], 'Fréquence de publication hebdomadaire.', 2),
  ('community_manager', 'duration_months', 'Durée d''accompagnement', 'number', NULL, true, ARRAY['1', '3', '6'], 'Durée en mois de la mission.', 3),
  ('community_manager', 'content_creation', 'Création de visuels incluse', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'Les visuels sont-ils créés par le CM ?', 4),
  ('community_manager', 'moderation', 'Modération incluse', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'La gestion des commentaires est-elle incluse ?', 5);

-- ----------------------------------------------------------------------------
-- Insert Variables: Monteur vidéo
-- ----------------------------------------------------------------------------

INSERT INTO job_profile_variables (profile_id, key, label, type, options, required_suggestion, examples, help, position) VALUES
  ('video_editor', 'video_type', 'Type de vidéo', 'select', '["Corporate", "Réseaux sociaux", "Publicité", "Motion graphics", "Aftermovie"]', true, ARRAY['Corporate', 'Réseaux sociaux'], 'Nature de la production vidéo.', 1),
  ('video_editor', 'final_duration', 'Durée finale', 'text', NULL, true, ARRAY['30s', '2min', '5min'], 'Durée de la vidéo montée.', 2),
  ('video_editor', 'videos_count', 'Nombre de vidéos', 'number', NULL, true, ARRAY['1', '5', '10'], 'Nombre de vidéos à produire.', 3),
  ('video_editor', 'subtitles', 'Sous-titres inclus', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'Les sous-titres sont-ils ajoutés ?', 4),
  ('video_editor', 'music_licensed', 'Musique libre de droits incluse', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'La musique est-elle fournie/incluse ?', 5);

-- ----------------------------------------------------------------------------
-- Insert Variables: Architecte
-- ----------------------------------------------------------------------------

INSERT INTO job_profile_variables (profile_id, key, label, type, options, required_suggestion, examples, help, position) VALUES
  ('architect', 'project_type', 'Type de projet', 'select', '["Rénovation", "Construction neuve", "Aménagement intérieur", "Décoration", "Extension"]', true, ARRAY['Aménagement intérieur', 'Rénovation'], 'Nature du projet architectural.', 1),
  ('architect', 'surface_m2', 'Surface en m²', 'number', NULL, true, ARRAY['50', '120', '300'], 'Surface concernée par le projet.', 2),
  ('architect', 'mission_phase', 'Phase de mission', 'select', '["Esquisse", "APS/APD", "Projet complet", "Suivi chantier"]', true, ARRAY['Esquisse', 'Projet complet'], 'Étendue de la mission architecturale.', 3),
  ('architect', 'plans_3d', 'Rendus 3D inclus', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'Des visuels 3D sont-ils produits ?', 4),
  ('architect', 'visits_count', 'Nombre de visites site', 'number', NULL, false, ARRAY['2', '5', '10'], 'Visites sur site prévues.', 5);

-- ----------------------------------------------------------------------------
-- Insert Variables: Artisan
-- ----------------------------------------------------------------------------

INSERT INTO job_profile_variables (profile_id, key, label, type, options, required_suggestion, examples, help, position) VALUES
  ('artisan', 'work_type', 'Type de travaux', 'select', '["Plomberie", "Électricité", "Menuiserie", "Peinture", "Maçonnerie", "Multi-corps"]', true, ARRAY['Peinture', 'Électricité'], 'Corps de métier concerné.', 1),
  ('artisan', 'surface_or_quantity', 'Surface / Quantité', 'text', NULL, true, ARRAY['50m²', '3 pièces', '1 salle de bain'], 'Étendue des travaux.', 2),
  ('artisan', 'duration_days', 'Durée estimée (jours)', 'number', NULL, true, ARRAY['2', '5', '15'], 'Nombre de jours de chantier.', 3),
  ('artisan', 'materials_included', 'Fournitures incluses', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'Les matériaux sont-ils compris dans le devis ?', 4),
  ('artisan', 'cleanup_included', 'Nettoyage fin de chantier', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'Le nettoyage est-il inclus ?', 5);

-- ----------------------------------------------------------------------------
-- Insert Variables: Assistant virtuel
-- ----------------------------------------------------------------------------

INSERT INTO job_profile_variables (profile_id, key, label, type, options, required_suggestion, examples, help, position) VALUES
  ('virtual_assistant', 'hours_per_month', 'Heures par mois', 'number', NULL, true, ARRAY['10', '20', '40'], 'Volume horaire mensuel.', 1),
  ('virtual_assistant', 'tasks_scope', 'Périmètre des tâches', 'text', NULL, true, ARRAY['Emails, agenda', 'Facturation, relances', 'Support client'], 'Types de tâches à effectuer.', 2),
  ('virtual_assistant', 'availability', 'Disponibilité', 'select', '["Heures bureau", "Flexible", "Temps réel"]', true, ARRAY['Heures bureau', 'Flexible'], 'Plages de disponibilité attendues.', 3),
  ('virtual_assistant', 'tools_used', 'Outils utilisés', 'text', NULL, false, ARRAY['Google Workspace', 'Notion + Slack', 'Microsoft 365'], 'Outils principaux à maîtriser.', 4),
  ('virtual_assistant', 'confidentiality', 'NDA requis', 'boolean', NULL, false, ARRAY['Oui', 'Non'], 'Un accord de confidentialité est-il nécessaire ?', 5);

-- ----------------------------------------------------------------------------
-- Insert Variables: Autre métier (fallback)
-- ----------------------------------------------------------------------------

INSERT INTO job_profile_variables (profile_id, key, label, type, options, required_suggestion, examples, help, position) VALUES
  ('other', 'service_description', 'Description du service', 'text', NULL, true, ARRAY['Conseil personnalisé', 'Prestation sur mesure'], 'Décrivez brièvement votre prestation.', 1),
  ('other', 'duration_or_volume', 'Durée ou volume', 'text', NULL, true, ARRAY['5 jours', '10 heures', '1 mois'], 'Quantifiez votre intervention.', 2),
  ('other', 'deliverables', 'Livrables', 'text', NULL, true, ARRAY['Rapport final', 'Fichiers sources', 'Formation'], 'Ce que le client recevra.', 3),
  ('other', 'work_mode', 'Mode de travail', 'select', '["Sur site", "À distance", "Hybride"]', false, ARRAY['À distance', 'Hybride'], 'Lieu d''exécution de la prestation.', 4),
  ('other', 'custom_note', 'Note personnalisée', 'text', NULL, false, ARRAY['Conditions particulières', 'Prérequis client'], 'Informations complémentaires.', 5);
