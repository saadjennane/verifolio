'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle, Clock, FileText, List, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TaskProgressBar } from './TaskProgressBar';
import { ApplyTemplateModal } from './ApplyTemplateModal';
import { TaskContext } from './TaskContext';
import { WaitReasonModal } from '@/components/modals/WaitReasonModal';
import { TaskEditModal } from '@/components/modals/TaskEditModal';
import { CreateTaskModal } from '@/components/modals/CreateTaskModal';
import type { Task, TaskEntityType, TaskStatus } from '@/lib/tasks/types';
import type { EntityTaskProgress } from '@/lib/tasks/templates';
import { formatDate } from '@/lib/utils/format';

interface EntityTasksSectionProps {
  entityType: TaskEntityType;
  entityId: string;
  entityName?: string;
  className?: string;
}

type ViewMode = 'list' | 'kanban';

const STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'A faire',
  en_attente: 'En attente',
  done: 'Terminee',
};

const OWNER_LABELS = {
  me: 'Moi',
  client: 'Client',
  supplier: 'Fournisseur',
};

export function EntityTasksSection({
  entityType,
  entityId,
  entityName,
  className = '',
}: EntityTasksSectionProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [progress, setProgress] = useState<EntityTaskProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [waitReasonModalOpen, setWaitReasonModalOpen] = useState(false);
  const [waitingTask, setWaitingTask] = useState<{ id: string; reason?: string } | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/tasks?entity_type=${entityType}&entity_id=${entityId}`
      );
      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errJson = await res.json();
          throw new Error(errJson.error || 'Erreur lors du chargement');
        }
        throw new Error(`Erreur ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();

      // Trier: open/en_attente d'abord, puis done
      const sortedTasks = (json.tasks || []).sort((a: Task, b: Task) => {
        const statusOrder = { open: 0, en_attente: 1, done: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });

      setTasks(sortedTasks);

      // Calculer la progression
      const total = sortedTasks.length;
      const completed = sortedTasks.filter((t: Task) => t.status === 'done').length;
      setProgress({
        entity_type: entityType,
        entity_id: entityId,
        total_tasks: total,
        completed_tasks: completed,
        pending_tasks: total - completed,
        progress_percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleToggleStatus = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'done' ? 'open' : 'done';
    const endpoint =
      newStatus === 'done'
        ? `/api/tasks/${task.id}/complete`
        : `/api/tasks/${task.id}/reopen`;

    try {
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) throw new Error('Erreur');
      fetchTasks();
    } catch {
      // Ignorer l'erreur silencieusement
    }
  };

  const handleChangeStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const updateData: Record<string, unknown> = { status: newStatus };

      if (newStatus === 'done') {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      if (newStatus !== 'en_attente') {
        updateData.wait_reason = null;
      }

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error('Erreur');
      fetchTasks();
    } catch (err) {
      console.error('Error changing task status:', err);
    }
  };

  const handleSetWaiting = (taskId: string, currentReason?: string) => {
    setWaitingTask({ id: taskId, reason: currentReason });
    setWaitReasonModalOpen(true);
  };

  const handleWaitReasonSubmit = async (reason: string) => {
    if (!waitingTask) return;

    try {
      const res = await fetch(`/api/tasks/${waitingTask.id}/wait`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wait_reason: reason }),
      });

      if (!res.ok) throw new Error('Failed to set task to waiting');

      fetchTasks();
      setWaitingTask(null);
    } catch (err) {
      console.error('Error setting task to waiting:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Supprimer cette tache ?')) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
      fetchTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleApplyTemplate = async (templateId: string, referenceDate: string) => {
    const res = await fetch(`/api/task-templates/${templateId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_type: entityType,
        entity_id: entityId,
        reference_date: referenceDate,
      }),
    });

    if (!res.ok) {
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de l'application du template");
      }
      throw new Error(`Erreur ${res.status}: ${res.statusText}`);
    }

    fetchTasks();
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'done') return false;
    const today = new Date().toISOString().split('T')[0];
    return task.due_date < today;
  };

  // Grouper les taches par statut
  const openTasks = tasks.filter((t) => t.status === 'open');
  const waitingTasks = tasks.filter((t) => t.status === 'en_attente');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  const showTemplateButton = ['deal', 'mission', 'client'].includes(entityType);

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <p className="text-red-600 text-sm">{error}</p>
        <Button size="sm" onClick={fetchTasks} className="mt-2">
          Reessayer
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold">Taches</h3>
        <div className="flex items-center gap-2">
          {/* Toggle Liste / Kanban */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Vue liste"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Vue kanban"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {showTemplateButton && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsTemplateModalOpen(true)}
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Template
            </Button>
          )}

          <Button size="sm" onClick={() => setIsCreateTaskModalOpen(true)}>
            + Tache
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {progress && progress.total_tasks > 0 && (
        <TaskProgressBar
          total={progress.total_tasks}
          completed={progress.completed_tasks}
          className="mb-4"
        />
      )}

      {/* Contenu */}
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="mb-3">Aucune tache liee</p>
          <Button size="sm" onClick={() => setIsCreateTaskModalOpen(true)}>
            Creer une tache
          </Button>
        </div>
      ) : viewMode === 'kanban' ? (
        /* VUE KANBAN */
        <div className="grid grid-cols-3 gap-3" style={{ minHeight: '300px' }}>
          {/* Colonne Ouvertes */}
          <div className="flex flex-col bg-blue-50 rounded-lg p-2">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-blue-200">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-sm font-medium text-gray-900">A faire</span>
              <Badge variant="blue" className="text-xs">
                {openTasks.length}
              </Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {openTasks.map((task) => (
                <KanbanTaskCard
                  key={task.id}
                  task={task}
                  onToggle={() => handleToggleStatus(task)}
                  onEdit={() => {
                    setEditingTask(task);
                    setShowEditModal(true);
                  }}
                  onDelete={() => handleDeleteTask(task.id)}
                  onSetWaiting={() => handleSetWaiting(task.id)}
                  onChangeStatus={handleChangeStatus}
                  isOverdue={isOverdue(task)}
                />
              ))}
              {openTasks.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Aucune</p>
              )}
            </div>
          </div>

          {/* Colonne En attente */}
          <div className="flex flex-col bg-yellow-50 rounded-lg p-2">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-yellow-200">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="text-sm font-medium text-gray-900">En attente</span>
              <Badge variant="yellow" className="text-xs">
                {waitingTasks.length}
              </Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {waitingTasks.map((task) => (
                <KanbanTaskCard
                  key={task.id}
                  task={task}
                  onToggle={() => handleToggleStatus(task)}
                  onEdit={() => {
                    setEditingTask(task);
                    setShowEditModal(true);
                  }}
                  onDelete={() => handleDeleteTask(task.id)}
                  onSetWaiting={() =>
                    handleSetWaiting(task.id, task.wait_reason || undefined)
                  }
                  onChangeStatus={handleChangeStatus}
                  isOverdue={isOverdue(task)}
                />
              ))}
              {waitingTasks.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Aucune</p>
              )}
            </div>
          </div>

          {/* Colonne Terminees */}
          <div className="flex flex-col bg-green-50 rounded-lg p-2">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-green-200">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-gray-900">Terminees</span>
              <Badge variant="green" className="text-xs">
                {doneTasks.length}
              </Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {doneTasks.map((task) => (
                <KanbanTaskCard
                  key={task.id}
                  task={task}
                  onToggle={() => handleToggleStatus(task)}
                  onEdit={() => {
                    setEditingTask(task);
                    setShowEditModal(true);
                  }}
                  onDelete={() => handleDeleteTask(task.id)}
                  onSetWaiting={() => {}}
                  onChangeStatus={handleChangeStatus}
                  isOverdue={false}
                />
              ))}
              {doneTasks.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Aucune</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* VUE LISTE */
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                task.status === 'done'
                  ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                  : 'bg-background border-border'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => handleToggleStatus(task)}
                className={`mt-0.5 flex-shrink-0 ${
                  task.status === 'done'
                    ? 'text-green-600'
                    : task.status === 'en_attente'
                    ? 'text-yellow-500'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {task.status === 'done' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : task.status === 'en_attente' ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div
                  className={`font-medium cursor-pointer hover:text-blue-600 ${
                    task.status === 'done' ? 'line-through text-muted-foreground' : ''
                  }`}
                  onClick={() => {
                    setEditingTask(task);
                    setShowEditModal(true);
                  }}
                >
                  {task.title}
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {task.due_date && (
                    <span
                      className={`text-xs ${
                        task.status !== 'done' && new Date(task.due_date) < new Date()
                          ? 'text-red-600 font-medium'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatDate(task.due_date)}
                    </span>
                  )}

                  {task.owner_scope && task.owner_scope !== 'me' && (
                    <Badge
                      variant={task.owner_scope === 'client' ? 'yellow' : 'blue'}
                      className="text-xs"
                    >
                      {OWNER_LABELS[task.owner_scope]}
                    </Badge>
                  )}

                  {task.status === 'en_attente' && task.wait_reason && (
                    <span className="text-xs text-yellow-600">{task.wait_reason}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {task.status === 'open' && (
                  <button
                    onClick={() => handleSetWaiting(task.id)}
                    className="text-xs text-gray-400 hover:text-yellow-600 p-1"
                    title="Mettre en attente"
                  >
                    <Clock className="w-4 h-4" />
                  </button>
                )}
                {!task.is_system && (
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-xs text-gray-400 hover:text-red-600 p-1"
                    title="Supprimer"
                  >
                    <span className="text-lg leading-none">&times;</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <ApplyTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onApply={handleApplyTemplate}
        entityType={entityType}
        entityId={entityId}
      />

      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => {
          setIsCreateTaskModalOpen(false);
          fetchTasks();
        }}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName || ''}
      />

      <WaitReasonModal
        isOpen={waitReasonModalOpen}
        onClose={() => {
          setWaitReasonModalOpen(false);
          setWaitingTask(null);
        }}
        onSubmit={handleWaitReasonSubmit}
        initialReason={waitingTask?.reason}
      />

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          isOpen={showEditModal}
          onClose={() => {
            setEditingTask(null);
            setShowEditModal(false);
          }}
          onSave={() => {
            fetchTasks();
            setEditingTask(null);
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}

/* Composant Carte Kanban pour tache */
interface KanbanTaskCardProps {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetWaiting: () => void;
  onChangeStatus: (taskId: string, status: TaskStatus) => void;
  isOverdue: boolean;
}

function KanbanTaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
  onSetWaiting,
  onChangeStatus,
  isOverdue,
}: KanbanTaskCardProps) {
  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-2.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onEdit}
    >
      {/* Header avec checkbox et titre */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={task.status === 'done'}
          onChange={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <h4
          className={`text-sm font-medium flex-1 ${
            task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'
          }`}
        >
          {task.title}
        </h4>
      </div>

      {/* Indicateur de retard */}
      {isOverdue && (
        <div className="mt-1.5">
          <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
            EN RETARD
          </span>
        </div>
      )}

      {/* Date d'echeance */}
      {task.due_date && (
        <p className={`text-xs mt-1.5 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
          {new Date(task.due_date).toLocaleDateString('fr-FR')}
        </p>
      )}

      {/* Raison d'attente */}
      {task.wait_reason && task.status === 'en_attente' && (
        <p className="text-xs text-yellow-700 italic mt-1.5 line-clamp-2">
          {task.wait_reason}
        </p>
      )}

      {/* Actions rapides */}
      <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100">
        {task.status !== 'open' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChangeStatus(task.id, 'open');
            }}
            className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
          >
            Ouvrir
          </button>
        )}
        {task.status !== 'en_attente' && task.status !== 'done' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSetWaiting();
            }}
            className="text-xs px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
          >
            Attendre
          </button>
        )}
        {task.status !== 'done' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChangeStatus(task.id, 'done');
            }}
            className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-700 hover:bg-green-100"
          >
            Terminer
          </button>
        )}
        {!task.is_system && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-700 hover:bg-red-100 ml-auto"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
