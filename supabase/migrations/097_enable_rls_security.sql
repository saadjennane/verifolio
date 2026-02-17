-- Migration: 097_enable_rls_security.sql
-- CRITICAL SECURITY: Re-enable Row Level Security on all user data tables
-- This migration reverses the temporary RLS disabling from migrations 002 and 005
-- and ensures proper data isolation between users.
--
-- This migration safely checks if each table exists before applying policies.

-- ============================================================================
-- CORE USER DATA TABLES (with direct user_id column)
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

-- Quote line items (join to quotes)
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

-- Invoice line items (join to invoices)
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
-- DEALS
-- ============================================================================

-- Deals
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deals') THEN
    ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "deals_user_isolation" ON deals;
    CREATE POLICY "deals_user_isolation" ON deals FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Deal contacts (join to deals)
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

-- Deal documents (join to deals)
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

-- Deal badges (join to deals)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deal_badges') THEN
    ALTER TABLE deal_badges ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "deal_badges_user_isolation" ON deal_badges;
    CREATE POLICY "deal_badges_user_isolation" ON deal_badges
      FOR ALL USING (
        EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_badges.deal_id AND deals.user_id = auth.uid())
      );
  END IF;
END $$;

-- Deal tags (join to deals)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deal_tags') THEN
    ALTER TABLE deal_tags ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "deal_tags_user_isolation" ON deal_tags;
    CREATE POLICY "deal_tags_user_isolation" ON deal_tags
      FOR ALL USING (
        EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_tags.deal_id AND deals.user_id = auth.uid())
      );
  END IF;
END $$;

-- ============================================================================
-- MISSIONS
-- ============================================================================

-- Missions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'missions') THEN
    ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "missions_user_isolation" ON missions;
    CREATE POLICY "missions_user_isolation" ON missions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Mission contacts (join to missions)
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

-- Mission invoices (join to missions)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mission_invoices') THEN
    ALTER TABLE mission_invoices ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "mission_invoices_user_isolation" ON mission_invoices;
    CREATE POLICY "mission_invoices_user_isolation" ON mission_invoices
      FOR ALL USING (
        EXISTS (SELECT 1 FROM missions WHERE missions.id = mission_invoices.mission_id AND missions.user_id = auth.uid())
      );
  END IF;
END $$;

-- Mission badges (join to missions)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mission_badges') THEN
    ALTER TABLE mission_badges ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "mission_badges_user_isolation" ON mission_badges;
    CREATE POLICY "mission_badges_user_isolation" ON mission_badges
      FOR ALL USING (
        EXISTS (SELECT 1 FROM missions WHERE missions.id = mission_badges.mission_id AND missions.user_id = auth.uid())
      );
  END IF;
END $$;

-- Mission tags (join to missions)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mission_tags') THEN
    ALTER TABLE mission_tags ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "mission_tags_user_isolation" ON mission_tags;
    CREATE POLICY "mission_tags_user_isolation" ON mission_tags
      FOR ALL USING (
        EXISTS (SELECT 1 FROM missions WHERE missions.id = mission_tags.mission_id AND missions.user_id = auth.uid())
      );
  END IF;
END $$;

-- Mission suppliers
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mission_suppliers') THEN
    ALTER TABLE mission_suppliers ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "mission_suppliers_user_isolation" ON mission_suppliers;
    CREATE POLICY "mission_suppliers_user_isolation" ON mission_suppliers FOR ALL USING (auth.uid() = user_id);
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

-- Proposal pages (join to proposals)
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

