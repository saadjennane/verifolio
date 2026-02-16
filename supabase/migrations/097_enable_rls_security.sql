-- Migration: 097_enable_rls_security.sql
-- CRITICAL SECURITY: Re-enable Row Level Security on all user data tables
-- This migration reverses the temporary RLS disabling from migrations 002 and 005
-- and ensures proper data isolation between users.

-- ============================================================================
-- CORE USER DATA TABLES
-- ============================================================================

-- Companies (user settings)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "companies_user_isolation" ON companies;
CREATE POLICY "companies_user_isolation" ON companies
  FOR ALL USING (auth.uid() = user_id);

-- Clients (customers and suppliers)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clients_user_isolation" ON clients;
CREATE POLICY "clients_user_isolation" ON clients
  FOR ALL USING (auth.uid() = user_id);

-- Contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contacts_user_isolation" ON contacts;
CREATE POLICY "contacts_user_isolation" ON contacts
  FOR ALL USING (auth.uid() = user_id);

-- Client-Contact links
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_contacts_user_isolation" ON client_contacts;
CREATE POLICY "client_contacts_user_isolation" ON client_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clients WHERE clients.id = client_contacts.client_id AND clients.user_id = auth.uid()
    )
  );

-- ============================================================================
-- QUOTES AND INVOICES
-- ============================================================================

-- Quotes
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quotes_user_isolation" ON quotes;
CREATE POLICY "quotes_user_isolation" ON quotes
  FOR ALL USING (auth.uid() = user_id);

-- Quote line items
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quote_line_items_user_isolation" ON quote_line_items;
CREATE POLICY "quote_line_items_user_isolation" ON quote_line_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quotes WHERE quotes.id = quote_line_items.quote_id AND quotes.user_id = auth.uid()
    )
  );

-- Invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_user_isolation" ON invoices;
CREATE POLICY "invoices_user_isolation" ON invoices
  FOR ALL USING (auth.uid() = user_id);

-- Invoice line items
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoice_line_items_user_isolation" ON invoice_line_items;
CREATE POLICY "invoice_line_items_user_isolation" ON invoice_line_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM invoices WHERE invoices.id = invoice_line_items.invoice_id AND invoices.user_id = auth.uid()
    )
  );

-- ============================================================================
-- DEALS AND MISSIONS
-- ============================================================================

-- Deals
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deals_user_isolation" ON deals;
CREATE POLICY "deals_user_isolation" ON deals
  FOR ALL USING (auth.uid() = user_id);

-- Deal contacts
ALTER TABLE deal_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deal_contacts_user_isolation" ON deal_contacts;
CREATE POLICY "deal_contacts_user_isolation" ON deal_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM deals WHERE deals.id = deal_contacts.deal_id AND deals.user_id = auth.uid()
    )
  );

-- Deal documents
ALTER TABLE deal_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deal_documents_user_isolation" ON deal_documents;
CREATE POLICY "deal_documents_user_isolation" ON deal_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM deals WHERE deals.id = deal_documents.deal_id AND deals.user_id = auth.uid()
    )
  );

-- Deal tags
ALTER TABLE deal_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deal_tags_user_isolation" ON deal_tags;
CREATE POLICY "deal_tags_user_isolation" ON deal_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM deals WHERE deals.id = deal_tags.deal_id AND deals.user_id = auth.uid()
    )
  );

-- Deal badges
ALTER TABLE deal_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deal_badges_user_isolation" ON deal_badges;
CREATE POLICY "deal_badges_user_isolation" ON deal_badges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM deals WHERE deals.id = deal_badges.deal_id AND deals.user_id = auth.uid()
    )
  );

-- Missions
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "missions_user_isolation" ON missions;
CREATE POLICY "missions_user_isolation" ON missions
  FOR ALL USING (auth.uid() = user_id);

-- Mission contacts
ALTER TABLE mission_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mission_contacts_user_isolation" ON mission_contacts;
CREATE POLICY "mission_contacts_user_isolation" ON mission_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM missions WHERE missions.id = mission_contacts.mission_id AND missions.user_id = auth.uid()
    )
  );

-- Mission invoices
ALTER TABLE mission_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mission_invoices_user_isolation" ON mission_invoices;
CREATE POLICY "mission_invoices_user_isolation" ON mission_invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM missions WHERE missions.id = mission_invoices.mission_id AND missions.user_id = auth.uid()
    )
  );

