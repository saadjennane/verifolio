// OCR Document Types
export type OcrDocumentType = 'quote' | 'invoice';

// Extracted data from documents
export interface OcrExtractedData {
  // Supplier info
  supplier_name?: string;
  supplier_email?: string;
  supplier_phone?: string;
  supplier_address?: string;
  supplier_siret?: string;
  supplier_tva_intracom?: string;

  // Document info
  document_number?: string;
  document_date?: string;
  due_date?: string;
  validity_date?: string;

  // Amounts
  total_ht?: number;
  total_tva?: number;
  total_ttc?: number;
  tva_rate?: number;

  // Line items (if detected)
  line_items?: OcrLineItem[];

  // Raw text for reference
  raw_text?: string;

  // Confidence score (0-1)
  confidence?: number;
}

export interface OcrLineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
  tva_rate?: number;
}

// OCR Request/Response
export interface OcrExtractRequest {
  image_url: string;
  document_type: OcrDocumentType;
}

export interface OcrExtractResponse {
  success: boolean;
  data?: OcrExtractedData;
  error?: string;
}

// Supplier matching result
export interface SupplierMatch {
  id: string;
  nom: string;
  email: string | null;
  confidence: number;
}

export interface OcrResultWithSupplier extends OcrExtractedData {
  matched_supplier?: SupplierMatch;
  suggested_supplier?: {
    nom: string;
    email?: string;
    siret?: string;
    is_new: true;
  };
}