-- Proposal blocks (join to proposal_pages -> proposals)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proposal_blocks') THEN
    ALTER TABLE proposal_blocks ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "proposal_blocks_user_isolation" ON proposal_blocks;
    CREATE POLICY "proposal_blocks_user_isolation" ON proposal_blocks
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM proposal_pages pp
          JOIN proposals p ON p.id = pp.proposal_id
          WHERE pp.id = proposal_blocks.page_id AND p.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Proposal comments (join to proposals)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proposal_comments') THEN
    ALTER TABLE proposal_comments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "proposal_comments_user_isolation" ON proposal_comments;
    CREATE POLICY "proposal_comments_user_isolation" ON proposal_comments
      FOR ALL USING (
        EXISTS (SELECT 1 FROM proposals WHERE proposals.id = proposal_comments.proposal_id AND proposals.user_id = auth.uid())
      );
  END IF;
END $$;

-- Proposal recipients (join to proposals)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proposal_recipients') THEN
    ALTER TABLE proposal_recipients ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "proposal_recipients_user_isolation" ON proposal_recipients;
    CREATE POLICY "proposal_recipients_user_isolation" ON proposal_recipients
      FOR ALL USING (
        EXISTS (SELECT 1 FROM proposals WHERE proposals.id = proposal_recipients.proposal_id AND proposals.user_id = auth.uid())
      );
  END IF;
END $$;

-- Proposal page sections (join to proposal_pages -> proposals)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proposal_page_sections') THEN
    ALTER TABLE proposal_page_sections ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "proposal_page_sections_user_isolation" ON proposal_page_sections;
    CREATE POLICY "proposal_page_sections_user_isolation" ON proposal_page_sections
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM proposal_pages pp
          JOIN proposals p ON p.id = pp.proposal_id
          WHERE pp.id = proposal_page_sections.page_id AND p.user_id = auth.uid()
        )
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

-- Proposal template sections (join to proposal_templates)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proposal_template_sections') THEN
    ALTER TABLE proposal_template_sections ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "proposal_template_sections_user_isolation" ON proposal_template_sections;
    CREATE POLICY "proposal_template_sections_user_isolation" ON proposal_template_sections
      FOR ALL USING (
        EXISTS (SELECT 1 FROM proposal_templates WHERE proposal_templates.id = proposal_template_sections.template_id AND proposal_templates.user_id = auth.uid())
      );
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

-- Review request recipients (join to review_requests)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_request_recipients') THEN
    ALTER TABLE review_request_recipients ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "review_request_recipients_user_isolation" ON review_request_recipients;
    CREATE POLICY "review_request_recipients_user_isolation" ON review_request_recipients
      FOR ALL USING (
        EXISTS (SELECT 1 FROM review_requests WHERE review_requests.id = review_request_recipients.review_request_id AND review_requests.user_id = auth.uid())
      );
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

-- Review collections
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_collections') THEN
    ALTER TABLE review_collections ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "review_collections_user_isolation" ON review_collections;
    CREATE POLICY "review_collections_user_isolation" ON review_collections FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Review collection items (join to review_collections)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_collection_items') THEN
    ALTER TABLE review_collection_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "review_collection_items_user_isolation" ON review_collection_items;
    CREATE POLICY "review_collection_items_user_isolation" ON review_collection_items
      FOR ALL USING (
        EXISTS (SELECT 1 FROM review_collections WHERE review_collections.id = review_collection_items.collection_id AND review_collections.user_id = auth.uid())
      );
  END IF;
END $$;

-- Review mission media
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_mission_media') THEN
    ALTER TABLE review_mission_media ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "review_mission_media_user_isolation" ON review_mission_media;
    CREATE POLICY "review_mission_media_user_isolation" ON review_mission_media FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Review display preferences
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_display_preferences') THEN
    ALTER TABLE review_display_preferences ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "review_display_preferences_user_isolation" ON review_display_preferences;
    CREATE POLICY "review_display_preferences_user_isolation" ON review_display_preferences FOR ALL USING (auth.uid() = user_id);
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

-- Task badges (join to tasks)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_badges') THEN
    ALTER TABLE task_badges ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "task_badges_user_isolation" ON task_badges;
    CREATE POLICY "task_badges_user_isolation" ON task_badges
      FOR ALL USING (
        EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_badges.task_id AND tasks.user_id = auth.uid())
      );
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

