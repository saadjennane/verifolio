import { NextResponse, NextRequest } from 'next/server';
import { getExpense, updateExpense, deleteExpense } from '@/lib/expenses';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/expenses/[id]
 * Get a single expense
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await getExpense(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('GET /api/expenses/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PATCH /api/expenses/[id]
 * Update an expense
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = await updateExpense(id, {
      supplier_invoice_id: body.supplier_invoice_id,
      supplier_id: body.supplier_id,
      category_id: body.category_id,
      description: body.description,
      date_expense: body.date_expense,
      amount_ht: body.amount_ht,
      amount_tva: body.amount_tva,
      amount_ttc: body.amount_ttc,
      vat_enabled: body.vat_enabled,
      payment_method: body.payment_method,
      receipt_url: body.receipt_url,
      notes: body.notes,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('PATCH /api/expenses/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/expenses/[id]
 * Soft delete an expense
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await deleteExpense(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/expenses/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
