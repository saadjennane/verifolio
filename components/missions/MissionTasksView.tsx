'use client';

import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TaskContext } from '@/components/tasks/TaskContext';
import { OwnerSelector } from '@/components/tasks/OwnerSelector';
import { TaskProgressBar, ApplyTemplateModal } from '@/components/tasks';
import { WaitReasonModal } from '@/components/modals/WaitReasonModal';
import { enrichTasksWithRelations } from '@/lib/tasks/client-tasks';
import type { Task, TaskStatus, TaskOwnerScope } from '@/lib/tasks/types';

interface MissionTasksViewProps {
  missionId: string;
  missionClientId?: string;
}

type ViewMode = 'list' | 'kanban';

/**
 * Vue Projet pour les tâches d'une mission
 * Affiche les tâches liées à cette mission avec vue liste ou kanban
 */
export function MissionTasksView({ missionId, missionClientId }: MissionTasksViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskOwnerScope, setNewTaskOwnerScope] = useState<TaskOwnerScope>('me');
  const [newTaskOwnerEntityId, setNewTaskOwnerEntityId] = useState<string | null>(null);
  const [waitReasonModalOpen, setWaitReasonModalOpen] = useState(false);
  const [waitingTask, setWaitingTask] = useState<{ id: string; reason?: string } | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [missionId]);

  async function loadTasks() {
    setLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          badges:task_badges(*)
        `)
        .eq('entity_type', 'mission')
        .eq('entity_id', missionId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading tasks:', error);
      } else {
        const tasksData = data as Task[] || [];
        const enrichedTasks = await enrichTasksWithRelations(tasksData);
        setTasks(enrichedTasks);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createTask() {
    if (!newTaskTitle.trim()) return;

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const taskData: any = {
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || null,
        due_date: newTaskDueDate || null,
        status: 'open',
        user_id: user?.id || null,
        entity_type: 'mission',
        entity_id: missionId,
        owner_scope: newTaskOwnerScope,
        owner_entity_id: newTaskOwnerEntityId,
      };

      const { error } = await supabase
        .from('tasks')
        .insert(taskData);

      if (error) throw new Error(error.message);

      // Reset form
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDueDate('');
      setNewTaskOwnerScope('me');
      setNewTaskOwnerEntityId(null);
      setShowNewTaskForm(false);
      await loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Erreur lors de la creation de la tache');
    }
  }

  async function changeTaskStatus(taskId: string, newStatus: TaskStatus) {
    try {
      const supabase = createClient();
      const updateData: any = { status: newStatus };

      if (newStatus === 'done') {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      if (newStatus !== 'en_attente') {
        updateData.wait_reason = null;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw new Error(error.message);

      await loadTasks();
    } catch (error) {
      console.error('Error changing task status:', error);
      alert('Erreur lors du changement de statut');
    }
  }

  async function handleSetWaiting(taskId: string, currentReason?: string) {
    setWaitingTask({ id: taskId, reason: currentReason });
    setWaitReasonModalOpen(true);
  }

  async function handleWaitReasonSubmit(reason: string) {
    if (!waitingTask) return;

    try {
      const res = await fetch(`/api/tasks/${waitingTask.id}/wait`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wait_reason: reason }),
      });

      if (!res.ok) {
        throw new Error('Failed to set task to waiting');
      }

      await loadTasks();
      setWaitingTask(null);
    } catch (error) {
      console.error('Error setting task to waiting:', error);
      alert('Erreur lors de la mise en attente');
    }
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Supprimer cette tache ?')) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete task');
      }

      await loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Erreur lors de la suppression');
    }
  }

  function isOverdue(task: Task) {
    if (!task.due_date || task.status === 'done') return false;
    const today = new Date().toISOString().split('T')[0];
    return task.due_date < today;
  }

  const openTasks = tasks.filter((t) => t.status === 'open');
  const waitingTasks = tasks.filter((t) => t.status === 'en_attente');
  const doneTasks = tasks.filter((t) => t.status === 'done');
  const overdueTasks = openTasks.filter((t) => isOverdue(t));

  async function handleApplyTemplate(templateId: string, referenceDate: string) {
    const res = await fetch(`/api/task-templates/${templateId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_type: 'mission',
        entity_id: missionId,
        reference_date: referenceDate,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erreur lors de l\'application du template');
    }

    await loadTasks();
  }

  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold">Taches projet</h2>
            <div className="flex gap-2 mt-1">
              <Badge variant="blue">{openTasks.length} ouvertes</Badge>
              {waitingTasks.length > 0 && (
                <Badge variant="yellow">{waitingTasks.length} en attente</Badge>
              )}
              {overdueTasks.length > 0 && (
                <Badge variant="red">{overdueTasks.length} en retard</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {/* Toggle Liste / Kanban */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Liste
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Kanban
              </button>
            </div>
            <Button size="sm" variant="outline" onClick={() => setIsTemplateModalOpen(true)}>
              <FileText className="w-4 h-4 mr-1" />
              Template
            </Button>
            <Button size="sm" onClick={() => setShowNewTaskForm(!showNewTaskForm)}>
              {showNewTaskForm ? 'Annuler' : '+ Tache'}
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        {tasks.length > 0 && (
          <TaskProgressBar
            total={tasks.length}
            completed={doneTasks.length}
            className="mb-4"
          />
        )}

        {/* Formulaire nouvelle tache */}
        {showNewTaskForm && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Titre de la tache..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              autoFocus
            />
            <textarea
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              placeholder="Description (optionnel)..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              rows={2}
            />
            <div className="flex gap-3">
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <OwnerSelector
              missionId={missionId}
              ownerScope={newTaskOwnerScope}
              ownerEntityId={newTaskOwnerEntityId}
              onOwnerScopeChange={setNewTaskOwnerScope}
              onOwnerEntityIdChange={setNewTaskOwnerEntityId}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={createTask}>
                Creer
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowNewTaskForm(false)}>
                Annuler
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : viewMode === 'kanban' ? (
          /* VUE KANBAN */
          <div className="grid grid-cols-3 gap-3 min-h-[300px]">
            {/* Colonne Ouvertes */}
            <div className="flex flex-col bg-blue-50 rounded-lg p-2">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-blue-200">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="font-medium text-sm text-gray-900">Ouvertes</span>
                <Badge variant="blue" className="text-xs">{openTasks.length}</Badge>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {openTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isOverdue={isOverdue(task)}
                    onChangeStatus={changeTaskStatus}
                    onSetWaiting={() => handleSetWaiting(task.id)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
                {openTasks.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-4">
                    Aucune tache ouverte
                  </p>
                )}
              </div>
            </div>

            {/* Colonne En attente */}
            <div className="flex flex-col bg-yellow-50 rounded-lg p-2">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-yellow-200">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="font-medium text-sm text-gray-900">En attente</span>
                <Badge variant="yellow" className="text-xs">{waitingTasks.length}</Badge>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {waitingTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isOverdue={isOverdue(task)}
                    onChangeStatus={changeTaskStatus}
                    onSetWaiting={() => handleSetWaiting(task.id, task.wait_reason || undefined)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
                {waitingTasks.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-4">
                    Aucune tache en attente
                  </p>
                )}
              </div>
            </div>

            {/* Colonne Terminees */}
            <div className="flex flex-col bg-green-50 rounded-lg p-2">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-green-200">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="font-medium text-sm text-gray-900">Terminees</span>
                <Badge variant="green" className="text-xs">{doneTasks.length}</Badge>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {doneTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isOverdue={false}
                    onChangeStatus={changeTaskStatus}
                    onSetWaiting={() => {}}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
                {doneTasks.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-4">
                    Aucune tache terminee
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* VUE LISTE */
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                Aucune tache pour cette mission
              </p>
            ) : (
              tasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  isOverdue={isOverdue(task)}
                  onChangeStatus={changeTaskStatus}
                  onSetWaiting={() => handleSetWaiting(task.id, task.wait_reason || undefined)}
                  onDelete={() => deleteTask(task.id)}
                />
              ))
            )}
          </div>
        )}

        <WaitReasonModal
          isOpen={waitReasonModalOpen}
          onClose={() => {
            setWaitReasonModalOpen(false);
            setWaitingTask(null);
          }}
          onSubmit={handleWaitReasonSubmit}
          initialReason={waitingTask?.reason}
        />

        <ApplyTemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          onApply={handleApplyTemplate}
          entityType="mission"
          entityId={missionId}
        />
      </div>
    </Card>
  );
}

