-- Migration: 097_enable_rls_security.sql
-- CRITICAL SECURITY: Re-enable Row Level Security on all user data tables
-- This migration reverses the temporary RLS disabling from migrations 002 and 005
-- and ensures proper data isolation between users.
--
-- This migration safely checks if each table exists before applying policies.

-- Helper function to safely enable RLS on a table
CREATE OR REPLACE FUNCTION _temp_enable_rls_if_exists(table_name text) RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = _temp_enable_rls_if_exists.table_name
  ) THEN
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CORE USER DATA TABLES
-- ============================================================================

-- Companies (user settings)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
    ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "companies_user_isolation" ON companies;
    CREATE POLICY "companies_user_isolation" ON companies FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Clients (customers and suppliers)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clients') THEN
    ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "clients_user_isolation" ON clients;
    CREATE POLICY "clients_user_isolation" ON clients FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Contacts
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
    ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "contacts_user_isolation" ON contacts;
    CREATE POLICY "contacts_user_isolation" ON contacts FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Client-Contact links
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_contacts') THEN
    ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "client_contacts_user_isolation" ON client_contacts;
    CREATE POLICY "client_contacts_user_isolation" ON client_contacts
      FOR ALL USING (
        EXISTS (SELECT 1 FROM clients WHERE clients.id = client_contacts.client_id AND clients.user_id = auth.uid())
      );
  END IF;
END $$;

-- ============================================================================
-- QUOTES AND INVOICES
-- ============================================================================

-- Quotes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes') THEN
    ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "quotes_user_isolation" ON quotes;
    CREATE POLICY "quotes_user_isolation" ON quotes FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Quote line items
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_line_items') THEN
    ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "quote_line_items_user_isolation" ON quote_line_items;
    CREATE POLICY "quote_line_items_user_isolation" ON quote_line_items
      FOR ALL USING (
        EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_line_items.quote_id AND quotes.user_id = auth.uid())
      );
  END IF;
END $$;

-- Invoices
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "invoices_user_isolation" ON invoices;
    CREATE POLICY "invoices_user_isolation" ON invoices FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Invoice line items
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_line_items') THEN
    ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "invoice_line_items_user_isolation" ON invoice_line_items;
    CREATE POLICY "invoice_line_items_user_isolation" ON invoice_line_items
      FOR ALL USING (
        EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_line_items.invoice_id AND invoices.user_id = auth.uid())
      );
  END IF;
END $$;

-- ============================================================================
-- DEALS AND MISSIONS
-- ============================================================================

-- Deals
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deals') THEN
    ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "deals_user_isolation" ON deals;
    CREATE POLICY "deals_user_isolation" ON deals FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Deal contacts
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deal_contacts') THEN
    ALTER TABLE deal_contacts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "deal_contacts_user_isolation" ON deal_contacts;
    CREATE POLICY "deal_contacts_user_isolation" ON deal_contacts
      FOR ALL USING (
        EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_contacts.deal_id AND deals.user_id = auth.uid())
      );
  END IF;
END $$;

-- Deal documents
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deal_documents') THEN
    ALTER TABLE deal_documents ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "deal_documents_user_isolation" ON deal_documents;
    CREATE POLICY "deal_documents_user_isolation" ON deal_documents
      FOR ALL USING (
        EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_documents.deal_id AND deals.user_id = auth.uid())
      );
  END IF;
END $$;

-- Missions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'missions') THEN
    ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "missions_user_isolation" ON missions;
    CREATE POLICY "missions_user_isolation" ON missions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Mission contacts
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mission_contacts') THEN
    ALTER TABLE mission_contacts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "mission_contacts_user_isolation" ON mission_contacts;
    CREATE POLICY "mission_contacts_user_isolation" ON mission_contacts
      FOR ALL USING (
        EXISTS (SELECT 1 FROM missions WHERE missions.id = mission_contacts.mission_id AND missions.user_id = auth.uid())
      );
  END IF;
END $$;

-- Mission documents
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mission_documents') THEN
    ALTER TABLE mission_documents ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "mission_documents_user_isolation" ON mission_documents;
    CREATE POLICY "mission_documents_user_isolation" ON mission_documents
      FOR ALL USING (
        EXISTS (SELECT 1 FROM missions WHERE missions.id = mission_documents.mission_id AND missions.user_id = auth.uid())
      );
  END IF;
END $$;

