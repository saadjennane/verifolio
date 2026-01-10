import { NextResponse, NextRequest } from 'next/server';
import { createExpense, listExpenses, getExpenseStats } from '@/lib/expenses';
import type { ListExpensesFilter } from '@/lib/expenses/types';

/**
 * GET /api/expenses
 * List all expenses with optional filters
 * Query params: supplier_id, category_id, date_from, date_to, payment_method, stats
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Handle stats request
    if (searchParams.get('stats') === 'true') {
      const dateFrom = searchParams.get('date_from') || undefined;
      const dateTo = searchParams.get('date_to') || undefined;
      const result = await getExpenseStats(dateFrom, dateTo);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ data: result.data });
    }

    // Regular list
    const filter: ListExpensesFilter = {};

    const supplierId = searchParams.get('supplier_id');
    if (supplierId) filter.supplier_id = supplierId;

    const categoryId = searchParams.get('category_id');
    if (categoryId) filter.category_id = categoryId;

    const dateFrom = searchParams.get('date_from');
    if (dateFrom) filter.date_from = dateFrom;

    const dateTo = searchParams.get('date_to');
    if (dateTo) filter.date_to = dateTo;

    const paymentMethod = searchParams.get('payment_method');
    if (paymentMethod) filter.payment_method = paymentMethod;

    const result = await listExpenses(filter);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('GET /api/expenses error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/expenses
 * Create a new expense
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.description) {
      return NextResponse.json({ error: 'Description requise' }, { status: 400 });
    }

    if (!body.date_expense) {
      return NextResponse.json({ error: 'Date requise' }, { status: 400 });
    }

    if (body.amount_ttc === undefined || body.amount_ttc === null) {
      return NextResponse.json({ error: 'Montant TTC requis' }, { status: 400 });
    }

    const result = await createExpense({
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

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/expenses error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
