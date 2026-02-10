'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  SubscriptionSummaryCards,
  SubscriptionList,
  SubscriptionModal,
  SubscriptionDetail,
} from '@/components/subscriptions';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { SubscriptionWithSupplier, SubscriptionsSummary } from '@/lib/subscriptions';

type ViewMode = 'list' | 'detail';
type StatusFilter = 'all' | 'active' | 'suspended' | 'cancelled';

export function SubscriptionsTab() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithSupplier[]>([]);
  const [summary, setSummary] = useState<SubscriptionsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithSupplier | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionWithSupplier | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    subscription: SubscriptionWithSupplier;
    action: 'suspend' | 'resume' | 'cancel';
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      params.set('summary', 'true');

      const res = await fetch(`/api/subscriptions?${params}`);
      if (res.ok) {
        const json = await res.json();
        setSubscriptions(json.data || []);
        setSummary(json.summary);
      }
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleCreate = () => {
    setEditingSubscription(null);
    setIsModalOpen(true);
  };

  const handleEdit = (subscription: SubscriptionWithSupplier) => {
    setEditingSubscription(subscription);
    setIsModalOpen(true);
  };

  const handleViewDetails = (subscription: SubscriptionWithSupplier) => {
    setSelectedSubscription(subscription);
    setViewMode('detail');
  };

  const handleBack = () => {
    setViewMode('list');
    setSelectedSubscription(null);
    fetchSubscriptions();
  };

  const handleSuspend = (subscription: SubscriptionWithSupplier) => {
    setConfirmAction({ subscription, action: 'suspend' });
  };

  const handleResume = (subscription: SubscriptionWithSupplier) => {
    setConfirmAction({ subscription, action: 'resume' });
  };

  const handleCancel = (subscription: SubscriptionWithSupplier) => {
    setConfirmAction({ subscription, action: 'cancel' });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/${confirmAction.subscription.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: confirmAction.action }),
      });

      if (res.ok) {
        fetchSubscriptions();
        if (viewMode === 'detail') {
          // Refresh detail view
          setSelectedSubscription(null);
          setTimeout(() => setSelectedSubscription(confirmAction.subscription), 100);
        }
      }
    } catch (err) {
      console.error('Error changing status:', err);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleStatusChange = (action: 'suspend' | 'resume' | 'cancel') => {
    if (selectedSubscription) {
      setConfirmAction({ subscription: selectedSubscription, action });
    }
  };

  const getConfirmDialogProps = () => {
    if (!confirmAction) return null;

    const { subscription, action } = confirmAction;

    switch (action) {
      case 'suspend':
        return {
          title: 'Suspendre l\'abonnement',
          description: `L'abonnement "${subscription.name}" sera suspendu. Aucun paiement ne sera genere pendant la suspension.`,
          confirmLabel: 'Suspendre',
          variant: 'default' as const,
        };
      case 'resume':
        return {
          title: 'Reactiver l\'abonnement',
          description: `L'abonnement "${subscription.name}" sera reactive. Les paiements reprendront selon la periodicite definie.`,
          confirmLabel: 'Reactiver',
          variant: 'default' as const,
        };
      case 'cancel':
        return {
          title: 'Resilier l\'abonnement',
          description: `L'abonnement "${subscription.name}" sera definitivement resilie. Cette action est irreversible.`,
          confirmLabel: 'Resilier',
          variant: 'destructive' as const,
        };
    }
  };

  if (viewMode === 'detail' && selectedSubscription) {
    return (
      <SubscriptionDetail
        subscriptionId={selectedSubscription.id}
        onBack={handleBack}
        onEdit={() => handleEdit(selectedSubscription)}
        onStatusChange={handleStatusChange}
      />
    );
  }

  return (
    <div className="p-6 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Abonnements</h1>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel abonnement
        </Button>
      </div>

      {/* Summary Cards */}
      <SubscriptionSummaryCards summary={summary} loading={loading} />

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        {(['all', 'active', 'suspended', 'cancelled'] as StatusFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              statusFilter === filter
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {filter === 'all' && 'Tous'}
            {filter === 'active' && 'Actifs'}
            {filter === 'suspended' && 'Suspendus'}
            {filter === 'cancelled' && 'Resilies'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <SubscriptionList
          subscriptions={subscriptions}
          onEdit={handleEdit}
          onSuspend={handleSuspend}
          onResume={handleResume}
          onCancel={handleCancel}
          onViewDetails={handleViewDetails}
        />
      )}

      {/* Modal */}
      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSubscription(null);
        }}
        onSuccess={fetchSubscriptions}
        subscription={editingSubscription}
      />

      {/* Confirm Dialog */}
      {(() => {
        const dialogProps = getConfirmDialogProps();
        if (!confirmAction || !dialogProps) return null;
        return (
          <ConfirmDialog
            open={true}
            onOpenChange={() => setConfirmAction(null)}
            onConfirm={handleConfirmAction}
            loading={actionLoading}
            cancelLabel="Annuler"
            title={dialogProps.title}
            description={dialogProps.description}
            confirmLabel={dialogProps.confirmLabel}
            variant={dialogProps.variant}
          />
        );
      })()}
    </div>
  );
}
