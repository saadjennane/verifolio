'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PaymentSummary, PaymentsList, PaymentModal } from '@/components/payments';
import type { MissionPaymentSummary, Payment, PaymentWithRelations, PaymentCreate, InvoicePaymentStatus } from '@/lib/payments/types';
import { formatCurrency } from '@/lib/utils/currency';

interface PaymentsTabProps {
  missionId: string;
  clientId?: string;
  currency?: string;
}

interface InvoicePayment {
  invoice_id: string;
  numero: string;
  total_ttc: number;
  total_paid: number;
  remaining: number;
  payment_status: InvoicePaymentStatus;
  payments: PaymentWithRelations[];
}

export function PaymentsTab({ missionId, clientId, currency = 'EUR' }: PaymentsTabProps) {
  const [summary, setSummary] = useState<MissionPaymentSummary | null>(null);
  const [invoicePayments, setInvoicePayments] = useState<InvoicePayment[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | undefined>();
  const [selectedRemaining, setSelectedRemaining] = useState<number | undefined>();

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/missions/${missionId}/payments`);
      if (!res.ok) throw new Error('Erreur lors du chargement');
      const json = await res.json();
      setSummary(json.data.summary);
      setInvoicePayments(json.data.invoicePayments || []);
      setAllPayments(json.data.allPayments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [missionId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleAddPayment = (invoiceId?: string, remaining?: number) => {
    setEditingPayment(null);
    setSelectedInvoiceId(invoiceId);
    setSelectedRemaining(remaining);
    setIsModalOpen(true);
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setSelectedInvoiceId(payment.invoice_id || undefined);
    setSelectedRemaining(undefined);
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
      body: JSON.stringify({
        ...data,
        mission_id: missionId,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erreur');
    }

    setIsModalOpen(false);
    setEditingPayment(null);
    setSelectedInvoiceId(undefined);
    setSelectedRemaining(undefined);
    fetchPayments();
  };

  const getStatusBadge = (status: InvoicePaymentStatus) => {
    switch (status) {
      case 'paye':
        return <Badge variant="green">Payée</Badge>;
      case 'partiel':
        return <Badge variant="yellow">Partiel</Badge>;
      default:
        return <Badge variant="gray">Non payée</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-6">
          <p className="text-red-600">{error}</p>
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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Paiements</h2>
            <Button size="sm" onClick={() => handleAddPayment()}>
              Enregistrer un paiement
            </Button>
          </div>

          {/* Résumé global */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <div className="text-sm text-gray-500">Total facturé</div>
                <div className="text-lg font-semibold">{formatCurrency(summary.total_invoiced, currency)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Total payé</div>
                <div className="text-lg font-semibold text-green-600">{formatCurrency(summary.total_paid, currency)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Avances</div>
                <div className="text-lg font-semibold text-blue-600">{formatCurrency(summary.total_advances, currency)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Reste à percevoir</div>
                <div className={`text-lg font-semibold ${summary.remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatCurrency(summary.remaining, currency)}
                </div>
              </div>
            </div>
          )}

          {/* Paiements par facture */}
          {invoicePayments.length > 0 && (
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Par facture</h3>
              {invoicePayments.map((inv) => (
                <div key={inv.invoice_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <a
                        href={`/invoices/${inv.invoice_id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {inv.numero}
                      </a>
                      {getStatusBadge(inv.payment_status)}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddPayment(inv.invoice_id, inv.remaining)}
                    >
                      + Paiement
                    </Button>
                  </div>

                  <PaymentSummary
                    totalAmount={inv.total_ttc}
                    totalPaid={inv.total_paid}
                    remaining={inv.remaining}
                    paymentStatus={inv.payment_status}
                    currency={currency}
                  />

                  {inv.payments.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <PaymentsList
                        payments={inv.payments}
                        onEdit={handleEditPayment}
                        onDelete={handleDeletePayment}
                        currency={currency}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Avances sans facture */}
          {allPayments.filter(p => !p.invoice_id && p.payment_type === 'advance').length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Avances (sans facture)</h3>
              <PaymentsList
                payments={allPayments.filter(p => !p.invoice_id && p.payment_type === 'advance')}
                onEdit={handleEditPayment}
                onDelete={handleDeletePayment}
                currency={currency}
              />
            </div>
          )}

          {/* Message si aucun paiement */}
          {invoicePayments.length === 0 && allPayments.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucun paiement enregistré pour cette mission
            </p>
          )}
        </div>
      </Card>

      {/* Modal de paiement */}
      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPayment(null);
          setSelectedInvoiceId(undefined);
          setSelectedRemaining(undefined);
        }}
        onSubmit={handleSubmitPayment}
        invoiceId={selectedInvoiceId}
        clientId={clientId}
        missionId={missionId}
        remainingAmount={selectedRemaining}
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
