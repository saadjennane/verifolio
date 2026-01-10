'use client';

import { useState } from 'react';
import { MissionCard } from './MissionCard';
import type { MissionListItem } from '@/lib/missions';

interface MissionKanbanViewProps {
  missions: MissionListItem[];
  onMissionClick: (mission: MissionListItem) => void;
  onStatusChange: (missionId: string, newStatus: string) => Promise<void>;
}

const KANBAN_COLUMNS = [
  { id: 'in_progress', label: 'En cours', color: 'bg-blue-50 border-blue-200', hoverColor: 'bg-blue-100' },
  { id: 'delivered', label: 'Livré', color: 'bg-purple-50 border-purple-200', hoverColor: 'bg-purple-100' },
  { id: 'to_invoice', label: 'À facturer', color: 'bg-yellow-50 border-yellow-200', hoverColor: 'bg-yellow-100' },
  { id: 'invoiced', label: 'Facturé', color: 'bg-orange-50 border-orange-200', hoverColor: 'bg-orange-100' },
  { id: 'paid', label: 'Payé', color: 'bg-green-50 border-green-200', hoverColor: 'bg-green-100' },
  { id: 'closed', label: 'Clôturé', color: 'bg-gray-50 border-gray-200', hoverColor: 'bg-gray-100' },
  { id: 'cancelled', label: 'Annulé', color: 'bg-red-50 border-red-200', hoverColor: 'bg-red-100' },
];

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'En cours',
  delivered: 'Livré',
  to_invoice: 'À facturer',
  invoiced: 'Facturé',
  paid: 'Payé',
  closed: 'Clôturé',
  cancelled: 'Annulé',
};

export function MissionKanbanView({ missions, onMissionClick, onStatusChange }: MissionKanbanViewProps) {
  const [draggedMission, setDraggedMission] = useState<MissionListItem | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ missionId: string; newStatus: string } | null>(null);

  // Group missions by status
  const missionsByStatus = KANBAN_COLUMNS.reduce((acc, column) => {
    acc[column.id] = missions.filter(mission => mission.status === column.id);
    return acc;
  }, {} as Record<string, MissionListItem[]>);

  function handleDragStart(e: React.DragEvent, mission: MissionListItem) {
    setDraggedMission(mission);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.4';
    }
  }

  function handleDragEnd(e: React.DragEvent) {
    setDraggedMission(null);
    setDragOverColumn(null);
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

    if (!draggedMission || draggedMission.status === newStatus) {
      setDraggedMission(null);
      return;
    }

    // Transitions critiques qui nécessitent une confirmation
    const needsConfirmation =
      draggedMission.status === 'paid' ||
      draggedMission.status === 'closed' ||
      draggedMission.status === 'cancelled';

    if (needsConfirmation) {
      setPendingChange({ missionId: draggedMission.id, newStatus });
      setShowConfirmation(true);
      setDraggedMission(null);
    } else {
      await onStatusChange(draggedMission.id, newStatus);
      setDraggedMission(null);
    }
  }

  async function confirmStatusChange() {
    if (pendingChange) {
      await onStatusChange(pendingChange.missionId, pendingChange.newStatus);
      setPendingChange(null);
      setShowConfirmation(false);
    }
  }

  function cancelStatusChange() {
    setPendingChange(null);
    setShowConfirmation(false);
  }

  const pendingMission = pendingChange ? missions.find(m => m.id === pendingChange.missionId) : null;

  return (
    <>
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((column) => {
          const columnMissions = missionsByStatus[column.id] || [];
          const isOver = dragOverColumn === column.id;
          const isDraggingFromThis = draggedMission?.status === column.id;

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
                    {columnMissions.length}
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
                {columnMissions.length === 0 && isOver ? (
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
                    {columnMissions.map((mission) => (
                      <div
                        key={mission.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, mission)}
                        onDragEnd={handleDragEnd}
                        className="transition-transform duration-200 hover:scale-[1.02] cursor-move active:cursor-grabbing"
                      >
                        <MissionCard
                          mission={mission}
                          onClick={() => onMissionClick(mission)}
                          isDragging={draggedMission?.id === mission.id}
                        />
                      </div>
                    ))}
                    {/* Placeholder fantôme */}
                    {isOver && !isDraggingFromThis && draggedMission && (
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

      {/* Modal de confirmation */}
      {showConfirmation && pendingMission && pendingChange && (
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
              Voulez-vous vraiment passer la mission "<strong>{pendingMission.title}</strong>" de{' '}
              <strong>{STATUS_LABELS[pendingMission.status]}</strong> à{' '}
              <strong className={
                pendingChange.newStatus === 'paid' ? 'text-green-600' :
                pendingChange.newStatus === 'cancelled' ? 'text-red-600' :
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
                className="px-4 py-2 rounded text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
