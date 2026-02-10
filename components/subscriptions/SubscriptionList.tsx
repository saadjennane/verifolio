'use client';

import { useState } from 'react';
import { MoreHorizontal, Zap, Circle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency } from '@/lib/utils/currency';
import { useTabsStore } from '@/lib/stores/tabs-store';
import type { SubscriptionWithSupplier } from '@/lib/subscriptions';
import {
  FREQUENCY_SHORT_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  DUE_STATUS_LABELS,
  DUE_STATUS_COLORS,
} from '@/lib/subscriptions';

interface SubscriptionListProps {
  subscriptions: SubscriptionWithSupplier[];
  currency?: string;
  onEdit: (subscription: SubscriptionWithSupplier) => void;
  onSuspend: (subscription: SubscriptionWithSupplier) => void;
  onResume: (subscription: SubscriptionWithSupplier) => void;
  onCancel: (subscription: SubscriptionWithSupplier) => void;
  onViewDetails: (subscription: SubscriptionWithSupplier) => void;
}

export function SubscriptionList({
  subscriptions,
  currency = 'MAD',
  onEdit,
  onSuspend,
  onResume,
  onCancel,
  onViewDetails,
}: SubscriptionListProps) {
  const { openTab } = useTabsStore();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const handleViewSupplier = (subscription: SubscriptionWithSupplier) => {
    openTab({
      type: 'supplier',
      path: `/suppliers/${subscription.supplier_id}`,
      title: subscription.supplier_name,
      entityId: subscription.supplier_id,
    }, true);
  };

  // Grouper par statut (actifs en premier, puis suspendus, puis resilies)
  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active');
  const suspendedSubscriptions = subscriptions.filter((s) => s.status === 'suspended');
  const cancelledSubscriptions = subscriptions.filter((s) => s.status === 'cancelled');

  const renderSubscription = (subscription: SubscriptionWithSupplier) => {
    const isActive = subscription.status === 'active';
    const isSuspended = subscription.status === 'suspended';
    const isCancelled = subscription.status === 'cancelled';

    return (
      <div
        key={subscription.id}
        className={`flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
          isCancelled ? 'opacity-50' : ''
        }`}
        onClick={() => onViewDetails(subscription)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">{subscription.name}</span>
            {subscription.auto_debit ? (
              <Badge variant="green" className="text-xs flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Auto
              </Badge>
            ) : (
              <Badge variant="gray" className="text-xs flex items-center gap-1">
                <Circle className="h-3 w-3" />
                Manuel
              </Badge>
            )}
            {subscription.due_status === 'overdue' && isActive && (
              <Badge variant="red" className="text-xs flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                A payer
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 truncate">{subscription.supplier_name}</p>
        </div>

        <div className="flex items-center gap-6">
          {/* Montant */}
          <div className="text-right">
            <p className="font-medium text-gray-900">
              {formatCurrency(subscription.amount, currency)}
              <span className="text-gray-500 text-sm">
                {FREQUENCY_SHORT_LABELS[subscription.frequency]}
              </span>
            </p>
            {isActive && subscription.due_status && (
              <p className={`text-sm ${DUE_STATUS_COLORS[subscription.due_status]}`}>
                Prochain: {formatDate(subscription.next_due_date)}
              </p>
            )}
            {isCancelled && subscription.cancelled_at && (
              <p className="text-sm text-gray-400">
                Resilie le {formatDate(subscription.cancelled_at)}
              </p>
            )}
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="p-2 hover:bg-gray-100 rounded-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4 text-gray-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {!isCancelled && (
                <DropdownMenuItem onClick={() => onEdit(subscription)}>
                  Modifier
                </DropdownMenuItem>
              )}

              {isActive && (
                <DropdownMenuItem onClick={() => onSuspend(subscription)}>
                  Suspendre
                </DropdownMenuItem>
              )}

              {isSuspended && (
                <DropdownMenuItem onClick={() => onResume(subscription)}>
                  Reactiver
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => handleViewSupplier(subscription)}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Voir le fournisseur
              </DropdownMenuItem>

              {!isCancelled && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onCancel(subscription)}
                    className="text-red-600 focus:text-red-600"
                  >
                    Resilier
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Aucun abonnement</p>
        <p className="text-sm mt-1">Creez votre premier abonnement pour commencer</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Abonnements actifs */}
      {activeSubscriptions.map(renderSubscription)}

      {/* Abonnements suspendus */}
      {suspendedSubscriptions.length > 0 && (
        <>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
            <span className="text-xs font-medium text-gray-500 uppercase">Suspendus</span>
          </div>
          {suspendedSubscriptions.map(renderSubscription)}
        </>
      )}

      {/* Abonnements resilies */}
      {cancelledSubscriptions.length > 0 && (
        <>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
            <span className="text-xs font-medium text-gray-500 uppercase">Resilies</span>
          </div>
          {cancelledSubscriptions.map(renderSubscription)}
        </>
      )}
    </div>
  );
}