-- Mission tags
ALTER TABLE mission_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mission_tags_user_isolation" ON mission_tags;
CREATE POLICY "mission_tags_user_isolation" ON mission_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM missions WHERE missions.id = mission_tags.mission_id AND missions.user_id = auth.uid()
    )
  );

-- Mission badges
ALTER TABLE mission_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mission_badges_user_isolation" ON mission_badges;
CREATE POLICY "mission_badges_user_isolation" ON mission_badges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM missions WHERE missions.id = mission_badges.mission_id AND missions.user_id = auth.uid()
    )
  );

-- ============================================================================
-- PROPOSALS
-- ============================================================================

-- Proposals
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "proposals_user_isolation" ON proposals;
CREATE POLICY "proposals_user_isolation" ON proposals
  FOR ALL USING (auth.uid() = user_id);

-- Proposal templates
ALTER TABLE proposal_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "proposal_templates_user_isolation" ON proposal_templates;
CREATE POLICY "proposal_templates_user_isolation" ON proposal_templates
  FOR ALL USING (auth.uid() = user_id);

-- Proposal template sections
ALTER TABLE proposal_template_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "proposal_template_sections_user_isolation" ON proposal_template_sections;
CREATE POLICY "proposal_template_sections_user_isolation" ON proposal_template_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM proposal_templates WHERE proposal_templates.id = proposal_template_sections.template_id AND proposal_templates.user_id = auth.uid()
    )
  );

-- Proposal recipients
ALTER TABLE proposal_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "proposal_recipients_user_isolation" ON proposal_recipients;
CREATE POLICY "proposal_recipients_user_isolation" ON proposal_recipients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM proposals WHERE proposals.id = proposal_recipients.proposal_id AND proposals.user_id = auth.uid()
    )
  );

-- Proposal comments
ALTER TABLE proposal_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "proposal_comments_user_isolation" ON proposal_comments;
CREATE POLICY "proposal_comments_user_isolation" ON proposal_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM proposals WHERE proposals.id = proposal_comments.proposal_id AND proposals.user_id = auth.uid()
    )
  );

-- Proposal pages
ALTER TABLE proposal_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "proposal_pages_user_isolation" ON proposal_pages;
CREATE POLICY "proposal_pages_user_isolation" ON proposal_pages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM proposals WHERE proposals.id = proposal_pages.proposal_id AND proposals.user_id = auth.uid()
    )
  );

-- Proposal page sections
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

-- Proposal blocks
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

-- ============================================================================
-- BRIEFS
-- ============================================================================

-- Brief templates
ALTER TABLE brief_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brief_templates_user_isolation" ON brief_templates;
CREATE POLICY "brief_templates_user_isolation" ON brief_templates
  FOR ALL USING (auth.uid() = user_id);

-- Brief template questions
ALTER TABLE brief_template_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brief_template_questions_user_isolation" ON brief_template_questions;
CREATE POLICY "brief_template_questions_user_isolation" ON brief_template_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM brief_templates WHERE brief_templates.id = brief_template_questions.template_id AND brief_templates.user_id = auth.uid()
    )
  );

-- Briefs
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "briefs_user_isolation" ON briefs;
CREATE POLICY "briefs_user_isolation" ON briefs
  FOR ALL USING (auth.uid() = user_id);

-- Brief questions
ALTER TABLE brief_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brief_questions_user_isolation" ON brief_questions;
CREATE POLICY "brief_questions_user_isolation" ON brief_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM briefs WHERE briefs.id = brief_questions.brief_id AND briefs.user_id = auth.uid()
    )
  );

-- Brief responses (allow public access via token - handled by API)
ALTER TABLE brief_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brief_responses_user_isolation" ON brief_responses;
CREATE POLICY "brief_responses_user_isolation" ON brief_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM briefs WHERE briefs.id = brief_responses.brief_id AND briefs.user_id = auth.uid()
    )
  );

-- ============================================================================
-- REVIEWS
-- ============================================================================

-- Review requests
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "review_requests_user_isolation" ON review_requests;
CREATE POLICY "review_requests_user_isolation" ON review_requests
  FOR ALL USING (auth.uid() = user_id);