-- Task template items
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_template_items') THEN
    ALTER TABLE task_template_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "task_template_items_user_isolation" ON task_template_items;
    CREATE POLICY "task_template_items_user_isolation" ON task_template_items FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- DOCUMENTS AND DELIVERY
-- ============================================================================

-- Documents
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "documents_user_isolation" ON documents;
    CREATE POLICY "documents_user_isolation" ON documents FOR ALL USING (auth.uid() = user_id);
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

-- Delivery note line items (join to delivery_notes)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delivery_note_line_items') THEN
    ALTER TABLE delivery_note_line_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "delivery_note_line_items_user_isolation" ON delivery_note_line_items;
    CREATE POLICY "delivery_note_line_items_user_isolation" ON delivery_note_line_items
      FOR ALL USING (
        EXISTS (SELECT 1 FROM delivery_notes WHERE delivery_notes.id = delivery_note_line_items.delivery_note_id AND delivery_notes.user_id = auth.uid())
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

-- Brief questions (join to briefs)
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

-- Brief responses (join to briefs)
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

-- Brief templates
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'brief_templates') THEN
    ALTER TABLE brief_templates ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "brief_templates_user_isolation" ON brief_templates;
    CREATE POLICY "brief_templates_user_isolation" ON brief_templates FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Brief template questions (join to brief_templates)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'brief_template_questions') THEN
    ALTER TABLE brief_template_questions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "brief_template_questions_user_isolation" ON brief_template_questions;
    CREATE POLICY "brief_template_questions_user_isolation" ON brief_template_questions
      FOR ALL USING (
        EXISTS (SELECT 1 FROM brief_templates WHERE brief_templates.id = brief_template_questions.brief_template_id AND brief_templates.user_id = auth.uid())
      );
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

-- Supplier quotes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'supplier_quotes') THEN
    ALTER TABLE supplier_quotes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "supplier_quotes_user_isolation" ON supplier_quotes;
    CREATE POLICY "supplier_quotes_user_isolation" ON supplier_quotes FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Supplier delivery notes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'supplier_delivery_notes') THEN
    ALTER TABLE supplier_delivery_notes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "supplier_delivery_notes_user_isolation" ON supplier_delivery_notes;
    CREATE POLICY "supplier_delivery_notes_user_isolation" ON supplier_delivery_notes FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Supplier consultations
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'supplier_consultations') THEN
    ALTER TABLE supplier_consultations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "supplier_consultations_user_isolation" ON supplier_consultations;
    CREATE POLICY "supplier_consultations_user_isolation" ON supplier_consultations FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Purchase orders
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_orders') THEN
    ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "purchase_orders_user_isolation" ON purchase_orders;
    CREATE POLICY "purchase_orders_user_isolation" ON purchase_orders FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Purchase order line items (join to purchase_orders)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_order_line_items') THEN
    ALTER TABLE purchase_order_line_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "purchase_order_line_items_user_isolation" ON purchase_order_line_items;
    CREATE POLICY "purchase_order_line_items_user_isolation" ON purchase_order_line_items
      FOR ALL USING (
        EXISTS (SELECT 1 FROM purchase_orders WHERE purchase_orders.id = purchase_order_line_items.purchase_order_id AND purchase_orders.user_id = auth.uid())
      );
  END IF;
END $$;

-- Expenses
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
    ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "expenses_user_isolation" ON expenses;
    CREATE POLICY "expenses_user_isolation" ON expenses FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Expense categories
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expense_categories') THEN
    ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "expense_categories_user_isolation" ON expense_categories;
    CREATE POLICY "expense_categories_user_isolation" ON expense_categories FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- PAYMENTS AND SUBSCRIPTIONS
-- ============================================================================

-- Payments (client payments)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "payments_user_isolation" ON payments;
    CREATE POLICY "payments_user_isolation" ON payments FOR ALL USING (auth.uid() = user_id);
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

