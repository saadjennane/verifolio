'use client';

import { ReviewRequestForm } from '@/components/forms/ReviewRequestForm';
import { useTabsStore } from '@/lib/stores/tabs-store';

interface ReviewRequestFormTabProps {
  requestId?: string;
}

export function ReviewRequestFormTab({ requestId }: ReviewRequestFormTabProps) {
  const { closeTab, openTab, activeTabId } = useTabsStore();

  const handleSuccess = () => {
    // Fermer l'onglet de création/édition
    if (activeTabId) {
      closeTab(activeTabId);
    }

    // Ouvrir l'onglet de la liste des reviews
    openTab({
      type: 'reviews',
      path: '/reviews',
      title: 'Avis clients',
    });
  };

  const handleCancel = () => {
    if (activeTabId) {
      closeTab(activeTabId);
    }
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Nouvelle demande d'avis
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Demandez un avis ou témoignage à un client après une mission réussie
        </p>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <ReviewRequestForm
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            embedded
          />
        </div>
      </div>
    </div>
  );
}