/* Composant Carte Kanban */
interface TaskCardProps {
  task: Task;
  isOverdue: boolean;
  onChangeStatus: (taskId: string, status: TaskStatus) => void;
  onSetWaiting: () => void;
  onDelete: () => void;
}

function TaskCard({ task, isOverdue, onChangeStatus, onSetWaiting, onDelete }: TaskCardProps) {
  return (
    <div className="bg-white rounded border border-gray-200 p-2 shadow-sm text-sm">
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={task.status === 'done'}
          onChange={() => onChangeStatus(task.id, task.status === 'done' ? 'open' : 'done')}
          className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
        />
        <div className="flex-1 min-w-0">
          <p className={`font-medium leading-tight ${
            task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'
          }`}>
            {task.title}
          </p>

          {/* Owner badge */}
          {task.owner && (
            <div className="mt-1">
              <Badge
                variant={task.owner.type === 'client' ? 'yellow' : 'blue'}
                className="text-xs"
              >
                {task.owner.type === 'client' ? 'CLIENT' : 'FOURNISSEUR'} · {task.owner.nom}
              </Badge>
            </div>
          )}

          {/* Date + retard */}
          {task.due_date && (
            <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              {new Date(task.due_date).toLocaleDateString('fr-FR')}
              {isOverdue && ' (retard)'}
            </p>
          )}

          {/* Raison d'attente */}
          {task.wait_reason && task.status === 'en_attente' && (
            <p className="text-xs text-yellow-700 italic mt-1 truncate">
              {task.wait_reason}
            </p>
          )}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="flex gap-1 mt-2 pt-1 border-t border-gray-100">
        {task.status !== 'open' && (
          <button
            onClick={() => onChangeStatus(task.id, 'open')}
            className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
          >
            Ouvrir
          </button>
        )}
        {task.status !== 'en_attente' && task.status !== 'done' && (
          <button
            onClick={onSetWaiting}
            className="text-xs px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
          >
            Attendre
          </button>
        )}
        {task.status !== 'done' && (
          <button
            onClick={() => onChangeStatus(task.id, 'done')}
            className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-700 hover:bg-green-100"
          >
            Terminer
          </button>
        )}
        {!task.is_system && (
          <button
            onClick={onDelete}
            className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-700 hover:bg-red-100 ml-auto"
          >
            x
          </button>
        )}
      </div>
    </div>
  );
}

