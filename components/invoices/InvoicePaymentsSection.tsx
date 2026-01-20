'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PaymentSummary, PaymentsList, PaymentModal } from '@/components/payments';
import type { Payment, PaymentWithRelations, InvoicePaymentSummary, PaymentCreate } from '@/lib/payments/types';

interface InvoicePaymentsSectionProps {
  invoiceId: string;
  clientId?: string;
  currency?: string;
}

export function InvoicePaymentsSection({ invoiceId, clientId, currency = 'EUR' }: InvoicePaymentsSectionProps) {
  const [summary, setSummary] = useState<InvoicePaymentSummary | null>(null);
  const [payments, setPayments] = useState<PaymentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/invoices/${invoiceId}/payments`);
      if (!res.ok) throw new Error('Erreur lors du chargement');
      const json = await res.json();
      setSummary(json.data.summary);
      setPayments(json.data.payments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleAddPayment = () => {
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
      <Card>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-6">
          <p className="text-red-600 text-sm">{error}</p>
          <Button size="sm" onClick={fetchPayments} className="mt-2">
            Réessayer
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Paiements</h2>
            <Button size="sm" onClick={handleAddPayment}>
              Ajouter un paiement
            </Button>
          </div>

          {summary && (
            <div className="mb-4">
              <PaymentSummary
                totalAmount={summary.total_ttc}
                totalPaid={summary.total_paid}
                remaining={summary.remaining}
                paymentStatus={summary.payment_status}
                currency={currency}
              />
            </div>
          )}

          {payments.length > 0 ? (
            <PaymentsList
              payments={payments}
              onEdit={handleEditPayment}
              onDelete={handleDeletePayment}
              currency={currency}
            />
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucun paiement enregistré
            </p>
          )}
        </div>
      </Card>

      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPayment(null);
        }}
        onSubmit={handleSubmitPayment}
        invoiceId={invoiceId}
        clientId={clientId}
        remainingAmount={summary?.remaining}
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
