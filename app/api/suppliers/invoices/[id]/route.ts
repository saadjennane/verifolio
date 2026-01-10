import { NextResponse, NextRequest } from 'next/server';
import {
  getSupplierInvoice,
  updateSupplierInvoice,
  deleteSupplierInvoice,
  markSupplierInvoicePaid,
  createExpenseFromInvoice,
} from '@/lib/suppliers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/suppliers/invoices/[id]
 * Get a single supplier invoice
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await getSupplierInvoice(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('GET /api/suppliers/invoices/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PATCH /api/suppliers/invoices/[id]
 * Update a supplier invoice
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Handle mark as paid
    if (body.mark_paid) {
      const result = await markSupplierInvoicePaid(id);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ data: result.data });
    }

    // Handle create expense from invoice
    if (body.create_expense) {
      const result = await createExpenseFromInvoice(id, body.category_id);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ expense_id: result.expenseId });
    }

    // Regular update
    const result = await updateSupplierInvoice(id, {
      supplier_id: body.supplier_id,
      supplier_quote_id: body.supplier_quote_id,
      numero: body.numero,
      date_facture: body.date_facture,
      date_echeance: body.date_echeance,
      total_ht: body.total_ht,
      total_tva: body.total_tva,
      total_ttc: body.total_ttc,
      status: body.status,
      paid_at: body.paid_at,
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
    console.error('PATCH /api/suppliers/invoices/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/suppliers/invoices/[id]
 * Soft delete a supplier invoice
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await deleteSupplierInvoice(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/suppliers/invoices/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
