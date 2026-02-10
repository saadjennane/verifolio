-- ============================================================================
-- Migration 087: Supplier Documents Extension
-- ============================================================================
-- Adds supplier delivery notes (received) and purchase orders (sent)
-- Removes unique constraint on delivery_notes to allow multiple BLs per mission

-- ============================================================================
-- 1. Remove unique constraint on delivery_notes.mission_id
-- ============================================================================

-- Drop the constraint if it exists (allows multiple BLs per mission)
ALTER TABLE delivery_notes DROP CONSTRAINT IF EXISTS unique_delivery_note_per_mission;

-- Add deleted_at for soft delete consistency
ALTER TABLE delivery_notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- 2. Purchase Orders (sent to suppliers) - Created first as referenced by delivery_notes
-- ============================================================================

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Optional link to supplier quote
  supplier_quote_id UUID REFERENCES supplier_quotes(id) ON DELETE SET NULL,

  numero TEXT NOT NULL,
  date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
  date_livraison_prevue DATE,

  -- Amounts
  total_ht DECIMAL(12,2),
  total_tva DECIMAL(12,2),
  total_ttc DECIMAL(12,2),
  vat_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Status
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'envoye', 'confirme', 'livre', 'annule')),

  notes TEXT,
  pdf_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_purchase_orders_user ON purchase_orders(user_id, created_at DESC);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(user_id, status) WHERE deleted_at IS NULL;

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own purchase orders" ON purchase_orders
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. Purchase Order Line Items
-- ============================================================================

CREATE TABLE purchase_order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,

  description TEXT NOT NULL,
  quantite DECIMAL(10,2) NOT NULL DEFAULT 1,
  unite TEXT DEFAULT 'unité',
  prix_unitaire_ht DECIMAL(12,2),
  taux_tva DECIMAL(5,2) DEFAULT 20.00,

  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_order_line_items_po ON purchase_order_line_items(purchase_order_id);

ALTER TABLE purchase_order_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchase_order_line_items_user_policy ON purchase_order_line_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_line_items.purchase_order_id
      AND purchase_orders.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. Supplier Delivery Notes (received from suppliers)
-- ============================================================================

CREATE TABLE supplier_delivery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Optional link to supplier quote or purchase order
  supplier_quote_id UUID REFERENCES supplier_quotes(id) ON DELETE SET NULL,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,

  reference TEXT,
  date_reception DATE NOT NULL DEFAULT CURRENT_DATE,

  notes TEXT,
  document_url TEXT,  -- Uploaded file

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_supplier_delivery_notes_user ON supplier_delivery_notes(user_id, created_at DESC);
CREATE INDEX idx_supplier_delivery_notes_supplier ON supplier_delivery_notes(supplier_id);

ALTER TABLE supplier_delivery_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own supplier delivery notes" ON supplier_delivery_notes
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_supplier_delivery_notes_updated_at
  BEFORE UPDATE ON supplier_delivery_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Add PO number sequence function
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_po_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_year TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');

  SELECT COUNT(*) + 1 INTO v_count
  FROM purchase_orders
  WHERE user_id = p_user_id
    AND date_emission >= date_trunc('year', now());

  RETURN 'PO-' || v_year || '-' || lpad(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Add BL number sequence function for delivery_notes
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_bl_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_year TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');

  SELECT COUNT(*) + 1 INTO v_count
  FROM delivery_notes
  WHERE user_id = p_user_id
    AND date_emission >= date_trunc('year', now());

  RETURN 'BL-' || v_year || '-' || lpad(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Comments
-- ============================================================================

COMMENT ON TABLE supplier_delivery_notes IS 'Delivery notes received from suppliers (attachments)';
COMMENT ON TABLE purchase_orders IS 'Purchase orders sent to suppliers';
COMMENT ON COLUMN supplier_delivery_notes.document_url IS 'URL of uploaded document (PDF/image)';
COMMENT ON COLUMN purchase_orders.status IS 'brouillon=draft, envoye=sent, confirme=confirmed by supplier, livre=delivered, annule=cancelled';
