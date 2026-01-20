'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { PaymentsList, PaymentModal } from '@/components/payments';
import type { Payment, PaymentWithRelations, ClientPaymentBalance, PaymentCreate } from '@/lib/payments/types';
import { formatCurrency } from '@/lib/utils/currency';

interface ClientPaymentsSectionProps {
  clientId: string;
  currency?: string;
}

export function ClientPaymentsSection({ clientId, currency = 'EUR' }: ClientPaymentsSectionProps) {
  const [balance, setBalance] = useState<ClientPaymentBalance | null>(null);
  const [advances, setAdvances] = useState<PaymentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/payments?advances_only=true`);
      if (!res.ok) throw new Error('Erreur lors du chargement');
      const json = await res.json();
      setBalance(json.data.balance);
      setAdvances(json.data.payments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleAddAdvance = () => {
    setEditingPayment(null);
    setIsModalOpen(true);
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setIsModalOpen(true);
  };

  const handleDeletePayment = (paymentId: string) => {
    // PaymentsList handles confirmation internally
    fetch(`/api/payments/${paymentId}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('Erreur lors de la suppression');
        fetchPayments();
      })
      .catch(err => {
        alert(err instanceof Error ? err.message : 'Erreur');
      });
  };

  const handleSubmitPayment = async (data: PaymentCreate) => {
    const url = editingPayment
      ? `/api/payments/${editingPayment.id}`
      : '/api/payments';
    const method = editingPayment ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erreur');
    }

    setIsModalOpen(false);
    setEditingPayment(null);
    fetchPayments();
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-red-600 text-sm">{error}</p>
        <Button size="sm" onClick={fetchPayments} className="mt-2">
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Paiements & Avances</h2>
          <Button size="sm" variant="outline" onClick={handleAddAdvance}>
            + Avance
          </Button>
        </div>

        {/* Résumé du solde */}
        {balance && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(balance.total_invoiced, currency)}
              </p>
              <p className="text-xs text-gray-500">Facturé</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-green-600">
                {formatCurrency(balance.total_paid_invoices, currency)}
              </p>
              <p className="text-xs text-gray-500">Payé (factures)</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-blue-600">
                {formatCurrency(balance.total_advances, currency)}
              </p>
              <p className="text-xs text-gray-500">Avances</p>
            </div>
            <div className="text-center">
              <p className={`text-sm font-semibold ${balance.balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {formatCurrency(balance.balance, currency)}
              </p>
              <p className="text-xs text-gray-500">Solde</p>
            </div>
          </div>
        )}

        {/* Liste des avances */}
        {advances.length > 0 ? (
          <div>
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Avances enregistrées</h3>
            <PaymentsList
              payments={advances}
              onEdit={handleEditPayment}
              onDelete={handleDeletePayment}
              currency={currency}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-2">
            Aucune avance enregistrée
          </p>
        )}
      </div>

      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPayment(null);
        }}
        onSubmit={handleSubmitPayment}
        clientId={clientId}
        defaultType="advance"
        currency={currency}
        editData={editingPayment ? {
          id: editingPayment.id,
          amount: editingPayment.amount,
          payment_date: editingPayment.payment_date,
          payment_method: editingPayment.payment_method,
          payment_type: editingPayment.payment_type,
          reference: editingPayment.reference,
          notes: editingPayment.notes,
        } : undefined}
      />
    </>
  );
}