-- Note links (join to notes)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'note_links') THEN
    ALTER TABLE note_links ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "note_links_user_isolation" ON note_links;
    CREATE POLICY "note_links_user_isolation" ON note_links
      FOR ALL USING (
        EXISTS (SELECT 1 FROM notes WHERE notes.id = note_links.note_id AND notes.user_id = auth.uid())
      );
  END IF;
END $$;

-- ============================================================================
-- USER SETTINGS AND PREFERENCES
-- ============================================================================

-- User activities
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_activities') THEN
    ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "user_activities_user_isolation" ON user_activities;
    CREATE POLICY "user_activities_user_isolation" ON user_activities FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- User activity variables
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_activity_variables') THEN
    ALTER TABLE user_activity_variables ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "user_activity_variables_user_isolation" ON user_activity_variables;
    CREATE POLICY "user_activity_variables_user_isolation" ON user_activity_variables FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- User navigation preferences
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_navigation_preferences') THEN
    ALTER TABLE user_navigation_preferences ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "user_navigation_preferences_user_isolation" ON user_navigation_preferences;
    CREATE POLICY "user_navigation_preferences_user_isolation" ON user_navigation_preferences FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- User tag library
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_tag_library') THEN
    ALTER TABLE user_tag_library ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "user_tag_library_user_isolation" ON user_tag_library;
    CREATE POLICY "user_tag_library_user_isolation" ON user_tag_library FOR ALL USING (auth.uid() = user_id);
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

-- AI action logs
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_action_logs') THEN
    ALTER TABLE ai_action_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ai_action_logs_user_isolation" ON ai_action_logs;
    CREATE POLICY "ai_action_logs_user_isolation" ON ai_action_logs FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- CALENDAR
-- ============================================================================

-- Calendar event links
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_event_links') THEN
    ALTER TABLE calendar_event_links ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "calendar_event_links_user_isolation" ON calendar_event_links;
    CREATE POLICY "calendar_event_links_user_isolation" ON calendar_event_links FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Google calendar tokens
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'google_calendar_tokens') THEN
    ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "google_calendar_tokens_user_isolation" ON google_calendar_tokens;
    CREATE POLICY "google_calendar_tokens_user_isolation" ON google_calendar_tokens FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- TEMPLATE AND STRUCTURE DATA
-- ============================================================================

-- Structure templates
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'structure_templates') THEN
    ALTER TABLE structure_templates ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "structure_templates_user_isolation" ON structure_templates;
    CREATE POLICY "structure_templates_user_isolation" ON structure_templates FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Structure template pages (join to structure_templates)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'structure_template_pages') THEN
    ALTER TABLE structure_template_pages ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "structure_template_pages_user_isolation" ON structure_template_pages;
    CREATE POLICY "structure_template_pages_user_isolation" ON structure_template_pages
      FOR ALL USING (
        EXISTS (SELECT 1 FROM structure_templates WHERE structure_templates.id = structure_template_pages.template_id AND structure_templates.user_id = auth.uid())
      );
  END IF;
END $$;

-- ============================================================================
-- VERIFOLIO PUBLIC PROFILES
-- ============================================================================

-- Verifolio profiles
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'verifolio_profiles') THEN
    ALTER TABLE verifolio_profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "verifolio_profiles_user_isolation" ON verifolio_profiles;
    CREATE POLICY "verifolio_profiles_user_isolation" ON verifolio_profiles FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Verifolio activities
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'verifolio_activities') THEN
    ALTER TABLE verifolio_activities ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "verifolio_activities_user_isolation" ON verifolio_activities;
    CREATE POLICY "verifolio_activities_user_isolation" ON verifolio_activities FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- NOTE: badge_definitions and job_profiles are shared/seed tables without user_id
-- They contain system-wide data and don't need RLS user isolation
-- ============================================================================