-- Review request recipients
ALTER TABLE review_request_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "review_request_recipients_user_isolation" ON review_request_recipients;
CREATE POLICY "review_request_recipients_user_isolation" ON review_request_recipients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM review_requests WHERE review_requests.id = review_request_recipients.request_id AND review_requests.user_id = auth.uid()
    )
  );

-- Reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews_user_isolation" ON reviews;
CREATE POLICY "reviews_user_isolation" ON reviews
  FOR ALL USING (auth.uid() = user_id);

-- Review templates
ALTER TABLE review_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "review_templates_user_isolation" ON review_templates;
CREATE POLICY "review_templates_user_isolation" ON review_templates
  FOR ALL USING (auth.uid() = user_id);

-- Review mission media
ALTER TABLE review_mission_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "review_mission_media_user_isolation" ON review_mission_media;
CREATE POLICY "review_mission_media_user_isolation" ON review_mission_media
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM review_requests WHERE review_requests.id = review_mission_media.review_request_id AND review_requests.user_id = auth.uid()
    )
  );

-- Review display preferences
ALTER TABLE review_display_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "review_display_preferences_user_isolation" ON review_display_preferences;
CREATE POLICY "review_display_preferences_user_isolation" ON review_display_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Review collections
ALTER TABLE review_collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "review_collections_user_isolation" ON review_collections;
CREATE POLICY "review_collections_user_isolation" ON review_collections
  FOR ALL USING (auth.uid() = user_id);

-- Review collection items
ALTER TABLE review_collection_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "review_collection_items_user_isolation" ON review_collection_items;
CREATE POLICY "review_collection_items_user_isolation" ON review_collection_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM review_collections WHERE review_collections.id = review_collection_items.collection_id AND review_collections.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TASKS
-- ============================================================================

-- Tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_user_isolation" ON tasks;
CREATE POLICY "tasks_user_isolation" ON tasks
  FOR ALL USING (auth.uid() = user_id);

-- Task badges
ALTER TABLE task_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_badges_user_isolation" ON task_badges;
CREATE POLICY "task_badges_user_isolation" ON task_badges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks WHERE tasks.id = task_badges.task_id AND tasks.user_id = auth.uid()
    )
  );

-- Task templates
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_templates_user_isolation" ON task_templates;
CREATE POLICY "task_templates_user_isolation" ON task_templates
  FOR ALL USING (auth.uid() = user_id);

-- Task template items
ALTER TABLE task_template_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_template_items_user_isolation" ON task_template_items;
CREATE POLICY "task_template_items_user_isolation" ON task_template_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM task_templates WHERE task_templates.id = task_template_items.template_id AND task_templates.user_id = auth.uid()
    )
  );

-- ============================================================================
-- SUPPLIERS AND EXPENSES
-- ============================================================================

-- Supplier consultations
ALTER TABLE supplier_consultations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "supplier_consultations_user_isolation" ON supplier_consultations;
CREATE POLICY "supplier_consultations_user_isolation" ON supplier_consultations
  FOR ALL USING (auth.uid() = user_id);

-- Supplier quotes
ALTER TABLE supplier_quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "supplier_quotes_user_isolation" ON supplier_quotes;
CREATE POLICY "supplier_quotes_user_isolation" ON supplier_quotes
  FOR ALL USING (auth.uid() = user_id);

-- Supplier invoices
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "supplier_invoices_user_isolation" ON supplier_invoices;
CREATE POLICY "supplier_invoices_user_isolation" ON supplier_invoices
  FOR ALL USING (auth.uid() = user_id);

-- Expense categories
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expense_categories_user_isolation" ON expense_categories;
CREATE POLICY "expense_categories_user_isolation" ON expense_categories
  FOR ALL USING (auth.uid() = user_id);

-- Expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expenses_user_isolation" ON expenses;
CREATE POLICY "expenses_user_isolation" ON expenses
  FOR ALL USING (auth.uid() = user_id);

-- Payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_user_isolation" ON payments;
CREATE POLICY "payments_user_isolation" ON payments
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- DOCUMENTS AND DELIVERY NOTES
-- ============================================================================

-- Documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "documents_user_isolation" ON documents;
CREATE POLICY "documents_user_isolation" ON documents
  FOR ALL USING (auth.uid() = user_id);

