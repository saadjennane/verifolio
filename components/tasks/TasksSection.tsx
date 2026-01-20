'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TaskProgressBar } from './TaskProgressBar';
import { ApplyTemplateModal } from './ApplyTemplateModal';
import type { Task, TaskEntityType, TaskStatus } from '@/lib/tasks/types';
import type { EntityTaskProgress } from '@/lib/tasks/templates';
import { formatDate } from '@/lib/utils/format';

interface TasksSectionProps {
  entityType: TaskEntityType;
  entityId: string;
  className?: string;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'À faire',
  en_attente: 'En attente',
  done: 'Terminée',
};

const OWNER_LABELS = {
  me: 'Moi',
  client: 'Client',
  supplier: 'Fournisseur',
};

export function TasksSection({ entityType, entityId, className = '' }: TasksSectionProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [progress, setProgress] = useState<EntityTaskProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

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
    const endpoint = newStatus === 'done'
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
        throw new Error(err.error || 'Erreur lors de l\'application du template');
      }
      throw new Error(`Erreur ${res.status}: ${res.statusText}`);
    }

    fetchTasks();
  };

  // Ne pas afficher si pas de données (afficher template même sans tâches)
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
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold">Tâches</h3>
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
      </div>

      {/* Progress bar */}
      {progress && progress.total_tasks > 0 && (
        <TaskProgressBar
          total={progress.total_tasks}
          completed={progress.completed_tasks}
          className="mb-4"
        />
      )}

      {/* Tasks list */}
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucune tâche liée
        </p>
      ) : (
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
                <div className={`font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                  {task.title}
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {task.due_date && (
                    <span className={`text-xs ${
                      task.status !== 'done' && new Date(task.due_date) < new Date()
                        ? 'text-red-600 font-medium'
                        : 'text-muted-foreground'
                    }`}>
                      {formatDate(task.due_date)}
                    </span>
                  )}

                  {task.owner_scope && task.owner_scope !== 'me' && (
                    <Badge variant={task.owner_scope === 'client' ? 'yellow' : 'blue'} className="text-xs">
                      {OWNER_LABELS[task.owner_scope]}
                    </Badge>
                  )}

                  {task.status === 'en_attente' && task.wait_reason && (
                    <span className="text-xs text-yellow-600">{task.wait_reason}</span>
                  )}
                </div>
              </div>

              {/* Status badge for non-done tasks */}
              {task.status !== 'done' && (
                <Badge
                  variant={task.status === 'en_attente' ? 'yellow' : 'gray'}
                  className="text-xs flex-shrink-0"
                >
                  {STATUS_LABELS[task.status]}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Template Modal */}
      <ApplyTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onApply={handleApplyTemplate}
        entityType={entityType}
        entityId={entityId}
      />
    </div>
  );
}
