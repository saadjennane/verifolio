'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button, Input, Label } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import type { SubscriptionWithSupplier, SubscriptionCreate, SubscriptionUpdate, SubscriptionFrequency } from '@/lib/subscriptions';
import { FREQUENCY_LABELS } from '@/lib/subscriptions';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subscription?: SubscriptionWithSupplier | null;
  currency?: string;
}

interface Supplier {
  id: string;
  nom: string;
}

export function SubscriptionModal({
  isOpen,
  onClose,
  onSuccess,
  subscription,
  currency = 'MAD',
}: SubscriptionModalProps) {
  const isEditing = !!subscription;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [isNewSupplier, setIsNewSupplier] = useState(false);
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<SubscriptionFrequency>('monthly');
  const [frequencyDays, setFrequencyDays] = useState('');
  const [startDate, setStartDate] = useState('');
  const [autoDebit, setAutoDebit] = useState(false);
  const [notes, setNotes] = useState('');

  // Charger les fournisseurs
  useEffect(() => {
    async function loadSuppliers() {
      setLoadingSuppliers(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('clients')
        .select('id, nom')
        .eq('type', 'fournisseur')
        .order('nom');

      setSuppliers(data || []);
      setLoadingSuppliers(false);
    }

    if (isOpen) {
      loadSuppliers();
    }
  }, [isOpen]);

  // Pre-remplir le formulaire en mode edition
  useEffect(() => {
    if (subscription) {
      setName(subscription.name);
      setSupplierId(subscription.supplier_id);
      setAmount(subscription.amount.toString());
      setFrequency(subscription.frequency);
      setFrequencyDays(subscription.frequency_days?.toString() || '');
      setStartDate(subscription.start_date);
      setAutoDebit(subscription.auto_debit);
      setNotes(subscription.notes || '');
      setIsNewSupplier(false);
    } else {
      // Reset form
      setName('');
      setSupplierId('');
      setSupplierName('');
      setIsNewSupplier(false);
      setAmount('');
      setFrequency('monthly');
      setFrequencyDays('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setAutoDebit(false);
      setNotes('');
    }
    setError(null);
  }, [subscription, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        // Mise a jour
        const updates: SubscriptionUpdate = {
          name,
          amount: parseFloat(amount),
          frequency,
          frequency_days: frequency === 'custom' ? parseInt(frequencyDays) : null,
          auto_debit: autoDebit,
          notes: notes || null,
        };

        const res = await fetch(`/api/subscriptions/${subscription.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erreur lors de la modification');
        }
      } else {
        // Creation
        const payload: SubscriptionCreate = {
          name,
          amount: parseFloat(amount),
          currency,
          frequency,
          frequency_days: frequency === 'custom' ? parseInt(frequencyDays) : undefined,
          start_date: startDate,
          auto_debit: autoDebit,
          notes: notes || undefined,
        };

        if (isNewSupplier) {
          payload.supplier_name = supplierName;
        } else {
          payload.supplier_id = supplierId;
        }

        const res = await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erreur lors de la creation');
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier l\'abonnement' : 'Nouvel abonnement'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Nom du service */}
            <div className="space-y-2">
              <Label htmlFor="name">Nom du service *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ChatGPT, Figma, Notion..."
                required
              />
            </div>

            {/* Fournisseur */}
            {!isEditing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Fournisseur *</Label>
                  <button
                    type="button"
                    onClick={() => setIsNewSupplier(!isNewSupplier)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {isNewSupplier ? 'Choisir existant' : '+ Creer nouveau'}
                  </button>
                </div>

                {isNewSupplier ? (
                  <Input
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Nom du fournisseur"
                    required
                  />
                ) : (
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={loadingSuppliers}
                  >
                    <option value="">Selectionner un fournisseur</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.nom}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Montant et periodicite */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Montant *</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="pr-12"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    {currency}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Periodicite *</Label>
                <select
                  id="frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as SubscriptionFrequency)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Jours personnalises */}
            {frequency === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="frequencyDays">Nombre de jours *</Label>
                <Input
                  id="frequencyDays"
                  type="number"
                  min="1"
                  value={frequencyDays}
                  onChange={(e) => setFrequencyDays(e.target.value)}
                  placeholder="30"
                  required
                />
              </div>
            )}

            {/* Date de debut */}
            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="startDate">Date de debut *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Prelevement automatique */}
            <div className="flex items-center gap-3">
              <input
                id="autoDebit"
                type="checkbox"
                checked={autoDebit}
                onChange={(e) => setAutoDebit(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <Label htmlFor="autoDebit" className="cursor-pointer">
                  Prelevement automatique
                </Label>
                <p className="text-xs text-gray-500">
                  Le paiement sera marque comme effectue automatiquement
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes supplementaires..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
              />
            </div>

            {/* Erreur */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              {isEditing ? 'Enregistrer' : 'Creer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
