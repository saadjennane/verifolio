'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useTabsStore } from '@/lib/stores/tabs-store';

interface Expense {
  id: string;
  description: string;
  category: string | null;
  date_expense: string;
  amount_ht: number | null;
  amount_tva: number | null;
  amount_ttc: number;
  payment_method: string | null;
  supplier: {
    id: string;
    nom: string;
  } | null;
  supplier_invoice: {
    id: string;
    numero: string | null;
  } | null;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

const paymentMethodLabels: Record<string, string> = {
  card: 'Carte bancaire',
  bank_transfer: 'Virement',
  cash: 'Espèces',
  check: 'Chèque',
  other: 'Autre',
};

export default function ExpensesPage() {
  const { openTab } = useTabsStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load expenses
      const expensesRes = await fetch('/api/expenses');
      if (expensesRes.ok) {
        const data = await expensesRes.json();
        setExpenses(data.data || []);
      }

      // Load categories
      const categoriesRes = await fetch('/api/expenses/categories');
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function formatAmount(amount: number | null) {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  const filteredExpenses = expenses.filter((expense) => {
    if (selectedCategory && expense.category !== selectedCategory) return false;
    if (dateRange.start && new Date(expense.date_expense) < new Date(dateRange.start)) return false;
    if (dateRange.end && new Date(expense.date_expense) > new Date(dateRange.end)) return false;
    return true;
  });

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount_ttc, 0);
  const totalHT = filteredExpenses.reduce((sum, e) => sum + (e.amount_ht || 0), 0);
  const totalTVA = filteredExpenses.reduce((sum, e) => sum + (e.amount_tva || 0), 0);

  // Group by category for stats
  const byCategory = filteredExpenses.reduce((acc, expense) => {
    const cat = expense.category || 'Non catégorisé';
    acc[cat] = (acc[cat] || 0) + expense.amount_ttc;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dépenses</h1>
          <p className="text-sm text-gray-500 mt-1">
            Suivez toutes vos dépenses professionnelles
          </p>
        </div>
        <Button
          onClick={() => openTab({
            type: 'new-expense',
            path: '/expenses/new',
            title: 'Nouvelle dépense',
          }, true)}
        >
          Nouvelle dépense
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total TTC</p>
          <p className="text-2xl font-bold text-gray-900">{formatAmount(totalAmount)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total HT</p>
          <p className="text-2xl font-bold text-gray-900">{formatAmount(totalHT)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total TVA</p>
          <p className="text-2xl font-bold text-gray-900">{formatAmount(totalTVA)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Nombre</p>
          <p className="text-2xl font-bold text-gray-900">{filteredExpenses.length}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Catégorie</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Toutes</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Du</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Au</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {(selectedCategory || dateRange.start || dateRange.end) && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory('');
                    setDateRange({ start: '', end: '' });
                  }}
                >
                  Réinitialiser
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-6">
        {/* Main table */}
        <div className="col-span-3">
          <Card>
            {loading ? (
              <div className="p-8 text-center text-gray-500">Chargement...</div>
            ) : filteredExpenses.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">
                  {expenses.length === 0 ? 'Aucune dépense' : 'Aucune dépense pour ces filtres'}
                </p>
                {expenses.length === 0 && (
                  <Button
                    onClick={() => openTab({
                      type: 'new-expense',
                      path: '/expenses/new',
                      title: 'Nouvelle dépense',
                    }, true)}
                  >
                    Ajouter la première dépense
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Montant TTC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow
                      key={expense.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => openTab({
                        type: 'expense',
                        path: `/expenses/${expense.id}`,
                        title: expense.description.substring(0, 20),
                        entityId: expense.id,
                      }, false)}
                    >
                      <TableCell>{formatDate(expense.date_expense)}</TableCell>
                      <TableCell className="font-medium max-w-xs truncate">
                        {expense.description}
                      </TableCell>
                      <TableCell>
                        {expense.category ? (
                          <Badge variant="gray">{expense.category}</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{expense.supplier?.nom || '-'}</TableCell>
                      <TableCell className="font-medium">{formatAmount(expense.amount_ttc)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>

        {/* Category breakdown */}
        <div>
          <Card>
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold">Par catégorie</h3>
            </div>
            <div className="p-4 space-y-3">
              {Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount]) => {
                  const catColor = categories.find(c => c.name === category)?.color || '#6B7280';
                  return (
                    <div key={category} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: catColor }}
                        />
                        <span className="text-sm">{category}</span>
                      </div>
                      <span className="text-sm font-medium">{formatAmount(amount)}</span>
                    </div>
                  );
                })}
              {Object.keys(byCategory).length === 0 && (
                <p className="text-sm text-gray-500">Aucune donnée</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
