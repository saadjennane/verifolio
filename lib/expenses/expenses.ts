import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity';
import type {
  Expense,
  ExpenseListItem,
  ExpenseWithRelations,
  CreateExpensePayload,
  UpdateExpensePayload,
  ListExpensesFilter,
} from './types';

/**
 * Create a new expense
 */
export async function createExpense(
  payload: CreateExpensePayload
): Promise<{ success: true; data: Expense } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Get supplier's default VAT setting if supplier provided and vat_enabled not specified
    let vatEnabled = payload.vat_enabled;
    if (vatEnabled === undefined && payload.supplier_id) {
      const { data: supplier } = await supabase
        .from('clients')
        .select('vat_enabled')
        .eq('id', payload.supplier_id)
        .single();
      vatEnabled = supplier?.vat_enabled ?? true;
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        user_id: user.id,
        supplier_invoice_id: payload.supplier_invoice_id || null,
        supplier_id: payload.supplier_id || null,
        category_id: payload.category_id || null,
        description: payload.description,
        date_expense: payload.date_expense,
        amount_ht: payload.amount_ht || null,
        amount_tva: payload.amount_tva || null,
        amount_ttc: payload.amount_ttc,
        vat_enabled: vatEnabled ?? true,
        payment_method: payload.payment_method || null,
        receipt_url: payload.receipt_url || null,
        notes: payload.notes || null,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating expense:', error);
      return { success: false, error: error?.message || 'Erreur lors de la création' };
    }

    await logActivity({
      action: 'create',
      entity_type: 'expense',
      entity_id: data.id,
      entity_title: data.description,
    });

    return { success: true, data };
  } catch (error) {
    console.error('createExpense error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * List expenses with optional filters
 */
export async function listExpenses(
  filter?: ListExpensesFilter
): Promise<{ success: true; data: ExpenseListItem[] } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    let query = supabase
      .from('expenses')
      .select(`
        *,
        supplier:clients(id, nom),
        category:expense_categories(id, name, color)
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('date_expense', { ascending: false });

    if (filter?.supplier_id) {
      query = query.eq('supplier_id', filter.supplier_id);
    }

    if (filter?.category_id) {
      query = query.eq('category_id', filter.category_id);
    }

    if (filter?.date_from) {
      query = query.gte('date_expense', filter.date_from);
    }

    if (filter?.date_to) {
      query = query.lte('date_expense', filter.date_to);
    }

    if (filter?.payment_method) {
      query = query.eq('payment_method', filter.payment_method);
    }

    const { data, error } = await query;

    if (error) {
      console.error('listExpenses error:', error);
      return { success: false, error: 'Erreur lors de la récupération' };
    }

    return { success: true, data: data as ExpenseListItem[] };
  } catch (error) {
    console.error('listExpenses error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Get a single expense by ID
 */
export async function getExpense(
  id: string
): Promise<{ success: true; data: ExpenseWithRelations } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        supplier:clients(id, nom, email),
        supplier_invoice:supplier_invoices(id, numero, total_ttc),
        category:expense_categories(id, name, color, icon)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return { success: false, error: 'Dépense introuvable' };
    }

    return { success: true, data: data as ExpenseWithRelations };
  } catch (error) {
    console.error('getExpense error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Update an expense
 */
export async function updateExpense(
  id: string,
  payload: UpdateExpensePayload
): Promise<{ success: true; data: Expense } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('expenses')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: 'Erreur lors de la mise à jour' };
    }

    await logActivity({
      action: 'update',
      entity_type: 'expense',
      entity_id: data.id,
      entity_title: data.description,
    });

    return { success: true, data };
  } catch (error) {
    console.error('updateExpense error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Soft delete an expense
 */
export async function deleteExpense(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Get description for activity log
    const { data: expense } = await supabase
      .from('expenses')
      .select('description')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    const { error } = await supabase
      .from('expenses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (error) {
      return { success: false, error: 'Erreur lors de la suppression' };
    }

    if (expense) {
      await logActivity({
        action: 'delete',
        entity_type: 'expense',
        entity_id: id,
        entity_title: expense.description,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('deleteExpense error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Get expense statistics for a date range
 */
export async function getExpenseStats(
  dateFrom?: string,
  dateTo?: string
): Promise<
  | {
      success: true;
      data: {
        total: number;
        count: number;
        byCategory: { category: string; color: string; total: number; count: number }[];
        byMonth: { month: string; total: number; count: number }[];
      };
    }
  | { success: false; error: string }
> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    let query = supabase
      .from('expenses')
      .select(`
        amount_ttc,
        date_expense,
        category:expense_categories(name, color)
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (dateFrom) {
      query = query.gte('date_expense', dateFrom);
    }

    if (dateTo) {
      query = query.lte('date_expense', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: 'Erreur lors de la récupération' };
    }

    // Calculate stats
    const total = data?.reduce((sum, e) => sum + (e.amount_ttc || 0), 0) || 0;
    const count = data?.length || 0;

    // Group by category
    const categoryMap = new Map<string, { color: string; total: number; count: number }>();
    data?.forEach((e) => {
      const cat = Array.isArray(e.category) ? e.category[0] : e.category;
      const catName = cat?.name || 'Sans catégorie';
      const catColor = cat?.color || '#6B7280';
      const existing = categoryMap.get(catName) || { color: catColor, total: 0, count: 0 };
      existing.total += e.amount_ttc || 0;
      existing.count += 1;
      categoryMap.set(catName, existing);
    });

    const byCategory = Array.from(categoryMap.entries())
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.total - a.total);

    // Group by month
    const monthMap = new Map<string, { total: number; count: number }>();
    data?.forEach((e) => {
      const month = e.date_expense?.substring(0, 7) || 'unknown';
      const existing = monthMap.get(month) || { total: 0, count: 0 };
      existing.total += e.amount_ttc || 0;
      existing.count += 1;
      monthMap.set(month, existing);
    });

    const byMonth = Array.from(monthMap.entries())
      .map(([month, stats]) => ({ month, ...stats }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      success: true,
      data: { total, count, byCategory, byMonth },
    };
  } catch (error) {
    console.error('getExpenseStats error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}
