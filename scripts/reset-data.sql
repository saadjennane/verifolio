-- Script de reset des données Verifolio
-- Supprime toutes les données utilisateur tout en gardant la structure
-- ATTENTION: Cette action est irréversible!

-- Désactiver les contraintes de clés étrangères temporairement
SET session_replication_role = 'replica';

-- Supprimer les données dans l'ordre inverse des dépendances

-- Verifolio public profiles
TRUNCATE TABLE verifolio_review_selections CASCADE;
TRUNCATE TABLE verifolio_activities CASCADE;
TRUNCATE TABLE verifolio_profiles CASCADE;

-- Reviews
TRUNCATE TABLE review_mission_media CASCADE;
TRUNCATE TABLE review_display_preferences CASCADE;
TRUNCATE TABLE review_collection_items CASCADE;
TRUNCATE TABLE review_collections CASCADE;
TRUNCATE TABLE reviews CASCADE;
TRUNCATE TABLE review_request_recipients CASCADE;
TRUNCATE TABLE review_requests CASCADE;
TRUNCATE TABLE review_templates CASCADE;

-- Briefs
TRUNCATE TABLE brief_responses CASCADE;
TRUNCATE TABLE brief_questions CASCADE;
TRUNCATE TABLE briefs CASCADE;
TRUNCATE TABLE brief_template_questions CASCADE;
TRUNCATE TABLE brief_templates CASCADE;

-- Proposals
TRUNCATE TABLE proposal_comments CASCADE;
TRUNCATE TABLE proposal_recipients CASCADE;
TRUNCATE TABLE proposal_blocks CASCADE;
TRUNCATE TABLE proposal_page_sections CASCADE;
TRUNCATE TABLE proposal_pages CASCADE;
TRUNCATE TABLE proposal_sections CASCADE;
TRUNCATE TABLE proposal_variables CASCADE;
TRUNCATE TABLE proposals CASCADE;
TRUNCATE TABLE proposal_template_sections CASCADE;
TRUNCATE TABLE proposal_templates CASCADE;

-- Documents & Delivery notes
TRUNCATE TABLE delivery_note_line_items CASCADE;
TRUNCATE TABLE delivery_notes CASCADE;
TRUNCATE TABLE documents CASCADE;
TRUNCATE TABLE deal_documents CASCADE;

-- Suppliers & Expenses
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE expense_categories CASCADE;
TRUNCATE TABLE supplier_invoices CASCADE;
TRUNCATE TABLE supplier_quotes CASCADE;
TRUNCATE TABLE supplier_consultations CASCADE;
TRUNCATE TABLE mission_suppliers CASCADE;

-- Missions
TRUNCATE TABLE mission_invoices CASCADE;
TRUNCATE TABLE mission_badges CASCADE;
TRUNCATE TABLE mission_tags CASCADE;
TRUNCATE TABLE mission_contacts CASCADE;
TRUNCATE TABLE missions CASCADE;

-- Deals
TRUNCATE TABLE deal_badges CASCADE;
TRUNCATE TABLE deal_tags CASCADE;
TRUNCATE TABLE deal_contacts CASCADE;
TRUNCATE TABLE deals CASCADE;

-- Invoices
TRUNCATE TABLE invoice_line_items CASCADE;
TRUNCATE TABLE invoices CASCADE;

-- Quotes
TRUNCATE TABLE quote_line_items CASCADE;
TRUNCATE TABLE quotes CASCADE;

-- Tasks
TRUNCATE TABLE task_badges CASCADE;
TRUNCATE TABLE tasks CASCADE;

-- Contacts & Clients
TRUNCATE TABLE client_contacts CASCADE;
TRUNCATE TABLE contacts CASCADE;
TRUNCATE TABLE clients CASCADE;

-- AI & Activity
TRUNCATE TABLE ai_action_logs CASCADE;
TRUNCATE TABLE ai_suggestions CASCADE;
TRUNCATE TABLE ai_rules CASCADE;
TRUNCATE TABLE activity_logs CASCADE;

-- Outbound messages & tracking
TRUNCATE TABLE tracking_events CASCADE;
TRUNCATE TABLE outbound_messages CASCADE;
TRUNCATE TABLE public_links CASCADE;

-- Custom fields
TRUNCATE TABLE custom_field_values CASCADE;
TRUNCATE TABLE custom_fields CASCADE;

-- Badges & Tags
TRUNCATE TABLE badge_definitions CASCADE;
TRUNCATE TABLE badge_types CASCADE;
TRUNCATE TABLE tag_colors CASCADE;
TRUNCATE TABLE user_tag_library CASCADE;

-- Templates & Settings
TRUNCATE TABLE template_blocks CASCADE;
TRUNCATE TABLE templates CASCADE;
TRUNCATE TABLE job_profile_variables CASCADE;
TRUNCATE TABLE job_profiles CASCADE;
TRUNCATE TABLE user_activity_variables CASCADE;
TRUNCATE TABLE user_activities CASCADE;
TRUNCATE TABLE user_navigation_preferences CASCADE;

-- Number sequences (reset counters)
TRUNCATE TABLE number_sequences CASCADE;

-- User profiles & Companies
TRUNCATE TABLE user_profiles CASCADE;
TRUNCATE TABLE companies CASCADE;

-- Réactiver les contraintes
SET session_replication_role = 'origin';

-- Message de confirmation
SELECT 'Toutes les données ont été supprimées avec succès!' as message;
