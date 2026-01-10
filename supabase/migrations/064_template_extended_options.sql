-- Migration 064: Extended template options for document customization
-- Adds all missing template columns referenced in TemplateSettings

-- Client block options
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS template_client_block_label TEXT DEFAULT 'DESTINATAIRE';

-- Doc info block options
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS template_doc_info_date_label TEXT DEFAULT 'Date d''émission',
ADD COLUMN IF NOT EXISTS template_doc_info_due_date_label TEXT DEFAULT 'Date d''échéance',
ADD COLUMN IF NOT EXISTS template_show_doc_info_date BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS template_show_doc_info_due_date BOOLEAN DEFAULT true;

-- Items table column labels
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS template_items_col_description_label TEXT DEFAULT 'DÉSIGNATION',
ADD COLUMN IF NOT EXISTS template_items_col_qty_label TEXT DEFAULT 'QTÉ',
ADD COLUMN IF NOT EXISTS template_items_col_price_label TEXT DEFAULT 'PRIX UNITAIRE',
ADD COLUMN IF NOT EXISTS template_items_col_tva_label TEXT DEFAULT 'TVA',
ADD COLUMN IF NOT EXISTS template_items_col_total_label TEXT DEFAULT 'TOTAL';

-- Items table column visibility
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS template_show_items_col_qty BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS template_show_items_col_price BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS template_show_items_col_tva BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS template_show_items_col_total BOOLEAN DEFAULT true;

-- Totals block labels
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS template_totals_ht_label TEXT DEFAULT 'Total HT',
ADD COLUMN IF NOT EXISTS template_totals_discount_label TEXT DEFAULT 'Remise',
ADD COLUMN IF NOT EXISTS template_totals_tva_label TEXT DEFAULT 'TVA',
ADD COLUMN IF NOT EXISTS template_totals_ttc_label TEXT DEFAULT 'Total TTC',
ADD COLUMN IF NOT EXISTS template_totals_due_label TEXT DEFAULT 'MONTANT TOTAL DÛ';

-- Totals block visibility
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS template_show_totals_discount BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS template_show_totals_tva BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS template_show_totals_in_words BOOLEAN DEFAULT true;

-- Payment block options
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS template_payment_bank_label TEXT DEFAULT 'Coordonnées bancaires',
ADD COLUMN IF NOT EXISTS template_payment_bank_text TEXT,
ADD COLUMN IF NOT EXISTS template_payment_conditions_label TEXT DEFAULT 'Conditions de paiement',
ADD COLUMN IF NOT EXISTS template_payment_notes_label TEXT DEFAULT 'Notes',
ADD COLUMN IF NOT EXISTS template_payment_conditions_text TEXT DEFAULT 'Paiement à 30 jours par virement bancaire',
ADD COLUMN IF NOT EXISTS template_payment_notes_text TEXT;

-- Footer options
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS template_show_footer_identity BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS template_show_footer_legal BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS template_show_footer_contact BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS template_footer_custom_text TEXT;

-- Signature block options
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS template_show_signature_block BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS template_signature_label TEXT DEFAULT 'Cachet et signature';