-- ============================================================================
-- PROPOSALS
-- ============================================================================

-- Proposals
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proposals') THEN
    ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "proposals_user_isolation" ON proposals;
    CREATE POLICY "proposals_user_isolation" ON proposals FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Proposal sections
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proposal_sections') THEN
    ALTER TABLE proposal_sections ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "proposal_sections_user_isolation" ON proposal_sections;
    CREATE POLICY "proposal_sections_user_isolation" ON proposal_sections
      FOR ALL USING (
        EXISTS (SELECT 1 FROM proposals WHERE proposals.id = proposal_sections.proposal_id AND proposals.user_id = auth.uid())
      );
  END IF;
END $$;

-- Proposal pages
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proposal_pages') THEN
    ALTER TABLE proposal_pages ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "proposal_pages_user_isolation" ON proposal_pages;
    CREATE POLICY "proposal_pages_user_isolation" ON proposal_pages
      FOR ALL USING (
        EXISTS (SELECT 1 FROM proposals WHERE proposals.id = proposal_pages.proposal_id AND proposals.user_id = auth.uid())
      );
  END IF;
END $$;

-- Proposal templates
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proposal_templates') THEN
    ALTER TABLE proposal_templates ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "proposal_templates_user_isolation" ON proposal_templates;
    CREATE POLICY "proposal_templates_user_isolation" ON proposal_templates FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Proposal presets
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proposal_presets') THEN
    ALTER TABLE proposal_presets ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "proposal_presets_user_isolation" ON proposal_presets;
    CREATE POLICY "proposal_presets_user_isolation" ON proposal_presets FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- REVIEWS
-- ============================================================================

-- Reviews
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "reviews_user_isolation" ON reviews;
    CREATE POLICY "reviews_user_isolation" ON reviews FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Review requests
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_requests') THEN
    ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "review_requests_user_isolation" ON review_requests;
    CREATE POLICY "review_requests_user_isolation" ON review_requests FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Review templates
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_templates') THEN
    ALTER TABLE review_templates ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "review_templates_user_isolation" ON review_templates;
    CREATE POLICY "review_templates_user_isolation" ON review_templates FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Review request tags
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_request_tags') THEN
    ALTER TABLE review_request_tags ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "review_request_tags_user_isolation" ON review_request_tags;
    CREATE POLICY "review_request_tags_user_isolation" ON review_request_tags
      FOR ALL USING (
        EXISTS (SELECT 1 FROM review_requests WHERE review_requests.id = review_request_tags.review_request_id AND review_requests.user_id = auth.uid())
      );
  END IF;
END $$;

-- ============================================================================
-- TASKS
-- ============================================================================

-- Tasks
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tasks_user_isolation" ON tasks;
    CREATE POLICY "tasks_user_isolation" ON tasks FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Task templates
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "task_templates_user_isolation" ON task_templates;
    CREATE POLICY "task_templates_user_isolation" ON task_templates FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Task template categories
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_template_categories') THEN
    ALTER TABLE task_template_categories ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "task_template_categories_user_isolation" ON task_template_categories;
    CREATE POLICY "task_template_categories_user_isolation" ON task_template_categories FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- DOCUMENTS AND DELIVERY
-- ============================================================================

-- Entity documents
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'entity_documents') THEN
    ALTER TABLE entity_documents ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "entity_documents_user_isolation" ON entity_documents;
    CREATE POLICY "entity_documents_user_isolation" ON entity_documents FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Delivery notes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delivery_notes') THEN
    ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "delivery_notes_user_isolation" ON delivery_notes;
    CREATE POLICY "delivery_notes_user_isolation" ON delivery_notes FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Delivery note items
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delivery_note_items') THEN
    ALTER TABLE delivery_note_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "delivery_note_items_user_isolation" ON delivery_note_items;
    CREATE POLICY "delivery_note_items_user_isolation" ON delivery_note_items
      FOR ALL USING (
        EXISTS (SELECT 1 FROM delivery_notes WHERE delivery_notes.id = delivery_note_items.delivery_note_id AND delivery_notes.user_id = auth.uid())
      );
  END IF;
END $$;

-- Stamped invoices
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stamped_invoices') THEN
    ALTER TABLE stamped_invoices ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "stamped_invoices_user_isolation" ON stamped_invoices;
    CREATE POLICY "stamped_invoices_user_isolation" ON stamped_invoices
      FOR ALL USING (
        EXISTS (SELECT 1 FROM invoices WHERE invoices.id = stamped_invoices.invoice_id AND invoices.user_id = auth.uid())
      );
  END IF;
