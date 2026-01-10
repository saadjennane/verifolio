-- ============================================================================
-- Migration 069: Suppliers & Expenses System
-- ============================================================================
-- Extends clients table to support suppliers
-- Adds supplier consultations, quotes, invoices
-- Adds expenses tracking with categories
-- Adds VAT management

-- ============================================================================
-- 1. Extend clients table to support suppliers and VAT
-- ============================================================================

-- Add is_supplier flag to clients (already has is_client implicitly via existence)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS is_supplier BOOLEAN NOT NULL DEFAULT false;

-- Add VAT enabled flag (default true = TVA applicable)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS vat_enabled BOOLEAN NOT NULL DEFAULT true;

-- Add SIRET and TVA intracom for B2B
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS siret TEXT;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS tva_intracom TEXT;

-- Index for supplier queries
CREATE INDEX IF NOT EXISTS idx_clients_is_supplier
  ON clients(user_id, is_supplier) WHERE deleted_at IS NULL AND is_supplier = true;

-- ============================================================================
-- 2. Supplier Consultations (for comparing quotes)
-- ============================================================================

CREATE TABLE supplier_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_supplier_consultations_user ON supplier_consultations(user_id, created_at DESC);
CREATE INDEX idx_supplier_consultations_status ON supplier_consultations(user_id, status) WHERE deleted_at IS NULL;

ALTER TABLE supplier_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own supplier consultations" ON supplier_consultations
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_supplier_consultations_updated_at
  BEFORE UPDATE ON supplier_consultations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. Supplier Quotes (devis fournisseur)
-- ============================================================================

CREATE TABLE supplier_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  consultation_id UUID REFERENCES supplier_consultations(id) ON DELETE SET NULL,
  supplier_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  reference TEXT,
  date_devis DATE,
  date_validite DATE,

  total_ht DECIMAL(12,2),
  total_tva DECIMAL(12,2),
  total_ttc DECIMAL(12,2),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  is_selected BOOLEAN NOT NULL DEFAULT false,

  vat_enabled BOOLEAN NOT NULL DEFAULT true,

  notes TEXT,
  document_url TEXT,
  ocr_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_supplier_quotes_user ON supplier_quotes(user_id, created_at DESC);
CREATE INDEX idx_supplier_quotes_consultation ON supplier_quotes(consultation_id) WHERE consultation_id IS NOT NULL;
CREATE INDEX idx_supplier_quotes_supplier ON supplier_quotes(supplier_id);

ALTER TABLE supplier_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own supplier quotes" ON supplier_quotes
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_supplier_quotes_updated_at
  BEFORE UPDATE ON supplier_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. Supplier Invoices (factures fournisseur)
-- ============================================================================

CREATE TABLE supplier_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  supplier_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  supplier_quote_id UUID REFERENCES supplier_quotes(id) ON DELETE SET NULL,

  numero TEXT,
  date_facture DATE,
  date_echeance DATE,

  total_ht DECIMAL(12,2),
  total_tva DECIMAL(12,2),
  total_ttc DECIMAL(12,2),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_at TIMESTAMPTZ,

  vat_enabled BOOLEAN NOT NULL DEFAULT true,

  notes TEXT,
  document_url TEXT,
  ocr_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_supplier_invoices_user ON supplier_invoices(user_id, created_at DESC);
CREATE INDEX idx_supplier_invoices_supplier ON supplier_invoices(supplier_id);
CREATE INDEX idx_supplier_invoices_status ON supplier_invoices(user_id, status) WHERE deleted_at IS NULL;

ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own supplier invoices" ON supplier_invoices
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_supplier_invoices_updated_at
  BEFORE UPDATE ON supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Expense Categories
-- ============================================================================

CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  icon TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expense_categories_user ON expense_categories(user_id);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own expense categories" ON expense_categories
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 6. Expenses
-- ============================================================================

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  supplier_invoice_id UUID REFERENCES supplier_invoices(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,

  description TEXT NOT NULL,
  date_expense DATE NOT NULL,

  amount_ht DECIMAL(12,2),
  amount_tva DECIMAL(12,2),
  amount_ttc DECIMAL(12,2) NOT NULL,

  vat_enabled BOOLEAN NOT NULL DEFAULT true,
  payment_method TEXT,
  receipt_url TEXT,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_expenses_user ON expenses(user_id, date_expense DESC);
CREATE INDEX idx_expenses_supplier ON expenses(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX idx_expenses_category ON expenses(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_expenses_supplier_invoice ON expenses(supplier_invoice_id) WHERE supplier_invoice_id IS NOT NULL;

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own expenses" ON expenses
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. Add VAT to existing quotes and invoices tables
-- ============================================================================

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS vat_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS vat_enabled BOOLEAN NOT NULL DEFAULT true;

-- ============================================================================
-- 8. Default expense categories (inserted per user on first access)
-- ============================================================================

-- Note: Default categories will be created in the application layer
-- when a user first accesses the expenses feature

-- ============================================================================
-- 9. Comments
-- ============================================================================

COMMENT ON COLUMN clients.is_supplier IS 'True if this entity is a supplier (can receive quotes/invoices from user)';
COMMENT ON COLUMN clients.vat_enabled IS 'Default VAT behavior for documents. true = VAT applied by default';
COMMENT ON COLUMN clients.siret IS 'SIRET number for French companies';
COMMENT ON COLUMN clients.tva_intracom IS 'Intra-community VAT number for EU B2B';

COMMENT ON TABLE supplier_consultations IS 'Groups supplier quotes for comparison';
COMMENT ON TABLE supplier_quotes IS 'Quotes received from suppliers';
COMMENT ON TABLE supplier_invoices IS 'Invoices received from suppliers';
COMMENT ON TABLE expenses IS 'User expenses, optionally linked to supplier invoices';
COMMENT ON TABLE expense_categories IS 'User-defined expense categories';

COMMENT ON COLUMN quotes.vat_enabled IS 'Override: true = show VAT, false = hide VAT. Copied from client on creation.';
COMMENT ON COLUMN invoices.vat_enabled IS 'Override: true = show VAT, false = hide VAT. Copied from client on creation.';