-- Delivery notes
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "delivery_notes_user_isolation" ON delivery_notes;
CREATE POLICY "delivery_notes_user_isolation" ON delivery_notes
  FOR ALL USING (auth.uid() = user_id);

-- Delivery note line items
ALTER TABLE delivery_note_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "delivery_note_line_items_user_isolation" ON delivery_note_line_items;
CREATE POLICY "delivery_note_line_items_user_isolation" ON delivery_note_line_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM delivery_notes WHERE delivery_notes.id = delivery_note_line_items.delivery_note_id AND delivery_notes.user_id = auth.uid()
    )
  );

-- Supplier delivery notes
ALTER TABLE supplier_delivery_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "supplier_delivery_notes_user_isolation" ON supplier_delivery_notes;
CREATE POLICY "supplier_delivery_notes_user_isolation" ON supplier_delivery_notes
  FOR ALL USING (auth.uid() = user_id);

-- Purchase orders
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "purchase_orders_user_isolation" ON purchase_orders;
CREATE POLICY "purchase_orders_user_isolation" ON purchase_orders
  FOR ALL USING (auth.uid() = user_id);

-- Purchase order line items
ALTER TABLE purchase_order_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "purchase_order_line_items_user_isolation" ON purchase_order_line_items;
CREATE POLICY "purchase_order_line_items_user_isolation" ON purchase_order_line_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM purchase_orders WHERE purchase_orders.id = purchase_order_line_items.purchase_order_id AND purchase_orders.user_id = auth.uid()
    )
  );

-- ============================================================================
-- SETTINGS AND TEMPLATES
-- ============================================================================

-- Custom fields
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "custom_fields_user_isolation" ON custom_fields;
CREATE POLICY "custom_fields_user_isolation" ON custom_fields
  FOR ALL USING (auth.uid() = user_id);

-- Custom field values
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "custom_field_values_user_isolation" ON custom_field_values;
CREATE POLICY "custom_field_values_user_isolation" ON custom_field_values
  FOR ALL USING (auth.uid() = user_id);

-- Templates
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "templates_user_isolation" ON templates;
CREATE POLICY "templates_user_isolation" ON templates
  FOR ALL USING (auth.uid() = user_id);

-- Template blocks
ALTER TABLE template_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "template_blocks_user_isolation" ON template_blocks;
CREATE POLICY "template_blocks_user_isolation" ON template_blocks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM templates WHERE templates.id = template_blocks.template_id AND templates.user_id = auth.uid()
    )
  );

-- Number sequences
ALTER TABLE number_sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "number_sequences_user_isolation" ON number_sequences;
CREATE POLICY "number_sequences_user_isolation" ON number_sequences
  FOR ALL USING (auth.uid() = user_id);

-- User navigation preferences
ALTER TABLE user_navigation_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_navigation_preferences_user_isolation" ON user_navigation_preferences;
CREATE POLICY "user_navigation_preferences_user_isolation" ON user_navigation_preferences
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- NOTES AND ACTIVITY
-- ============================================================================

-- Notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notes_user_isolation" ON notes;
CREATE POLICY "notes_user_isolation" ON notes
  FOR ALL USING (auth.uid() = user_id);

-- Note links
ALTER TABLE note_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "note_links_user_isolation" ON note_links;
CREATE POLICY "note_links_user_isolation" ON note_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM notes WHERE notes.id = note_links.note_id AND notes.user_id = auth.uid()
    )
  );

-- Activity logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_logs_user_isolation" ON activity_logs;
CREATE POLICY "activity_logs_user_isolation" ON activity_logs
  FOR ALL USING (auth.uid() = user_id);

-- Outbound messages
ALTER TABLE outbound_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "outbound_messages_user_isolation" ON outbound_messages;
CREATE POLICY "outbound_messages_user_isolation" ON outbound_messages
  FOR ALL USING (auth.uid() = user_id);

-- User tag library
ALTER TABLE user_tag_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_tag_library_user_isolation" ON user_tag_library;
CREATE POLICY "user_tag_library_user_isolation" ON user_tag_library
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================

-- Subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions_user_isolation" ON subscriptions;
CREATE POLICY "subscriptions_user_isolation" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