END $$;

-- ============================================================================
-- BRIEFS
-- ============================================================================

-- Briefs
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'briefs') THEN
    ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "briefs_user_isolation" ON briefs;
    CREATE POLICY "briefs_user_isolation" ON briefs FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Brief questions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'brief_questions') THEN
    ALTER TABLE brief_questions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "brief_questions_user_isolation" ON brief_questions;
    CREATE POLICY "brief_questions_user_isolation" ON brief_questions
      FOR ALL USING (
        EXISTS (SELECT 1 FROM briefs WHERE briefs.id = brief_questions.brief_id AND briefs.user_id = auth.uid())
      );
  END IF;
END $$;

-- Brief responses
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'brief_responses') THEN
    ALTER TABLE brief_responses ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "brief_responses_user_isolation" ON brief_responses;
    CREATE POLICY "brief_responses_user_isolation" ON brief_responses
      FOR ALL USING (
        EXISTS (SELECT 1 FROM briefs WHERE briefs.id = brief_responses.brief_id AND briefs.user_id = auth.uid())
      );
  END IF;
END $$;

-- Brief themes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'brief_themes') THEN
    ALTER TABLE brief_themes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "brief_themes_user_isolation" ON brief_themes;
    CREATE POLICY "brief_themes_user_isolation" ON brief_themes FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- SUPPLIERS AND EXPENSES
-- ============================================================================

-- Supplier invoices
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'supplier_invoices') THEN
    ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "supplier_invoices_user_isolation" ON supplier_invoices;
    CREATE POLICY "supplier_invoices_user_isolation" ON supplier_invoices FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Supplier invoice items
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'supplier_invoice_items') THEN
    ALTER TABLE supplier_invoice_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "supplier_invoice_items_user_isolation" ON supplier_invoice_items;
    CREATE POLICY "supplier_invoice_items_user_isolation" ON supplier_invoice_items
      FOR ALL USING (
        EXISTS (SELECT 1 FROM supplier_invoices WHERE supplier_invoices.id = supplier_invoice_items.supplier_invoice_id AND supplier_invoices.user_id = auth.uid())
      );
  END IF;
END $$;

-- Supplier documents
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'supplier_documents') THEN
    ALTER TABLE supplier_documents ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "supplier_documents_user_isolation" ON supplier_documents;
    CREATE POLICY "supplier_documents_user_isolation" ON supplier_documents FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- PAYMENTS AND TREASURY
-- ============================================================================

-- Payments (client payments)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "payments_user_isolation" ON payments;
    CREATE POLICY "payments_user_isolation" ON payments FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Unassociated payments
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'unassociated_payments') THEN
    ALTER TABLE unassociated_payments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "unassociated_payments_user_isolation" ON unassociated_payments;
    CREATE POLICY "unassociated_payments_user_isolation" ON unassociated_payments FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Subscriptions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
    ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "subscriptions_user_isolation" ON subscriptions;
    CREATE POLICY "subscriptions_user_isolation" ON subscriptions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- SETTINGS AND CUSTOMIZATION
-- ============================================================================

-- Custom fields
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_fields') THEN
    ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "custom_fields_user_isolation" ON custom_fields;
    CREATE POLICY "custom_fields_user_isolation" ON custom_fields FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Custom field values
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_field_values') THEN
    ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "custom_field_values_user_isolation" ON custom_field_values;
    CREATE POLICY "custom_field_values_user_isolation" ON custom_field_values
      FOR ALL USING (
        EXISTS (SELECT 1 FROM custom_fields WHERE custom_fields.id = custom_field_values.custom_field_id AND custom_fields.user_id = auth.uid())
      );
  END IF;
END $$;

-- Tags
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tags') THEN
    ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tags_user_isolation" ON tags;
    CREATE POLICY "tags_user_isolation" ON tags FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Entity tags
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'entity_tags') THEN
    ALTER TABLE entity_tags ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "entity_tags_user_isolation" ON entity_tags;
    CREATE POLICY "entity_tags_user_isolation" ON entity_tags
      FOR ALL USING (
        EXISTS (SELECT 1 FROM tags WHERE tags.id = entity_tags.tag_id AND tags.user_id = auth.uid())
      );
  END IF;
END $$;

