'use client';

import { Button, Input } from '@/components/ui';
import type { LineItemInput } from '@/lib/supabase/types';
import { getCurrencySymbol } from '@/lib/utils/currency';

interface LineItemsEditorProps {
  items: LineItemInput[];
  onChange: (items: LineItemInput[]) => void;
  defaultTvaRate?: number;
  currency?: string;
}

export function LineItemsEditor({ items, onChange, defaultTvaRate = 20, currency = 'EUR' }: LineItemsEditorProps) {
  const currencySymbol = getCurrencySymbol(currency);
  const addItem = () => {
    onChange([
      ...items,
      { description: '', quantite: 1, prix_unitaire: 0, tva_rate: defaultTvaRate },
    ]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItemInput, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const calculateTotals = () => {
    let totalHT = 0;
    let totalTVA = 0;

    items.forEach((item) => {
      const ht = item.quantite * item.prix_unitaire;
      const tva = ht * ((item.tva_rate || defaultTvaRate) / 100);
      totalHT += ht;
      totalTVA += tva;
    });

    return {
      totalHT,
      totalTVA,
      totalTTC: totalHT + totalTVA,
    };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  label="Description"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  placeholder="Description de la prestation"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="mt-6 p-2 text-gray-400 hover:text-red-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                type="number"
                label="Quantité"
                value={item.quantite}
                onChange={(e) => updateItem(index, 'quantite', parseFloat(e.target.value) || 0)}
                min={0}
                step="0.01"
                required
              />
              <Input
                type="number"
                label="Prix unitaire HT"
                value={item.prix_unitaire}
                onChange={(e) => updateItem(index, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                min={0}
                step="0.01"
                required
              />
              <Input
                type="number"
                label="TVA %"
                value={item.tva_rate ?? defaultTvaRate}
                onChange={(e) => updateItem(index, 'tva_rate', parseFloat(e.target.value) || 0)}
                min={0}
                max={100}
                step="0.1"
              />
            </div>

            <div className="text-right text-sm text-gray-600">
              Sous-total: {(item.quantite * item.prix_unitaire).toFixed(2)} {currencySymbol} HT
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="secondary" onClick={addItem}>
        + Ajouter une ligne
      </Button>

      {/* Totaux */}
      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total HT</span>
          <span className="font-medium">{totals.totalHT.toFixed(2)} {currencySymbol}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">TVA</span>
          <span className="font-medium">{totals.totalTVA.toFixed(2)} {currencySymbol}</span>
        </div>
        <div className="flex justify-between text-base font-semibold">
          <span>Total TTC</span>
          <span>{totals.totalTTC.toFixed(2)} {currencySymbol}</span>
        </div>
      </div>
    </div>
  );
}
