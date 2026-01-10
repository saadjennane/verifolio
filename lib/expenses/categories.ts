import { createClient } from '@/lib/supabase/server';
import type {
  ExpenseCategory,
  CreateExpenseCategoryPayload,
  UpdateExpenseCategoryPayload,
} from './types';
import { DEFAULT_EXPENSE_CATEGORIES } from './types';

/**
 * Create a new expense category
 */
export async function createExpenseCategory(
  payload: CreateExpenseCategoryPayload
): Promise<{ success: true; data: ExpenseCategory } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('expense_categories')
      .insert({
        user_id: user.id,
        name: payload.name,
        color: payload.color || '#6B7280',
        icon: payload.icon || null,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating expense category:', error);
      return { success: false, error: error?.message || 'Erreur lors de la création' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('createExpenseCategory error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * List all expense categories for the user
 */
export async function listExpenseCategories(): Promise<
  { success: true; data: ExpenseCategory[] } | { success: false; error: string }
> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      console.error('listExpenseCategories error:', error);
      return { success: false, error: 'Erreur lors de la récupération' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('listExpenseCategories error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Update an expense category
 */
export async function updateExpenseCategory(
  id: string,
  payload: UpdateExpenseCategoryPayload
): Promise<{ success: true; data: ExpenseCategory } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('expense_categories')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: 'Erreur lors de la mise à jour' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('updateExpenseCategory error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Delete an expense category
 */
export async function deleteExpenseCategory(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Unlink expenses from this category first
    await supabase
      .from('expenses')
      .update({ category_id: null })
      .eq('category_id', id)
      .eq('user_id', user.id);

    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: 'Erreur lors de la suppression' };
    }

    return { success: true };
  } catch (error) {
    console.error('deleteExpenseCategory error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Initialize default expense categories for a new user
 */
export async function initializeDefaultCategories(): Promise<
  { success: true; data: ExpenseCategory[] } | { success: false; error: string }
> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Check if user already has categories
    const { data: existing } = await supabase
      .from('expense_categories')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      // User already has categories, return them
      const result = await listExpenseCategories();
      return result;
    }

    // Create default categories
    const categoriesToInsert = DEFAULT_EXPENSE_CATEGORIES.map((cat) => ({
      user_id: user.id,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
    }));

    const { data, error } = await supabase
      .from('expense_categories')
      .insert(categoriesToInsert)
      .select();

    if (error) {
      console.error('Error initializing default categories:', error);
      return { success: false, error: 'Erreur lors de l\'initialisation' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('initializeDefaultCategories error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}
