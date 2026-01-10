import { NextResponse, NextRequest } from 'next/server';
import {
  createExpenseCategory,
  listExpenseCategories,
  updateExpenseCategory,
  deleteExpenseCategory,
  initializeDefaultCategories,
} from '@/lib/expenses';

/**
 * GET /api/expenses/categories
 * List all expense categories
 * Query params: init=true to initialize default categories
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Initialize default categories if requested
    if (searchParams.get('init') === 'true') {
      const result = await initializeDefaultCategories();
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ data: result.data });
    }

    const result = await listExpenseCategories();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('GET /api/expenses/categories error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/expenses/categories
 * Create a new expense category
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
    }

    const result = await createExpenseCategory({
      name: body.name,
      color: body.color,
      icon: body.icon,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/expenses/categories error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PATCH /api/expenses/categories
 * Update an expense category (id in body)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const result = await updateExpenseCategory(body.id, {
      name: body.name,
      color: body.color,
      icon: body.icon,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('PATCH /api/expenses/categories error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/expenses/categories
 * Delete an expense category (id in query params)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const result = await deleteExpenseCategory(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/expenses/categories error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
