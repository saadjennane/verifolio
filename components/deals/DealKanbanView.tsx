'use client';

import { useState } from 'react';
import { DealCard } from './DealCard';
import type { DealListItem } from '@/lib/deals';

interface DealKanbanViewProps {
  deals: DealListItem[];
  onDealClick: (deal: DealListItem) => void;
  onStatusChange: (dealId: string, newStatus: string) => Promise<void>;
}

const KANBAN_COLUMNS = [
  { id: 'new', label: 'Nouveau', color: 'bg-blue-50 border-blue-200', hoverColor: 'bg-blue-100' },
  { id: 'draft', label: 'Brouillon', color: 'bg-gray-50 border-gray-200', hoverColor: 'bg-gray-100' },
  { id: 'sent', label: 'Envoyé', color: 'bg-yellow-50 border-yellow-200', hoverColor: 'bg-yellow-100' },
  { id: 'won', label: 'Gagné', color: 'bg-green-50 border-green-200', hoverColor: 'bg-green-100' },
  { id: 'lost', label: 'Perdu', color: 'bg-red-50 border-red-200', hoverColor: 'bg-red-100' },
];

const STATUS_LABELS: Record<string, string> = {
  new: 'Nouveau',
  draft: 'Brouillon',
  sent: 'Envoyé',
  won: 'Gagné',
  lost: 'Perdu',
};