-- Badges
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'badges') THEN
    ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "badges_user_isolation" ON badges;
    CREATE POLICY "badges_user_isolation" ON badges FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Entity badges
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'entity_badges') THEN
    ALTER TABLE entity_badges ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "entity_badges_user_isolation" ON entity_badges;
    CREATE POLICY "entity_badges_user_isolation" ON entity_badges
      FOR ALL USING (
        EXISTS (SELECT 1 FROM badges WHERE badges.id = entity_badges.badge_id AND badges.user_id = auth.uid())
      );
  END IF;
END $$;

-- Number sequences
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'number_sequences') THEN
    ALTER TABLE number_sequences ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "number_sequences_user_isolation" ON number_sequences;
    CREATE POLICY "number_sequences_user_isolation" ON number_sequences FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Navigation tabs
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'navigation_tabs') THEN
    ALTER TABLE navigation_tabs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "navigation_tabs_user_isolation" ON navigation_tabs;
    CREATE POLICY "navigation_tabs_user_isolation" ON navigation_tabs FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- AI rules
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_rules') THEN
    ALTER TABLE ai_rules ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ai_rules_user_isolation" ON ai_rules;
    CREATE POLICY "ai_rules_user_isolation" ON ai_rules FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- AI suggestions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_suggestions') THEN
    ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ai_suggestions_user_isolation" ON ai_suggestions;
    CREATE POLICY "ai_suggestions_user_isolation" ON ai_suggestions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- COMMUNICATION AND ACTIVITY
-- ============================================================================

-- Outbound messages
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'outbound_messages') THEN
    ALTER TABLE outbound_messages ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "outbound_messages_user_isolation" ON outbound_messages;
    CREATE POLICY "outbound_messages_user_isolation" ON outbound_messages FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Activity logs
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_logs') THEN
    ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "activity_logs_user_isolation" ON activity_logs;
    CREATE POLICY "activity_logs_user_isolation" ON activity_logs FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Notes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
    ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "notes_user_isolation" ON notes;
    CREATE POLICY "notes_user_isolation" ON notes FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- USER DATA
-- ============================================================================

-- User profiles
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "user_profiles_user_isolation" ON user_profiles;
    CREATE POLICY "user_profiles_user_isolation" ON user_profiles FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- User activities
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_activities') THEN
    ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "user_activities_user_isolation" ON user_activities;
    CREATE POLICY "user_activities_user_isolation" ON user_activities FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Calendar events
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_events') THEN
    ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "calendar_events_user_isolation" ON calendar_events;
    CREATE POLICY "calendar_events_user_isolation" ON calendar_events FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Calendar integrations
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_integrations') THEN
    ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "calendar_integrations_user_isolation" ON calendar_integrations;
    CREATE POLICY "calendar_integrations_user_isolation" ON calendar_integrations FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- TEMPLATE AND STRUCTURE DATA
-- ============================================================================

-- Templates
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'templates') THEN
    ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "templates_user_isolation" ON templates;
    CREATE POLICY "templates_user_isolation" ON templates FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Structure templates
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'structure_templates') THEN
    ALTER TABLE structure_templates ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "structure_templates_user_isolation" ON structure_templates;
    CREATE POLICY "structure_templates_user_isolation" ON structure_templates FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Verifolio profiles (public profiles)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'verifolio_profiles') THEN
    ALTER TABLE verifolio_profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "verifolio_profiles_user_isolation" ON verifolio_profiles;
    CREATE POLICY "verifolio_profiles_user_isolation" ON verifolio_profiles FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Verifolio themes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'verifolio_themes') THEN
    ALTER TABLE verifolio_themes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "verifolio_themes_user_isolation" ON verifolio_themes;
    CREATE POLICY "verifolio_themes_user_isolation" ON verifolio_themes FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- CLEANUP
-- ============================================================================

-- Drop the helper function
DROP FUNCTION IF EXISTS _temp_enable_rls_if_exists(text);

-- ============================================================================
-- NOTE: Some tables may need public read access for public-facing features.
-- If needed, add specific SELECT policies for public access:
--
-- Example for public proposal viewing:
-- CREATE POLICY "proposals_public_view" ON proposals
--   FOR SELECT USING (is_public = true);
--
-- Example for public review viewing:
-- CREATE POLICY "reviews_public_view" ON reviews
--   FOR SELECT USING (published = true);
-- ============================================================================
