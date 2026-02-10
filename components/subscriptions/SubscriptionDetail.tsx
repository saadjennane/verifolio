'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Zap, Circle, Check } from 'lucide-react';
import { Badge, Button, Card } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/currency';
import { useTabsStore } from '@/lib/stores/tabs-store';
import type { SubscriptionWithSupplier, SubscriptionPayment } from '@/lib/subscriptions';
import {
  FREQUENCY_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from '@/lib/subscriptions';

interface SubscriptionDetailProps {
  subscriptionId: string;
  onBack: () => void;
  onEdit: () => void;
  onStatusChange: (action: 'suspend' | 'resume' | 'cancel') => void;
}

interface SubscriptionWithPayments extends SubscriptionWithSupplier {
  payments?: SubscriptionPayment[];
}

export function SubscriptionDetail({
  subscriptionId,
  onBack,
  onEdit,
  onStatusChange,
}: SubscriptionDetailProps) {
  const { openTab } = useTabsStore();
  const [subscription, setSubscription] = useState<SubscriptionWithPayments | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSubscription = async () => {
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}`);
      if (res.ok) {
        const { data } = await res.json();
        setSubscription(data);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [subscriptionId]);

  const handleCompletePayment = async (paymentId: string) => {
    setActionLoading(paymentId);
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId }),
      });

      if (res.ok) {
        fetchSubscription();
      }
    } catch (err) {
      console.error('Error completing payment:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewSupplier = () => {
    if (subscription) {
      openTab({
        type: 'supplier',
        path: `/suppliers/${subscription.supplier_id}`,
        title: subscription.supplier_name,
        entityId: subscription.supplier_id,
      }, true);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Abonnement non trouve</p>
        <button onClick={onBack} className="text-blue-600 hover:underline mt-2">
          Retour
        </button>
      </div>
    );
  }

  const isActive = subscription.status === 'active';
  const isSuspended = subscription.status === 'suspended';
  const isCancelled = subscription.status === 'cancelled';

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{subscription.name}</h1>
            {subscription.auto_debit ? (
              <Badge variant="green" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Auto
              </Badge>
            ) : (
              <Badge variant="gray" className="flex items-center gap-1">
                <Circle className="h-3 w-3" />
                Manuel
              </Badge>
            )}
            <Badge className={STATUS_COLORS[subscription.status]}>
              {STATUS_LABELS[subscription.status]}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {!isCancelled && (
              <Button variant="secondary" onClick={onEdit}>
                Modifier
              </Button>
            )}
            {isActive && (
              <Button
                variant="secondary"
                onClick={() => onStatusChange('suspend')}
              >
                Suspendre
              </Button>
            )}
            {isSuspended && (
              <Button onClick={() => onStatusChange('resume')}>
                Reactiver
              </Button>
            )}
          </div>
        </div>

        <button
          onClick={handleViewSupplier}
          className="text-sm text-blue-600 hover:underline mt-1"
        >
          {subscription.supplier_name}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Montant</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(subscription.amount, subscription.currency)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Periodicite</p>
          <p className="text-lg font-semibold text-gray-900">
            {FREQUENCY_LABELS[subscription.frequency]}
            {subscription.frequency === 'custom' && ` (${subscription.frequency_days}j)`}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Prochaine echeance</p>
          <p className="text-lg font-semibold text-gray-900">
            {isActive ? formatDate(subscription.next_due_date) : '-'}
          </p>
        </Card>
      </div>

      {/* Historique des paiements */}
      <Card className="p-4">
        <h2 className="font-medium text-gray-900 mb-4">Historique des paiements</h2>

        {!subscription.payments || subscription.payments.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun paiement enregistre</p>
        ) : (
          <div className="space-y-2">
            {subscription.payments.map((payment) => {
              const isPending = payment.effective_status === 'pending' || payment.effective_status === 'overdue';

              return (
                <div
                  key={payment.payment_id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-900">
                      {formatDate(payment.payment_date)}
                    </span>
                    <Badge className={PAYMENT_STATUS_COLORS[payment.effective_status]}>
                      {PAYMENT_STATUS_LABELS[payment.effective_status]}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">
                      {formatCurrency(payment.amount, subscription.currency)}
                    </span>

                    {isPending && (
                      <Button
                        size="sm"
                        onClick={() => handleCompletePayment(payment.payment_id)}
                        loading={actionLoading === payment.payment_id}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Marquer paye
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Actions destructives */}
      {!isCancelled && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <Button
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onStatusChange('cancel')}
          >
            Resilier cet abonnement
          </Button>
        </div>
      )}
    </div>
  );
}