export function DealKanbanView({ deals, onDealClick, onStatusChange }: DealKanbanViewProps) {
  const [draggedDeal, setDraggedDeal] = useState<DealListItem | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ dealId: string; newStatus: string } | null>(null);
  const [showMissionPrompt, setShowMissionPrompt] = useState(false);
  const [wonDealId, setWonDealId] = useState<string | null>(null);

  // Group deals by status
  const dealsByStatus = KANBAN_COLUMNS.reduce((acc, column) => {
    acc[column.id] = deals.filter(deal => deal.status === column.id);
    return acc;
  }, {} as Record<string, DealListItem[]>);

  function handleDragStart(e: React.DragEvent, deal: DealListItem) {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = 'move';
    // Réduire l'opacité de l'élément pendant le drag
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.4';
    }
  }

  function handleDragEnd(e: React.DragEvent) {
    setDraggedDeal(null);
    setDragOverColumn(null);
    // Restaurer l'opacité
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  }

  function handleDragOver(e: React.DragEvent, columnId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  }

  function handleDragLeave() {
    setDragOverColumn(null);
  }

  async function handleDrop(e: React.DragEvent, newStatus: string) {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedDeal || draggedDeal.status === newStatus) {
      setDraggedDeal(null);
      return;
    }

    // Vérifier les documents si on passe en SENT
    if (newStatus === 'sent' && draggedDeal.status !== 'sent') {
      const hasDocuments = await checkDocuments(draggedDeal.id);
      if (!hasDocuments) {
        const confirmed = window.confirm(
          `Souhaitez-vous marquer ce deal comme envoyé même si vous n'avez pas envoyé de proposition ou devis ?\n\n` +
          `Deal: ${draggedDeal.title}`
        );
        if (!confirmed) {
          setDraggedDeal(null);
          return;
        }
      }
    }

    // Vérifier si une confirmation est nécessaire pour transitions critiques
    const needsConfirmation =
      (draggedDeal.status === 'sent' && newStatus === 'won') ||
      (draggedDeal.status === 'sent' && newStatus === 'lost') ||
      draggedDeal.status === 'won' ||
      draggedDeal.status === 'lost';

    if (needsConfirmation) {
      setPendingChange({ dealId: draggedDeal.id, newStatus });
      setShowConfirmation(true);
      setDraggedDeal(null);
    } else {
      await onStatusChange(draggedDeal.id, newStatus);
      setDraggedDeal(null);
    }
  }

  async function checkDocuments(dealId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/deals/${dealId}/check-documents`);
      if (!res.ok) return true; // En cas d'erreur, on laisse passer
      const data = await res.json();
      return data.hasAnyDocument;
    } catch (error) {
      console.error('Error checking documents:', error);
      return true; // En cas d'erreur, on laisse passer
    }
  }

  async function confirmStatusChange() {
    if (pendingChange) {
      await onStatusChange(pendingChange.dealId, pendingChange.newStatus);

      // Si on vient de passer en WON, proposer de créer une mission
      if (pendingChange.newStatus === 'won') {
        setWonDealId(pendingChange.dealId);
        setShowMissionPrompt(true);
      }

      setPendingChange(null);
      setShowConfirmation(false);
    }
  }

  async function createMissionFromDeal() {
    if (!wonDealId) return;

    try {
      const res = await fetch(`/api/deals/${wonDealId}/create-mission`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Erreur lors de la création de la mission');
        return;
      }

      // Afficher un message selon si la mission était déjà créée ou non
      if (data.message) {
        alert(data.message); // "Une mission existe déjà pour ce deal"
      } else {
        alert('Mission créée avec succès !');
      }

      setShowMissionPrompt(false);
      setWonDealId(null);
    } catch (error) {
      console.error('Error creating mission:', error);
      alert('Erreur lors de la création de la mission');
    }
  }

  function skipMissionCreation() {
    setShowMissionPrompt(false);
    setWonDealId(null);
  }

  function cancelStatusChange() {
    setPendingChange(null);
    setShowConfirmation(false);
  }

  const pendingDeal = pendingChange ? deals.find(d => d.id === pendingChange.dealId) : null;

  return (
    <>
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((column) => {
          const columnDeals = dealsByStatus[column.id] || [];
          const isOver = dragOverColumn === column.id;
          const isDraggingFromThis = draggedDeal?.status === column.id;

          return (
            <div
              key={column.id}
              className="flex-shrink-0 w-80"
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* En-tête de colonne */}
              <div className={`${column.color} border rounded-t-lg p-3 mb-2 transition-all duration-200`}>
                <h2 className="font-semibold text-gray-900 flex items-center justify-between">
                  <span>{column.label}</span>
                  <span className="bg-white px-2 py-0.5 rounded-full text-sm">
                    {columnDeals.length}
                  </span>
                </h2>
              </div>

              {/* Zone de drop */}
              <div
                className={`space-y-3 min-h-[200px] p-2 rounded-lg border-2 border-dashed transition-all duration-200 ${
                  isOver && !isDraggingFromThis
                    ? `${column.hoverColor} border-gray-400 scale-[1.02]`
                    : 'border-transparent'
                }`}
              >
                {columnDeals.length === 0 && isOver ? (
                  <div className="flex items-center justify-center h-32 text-sm text-gray-500 font-medium">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      Déposer ici
                    </div>
                  </div>
                ) : (
                  <>
                    {columnDeals.map((deal) => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal)}
                        onDragEnd={handleDragEnd}
                        className="transition-transform duration-200 hover:scale-[1.02] cursor-move active:cursor-grabbing"
                      >
                        <DealCard
                          deal={deal}
                          onClick={() => onDealClick(deal)}
                          isDragging={draggedDeal?.id === deal.id}
                        />
                      </div>
                    ))}
                    {/* Placeholder fantôme quand on survole une colonne non-vide */}
                    {isOver && !isDraggingFromThis && draggedDeal && (
                      <div className="border-2 border-dashed border-blue-400 rounded-lg p-4 bg-blue-50/50 animate-pulse">
                        <div className="h-32 flex items-center justify-center text-sm text-blue-600 font-medium">
                          Déposer ici
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de confirmation changement de statut */}
      {showConfirmation && pendingDeal && pendingChange && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200"
          onClick={cancelStatusChange}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Confirmer le changement de statut
            </h2>
            <p className="text-gray-600 mb-6">
              Voulez-vous vraiment passer le deal "<strong>{pendingDeal.title}</strong>" de{' '}
              <strong>{STATUS_LABELS[pendingDeal.status]}</strong> à{' '}
              <strong className={
                pendingChange.newStatus === 'won' ? 'text-green-600' :
                pendingChange.newStatus === 'lost' ? 'text-red-600' :
                'text-blue-600'
              }>
                {STATUS_LABELS[pendingChange.newStatus]}
              </strong> ?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelStatusChange}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 active:scale-95 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={confirmStatusChange}
                className={`px-4 py-2 rounded text-white active:scale-95 transition-all ${
                  pendingChange.newStatus === 'won'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal proposition création mission */}
      {showMissionPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200"
          onClick={skipMissionCreation}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🎉 Deal gagné !
            </h2>
            <p className="text-gray-600 mb-6">
              Souhaitez-vous créer une mission pour ce deal ?
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                La mission permettra de suivre la réalisation du projet, de lier des factures et de demander des avis clients.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={skipMissionCreation}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 active:scale-95 transition-all"
              >
                Plus tard
              </button>
              <button
                onClick={createMissionFromDeal}
                className="px-4 py-2 rounded text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all"
              >
                Créer la mission
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
