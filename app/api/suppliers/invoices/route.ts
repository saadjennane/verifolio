import { NextResponse, NextRequest } from 'next/server';
import { createSupplierInvoice, listSupplierInvoices } from '@/lib/suppliers';
import type { ListSupplierInvoicesFilter } from '@/lib/suppliers/types';

/**
 * GET /api/suppliers/invoices
 * List all supplier invoices with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filter: ListSupplierInvoicesFilter = {};

    const supplierId = searchParams.get('supplier_id');
    if (supplierId) filter.supplier_id = supplierId;

    const status = searchParams.get('status');
    if (status && ['pending', 'paid', 'overdue', 'cancelled'].includes(status)) {
      filter.status = status as ListSupplierInvoicesFilter['status'];
    }

    const result = await listSupplierInvoices(filter);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('GET /api/suppliers/invoices error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/suppliers/invoices
 * Create a new supplier invoice
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.supplier_id) {
      return NextResponse.json({ error: 'Fournisseur requis' }, { status: 400 });
    }

    const result = await createSupplierInvoice({
      supplier_id: body.supplier_id,
      supplier_quote_id: body.supplier_quote_id,
      numero: body.numero,
      date_facture: body.date_facture,
      date_echeance: body.date_echeance,
      total_ht: body.total_ht,
      total_tva: body.total_tva,
      total_ttc: body.total_ttc,
      vat_enabled: body.vat_enabled,
      notes: body.notes,
      document_url: body.document_url,
      ocr_data: body.ocr_data,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/suppliers/invoices error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