/* Composant Liste Item */
interface TaskListItemProps {
  task: Task;
  isOverdue: boolean;
  onChangeStatus: (taskId: string, status: TaskStatus) => void;
  onSetWaiting: () => void;
  onDelete: () => void;
}

function TaskListItem({ task, isOverdue, onChangeStatus, onSetWaiting, onDelete }: TaskListItemProps) {
  const statusBorder = task.status === 'done' ? 'border-l-green-500' :
                       task.status === 'en_attente' ? 'border-l-yellow-500' :
                       'border-l-blue-500';

  return (
    <div className={`border rounded p-3 bg-white border-l-4 ${statusBorder}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={task.status === 'done'}
          onChange={() => onChangeStatus(task.id, task.status === 'done' ? 'open' : 'done')}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
        />
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h4 className={`font-medium ${
              task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'
            }`}>
              {task.title}
            </h4>
            {!task.is_system && (
              <button
                onClick={onDelete}
                className="text-gray-400 hover:text-red-600 text-sm"
              >
                x
              </button>
            )}
          </div>

          {task.description && (
            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-2 items-center">
            {/* Owner badge */}
            {task.owner && (
              <Badge
                variant={task.owner.type === 'client' ? 'yellow' : 'blue'}
                className="text-xs"
              >
                {task.owner.type === 'client' ? 'CLIENT' : 'FOURNISSEUR'} · {task.owner.nom}
              </Badge>
            )}

            {task.due_date && (
              <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                {new Date(task.due_date).toLocaleDateString('fr-FR')}
                {isOverdue && ' (en retard)'}
              </span>
            )}

            {task.wait_reason && task.status === 'en_attente' && (
              <span className="text-xs text-yellow-700 italic">
                {task.wait_reason}
              </span>
            )}

            {/* Actions */}
            <div className="flex gap-1 ml-auto">
              {task.status !== 'open' && (
                <button
                  onClick={() => onChangeStatus(task.id, 'open')}
                  className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                >
                  Ouvrir
                </button>
              )}
              {task.status !== 'en_attente' && task.status !== 'done' && (
                <button
                  onClick={onSetWaiting}
                  className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                >
                  Attendre
                </button>
              )}
              {task.status !== 'done' && (
                <button
                  onClick={() => onChangeStatus(task.id, 'done')}
                  className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100"
                >
                  Terminer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
