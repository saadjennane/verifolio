import { NextResponse, NextRequest } from 'next/server';
import {
  getSupplierQuote,
  updateSupplierQuote,
  deleteSupplierQuote,
  convertQuoteToInvoice,
} from '@/lib/suppliers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/suppliers/quotes/[id]
 * Get a single supplier quote
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await getSupplierQuote(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('GET /api/suppliers/quotes/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PATCH /api/suppliers/quotes/[id]
 * Update a supplier quote
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Handle conversion to invoice
    if (body.convert_to_invoice) {
      const result = await convertQuoteToInvoice(id);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ invoice_id: result.invoiceId });
    }

    // Regular update
    const result = await updateSupplierQuote(id, {
      consultation_id: body.consultation_id,
      supplier_id: body.supplier_id,
      reference: body.reference,
      date_devis: body.date_devis,
      date_validite: body.date_validite,
      total_ht: body.total_ht,
      total_tva: body.total_tva,
      total_ttc: body.total_ttc,
      status: body.status,
      is_selected: body.is_selected,
      vat_enabled: body.vat_enabled,
      notes: body.notes,
      document_url: body.document_url,
      ocr_data: body.ocr_data,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('PATCH /api/suppliers/quotes/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/suppliers/quotes/[id]
 * Soft delete a supplier quote
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await deleteSupplierQuote(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/suppliers/quotes/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
