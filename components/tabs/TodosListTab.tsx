'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TaskBadgeManager } from '@/components/tasks/TaskBadgeManager';
import { TaskContext } from '@/components/tasks/TaskContext';
import { TaskActionsMenu } from '@/components/tasks/TaskActionsMenu';
import { WaitReasonModal } from '@/components/modals/WaitReasonModal';
import { TaskEditModal } from '@/components/modals/TaskEditModal';
import { EntitySelector } from '@/components/tasks/EntitySelector';
import { OwnerSelector } from '@/components/tasks/OwnerSelector';
import { enrichTasksWithRelations } from '@/lib/tasks/client-tasks';
import type { Task, TaskStatus, TaskOwnerScope } from '@/lib/tasks/types';

type ViewMode = 'list' | 'kanban';

export function TodosListTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'en_attente' | 'done'>('open');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskEntityType, setNewTaskEntityType] = useState<'client' | 'deal' | 'mission' | 'contact' | ''>('');
  const [newTaskEntityId, setNewTaskEntityId] = useState('');
  const [newTaskOwnerScope, setNewTaskOwnerScope] = useState<TaskOwnerScope>('me');
  const [newTaskOwnerEntityId, setNewTaskOwnerEntityId] = useState<string | null>(null);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [waitReasonModalOpen, setWaitReasonModalOpen] = useState(false);
  const [waitingTask, setWaitingTask] = useState<{ id: string; reason?: string } | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [filter, viewMode]);

  async function loadTasks() {
    setLoading(true);
    try {
      const supabase = createClient();

      let query = supabase
        .from('tasks')
        .select(`
          *,
          badges:task_badges(*)
        `)
        .order('created_at', { ascending: false });

      // En mode Kanban, toujours charger toutes les tâches
      if (viewMode === 'list' && filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading tasks:', error);
      } else {
        // Enrichir les tasks avec les relations hiérarchiques
        const tasksData = data as Task[] || [];
        const enrichedTasks = await enrichTasksWithRelations(tasksData);
        setAllTasks(enrichedTasks);

        // En mode liste, filtrer selon le filtre actif
        if (viewMode === 'list' && filter !== 'all') {
          setTasks(enrichedTasks.filter(t => t.status === filter));
        } else {
          setTasks(enrichedTasks);
        }
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
        owner_scope: newTaskOwnerScope,
        owner_entity_id: newTaskOwnerEntityId,
      };

      // Ajouter le lien vers l'entité si sélectionné
      if (newTaskEntityType && newTaskEntityId) {
        taskData.entity_type = newTaskEntityType;
        taskData.entity_id = newTaskEntityId;
      }

      const { error } = await supabase
        .from('tasks')
        .insert(taskData);

      if (error) throw new Error(error.message);

      // Reset form
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDueDate('');
      setNewTaskEntityType('');
      setNewTaskEntityId('');
      setNewTaskOwnerScope('me');
      setNewTaskOwnerEntityId(null);
      setShowNewTaskForm(false);
      await loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Erreur lors de la création de la tâche');
    }
  }

  // Reset owner when entity type changes away from mission
  useEffect(() => {
    if (newTaskEntityType !== 'mission') {
      setNewTaskOwnerScope('me');
      setNewTaskOwnerEntityId(null);
    }
  }, [newTaskEntityType]);

  async function toggleTask(taskId: string, currentStatus: string) {
    try {
      const supabase = createClient();
      const newStatus = currentStatus === 'done' ? 'open' : 'done';
      const updateData: any = { status: newStatus };

      if (newStatus === 'done') {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw new Error(error.message);

      await loadTasks();
    } catch (error) {
      console.error('Error toggling task:', error);
      alert('Erreur lors de la mise à jour');
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

      // Vider wait_reason si on quitte en_attente
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

  function handleOpenEditModal(task: Task) {
    setEditingTask(task);
    setShowEditModal(true);
  }

  function handleCloseEditModal() {
    setEditingTask(null);
    setShowEditModal(false);
  }

  async function handleSaveTask(updatedTask: Task) {
    await loadTasks();
    handleCloseEditModal();
  }

  function getStatusBorderColor(status: TaskStatus): string {
    switch (status) {
      case 'open':
        return 'border-l-blue-500';
      case 'en_attente':
        return 'border-l-yellow-500';
      case 'done':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-300';
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function isOverdue(task: Task) {
    if (!task.due_date || task.status === 'done') return false;
    const today = new Date().toISOString().split('T')[0];
    return task.due_date < today;
  }

  // Utiliser allTasks pour les compteurs globaux (toujours à jour)
  const openTasks = allTasks.filter((t) => t.status === 'open');
  const waitingTasks = allTasks.filter((t) => t.status === 'en_attente');
  const doneTasks = allTasks.filter((t) => t.status === 'done');
  const overdueTasks = openTasks.filter((t) => isOverdue(t));

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tâches</h1>
          <div className="flex gap-2 mt-2">
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
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Liste
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Kanban
            </button>
          </div>
          <Button onClick={() => setShowNewTaskForm(!showNewTaskForm)}>
            {showNewTaskForm ? 'Annuler' : 'Nouvelle tâche'}
          </Button>
        </div>
      </div>

      {showNewTaskForm && (
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Créer une tâche</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Ex: Appeler le client"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description / Notes (optionnel)
                </label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Détails supplémentaires sur cette tâche..."
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date d'échéance (optionnel)
                </label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <EntitySelector
                entityType={newTaskEntityType}
                entityId={newTaskEntityId}
                onEntityTypeChange={setNewTaskEntityType}
                onEntityIdChange={setNewTaskEntityId}
              />
              {/* Sélecteur "Dépend de" - uniquement pour les tâches liées à une mission */}
              {newTaskEntityType === 'mission' && newTaskEntityId && (
                <OwnerSelector
                  missionId={newTaskEntityId}
                  ownerScope={newTaskOwnerScope}
                  ownerEntityId={newTaskOwnerEntityId}
                  onOwnerScopeChange={setNewTaskOwnerScope}
                  onOwnerEntityIdChange={setNewTaskOwnerEntityId}
                />
              )}
              <div className="flex gap-2">
                <Button onClick={createTask}>Créer</Button>
                <Button variant="outline" onClick={() => setShowNewTaskForm(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Vue Liste: Filtres */}
      {viewMode === 'list' && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Toutes ({allTasks.length})
          </button>
          <button
            onClick={() => setFilter('open')}
            className={`px-4 py-2 rounded ${
              filter === 'open' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Ouvertes ({openTasks.length})
          </button>
          <button
            onClick={() => setFilter('en_attente')}
            className={`px-4 py-2 rounded ${
              filter === 'en_attente' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            En attente ({waitingTasks.length})
          </button>
          <button
            onClick={() => setFilter('done')}
            className={`px-4 py-2 rounded ${
              filter === 'done' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Terminées ({doneTasks.length})
          </button>
        </div>
      )}

      {loading ? (
        <Card>
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        </Card>
      ) : viewMode === 'kanban' ? (
        /* VUE KANBAN */
        <div className="grid grid-cols-3 gap-4 h-[calc(100vh-280px)]">
          {/* Colonne Ouvertes */}
          <div className="flex flex-col bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-200">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <h3 className="font-semibold text-gray-900">Ouvertes</h3>
              <Badge variant="blue">{openTasks.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {openTasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTask(task.id, task.status)}
                  onEdit={() => handleOpenEditModal(task)}
                  onDelete={() => deleteTask(task.id)}
                  onSetWaiting={() => handleSetWaiting(task.id)}
                  onChangeStatus={changeTaskStatus}
                  isOverdue={isOverdue(task)}
                />
              ))}
              {openTasks.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Aucune tâche ouverte
                </p>
              )}
            </div>
          </div>

          {/* Colonne En attente */}
          <div className="flex flex-col bg-yellow-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-yellow-200">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <h3 className="font-semibold text-gray-900">En attente</h3>
              <Badge variant="yellow">{waitingTasks.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {waitingTasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTask(task.id, task.status)}
                  onEdit={() => handleOpenEditModal(task)}
                  onDelete={() => deleteTask(task.id)}
                  onSetWaiting={() => handleSetWaiting(task.id, task.wait_reason || undefined)}
                  onChangeStatus={changeTaskStatus}
                  isOverdue={isOverdue(task)}
                />
              ))}
              {waitingTasks.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Aucune tâche en attente
                </p>
              )}
            </div>
          </div>

          {/* Colonne Terminées */}
          <div className="flex flex-col bg-green-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-green-200">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <h3 className="font-semibold text-gray-900">Terminées</h3>
              <Badge variant="green">{doneTasks.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {doneTasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTask(task.id, task.status)}
                  onEdit={() => handleOpenEditModal(task)}
                  onDelete={() => deleteTask(task.id)}
                  onSetWaiting={() => {}}
                  onChangeStatus={changeTaskStatus}
                  isOverdue={false}
                />
              ))}
              {doneTasks.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Aucune tâche terminée
                </p>
              )}
            </div>
          </div>
        </div>
      ) : tasks.length === 0 ? (
        /* VUE LISTE - État vide */
        <Card>
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">
              {filter === 'open' && 'Aucune tâche ouverte'}
              {filter === 'en_attente' && 'Aucune tâche en attente'}
              {filter === 'done' && 'Aucune tâche terminée'}
              {filter === 'all' && 'Aucune tâche'}
            </p>
            {filter === 'open' && (
              <Button onClick={() => setShowNewTaskForm(true)}>
                Créer une tâche
              </Button>
            )}
          </div>
        </Card>
      ) : (
        /* VUE LISTE */
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`border rounded p-3 hover:shadow-sm transition-shadow bg-white border-l-4 ${getStatusBorderColor(task.status)}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={task.status === 'done'}
                  onChange={() => toggleTask(task.id, task.status)}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3
                      className={`font-medium ${
                        task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'
                      }`}
                    >
                      {task.title}
                    </h3>
                    {!task.is_system && (
                      <TaskActionsMenu
                        task={task}
                        onEdit={() => handleOpenEditModal(task)}
                        onDelete={() => deleteTask(task.id)}
                      />
                    )}
                  </div>

                  {/* Quick actions section */}
                  <div className="mt-2 space-y-1">
                    {/* Due date prominent */}
                    {task.due_date ? (
                      <div className={`text-sm flex items-center gap-1 ${
                        new Date(task.due_date) < new Date() && task.status !== 'done'
                          ? 'text-red-600 font-medium'
                          : 'text-gray-600'
                      }`}>
                        📅 {new Date(task.due_date).toLocaleDateString('fr-FR')}
                        {new Date(task.due_date) < new Date() && task.status !== 'done' && (
                          <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded ml-1">
                            EN RETARD
                          </span>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenEditModal(task)}
                        className="text-sm text-gray-400 hover:text-blue-600 flex items-center gap-1"
                      >
                        📅 Ajouter une date
                      </button>
                    )}

                    {/* Description or quick add */}
                    {task.description ? (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {task.description}
                      </p>
                    ) : (
                      <button
                        onClick={() => handleOpenEditModal(task)}
                        className="text-sm text-gray-400 hover:text-blue-600 flex items-center gap-1"
                      >
                        📝 Ajouter une note
                      </button>
                    )}

                    {/* Entity link or quick link */}
                    {!task.entity_type && !task.entity_id && (
                      <button
                        onClick={() => handleOpenEditModal(task)}
                        className="text-sm text-gray-400 hover:text-blue-600 flex items-center gap-1"
                      >
                        🔗 Lier à une entité
                      </button>
                    )}
                  </div>

                  {/* Wait reason */}
                  {task.wait_reason && (
                    <div className="flex items-center gap-2 mt-2">
                      <p className={`text-sm italic ${
                        task.status === 'en_attente'
                          ? 'text-yellow-700'
                          : 'text-gray-500 line-through'
                      }`}>
                        ⏸️ {task.wait_reason}
                      </p>
                      {task.status === 'en_attente' && (
                        <button
                          onClick={() => handleSetWaiting(task.id, task.wait_reason || undefined)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                          title="Modifier la raison d'attente"
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  )}

                  {/* Badges and context */}
                  <div className="flex gap-2 mt-2 flex-wrap items-center">
                    {task.is_system && (
                      <Badge variant="blue">Automatique</Badge>
                    )}
                    {task.badges?.map((badge) => (
                      <Badge key={badge.id} variant={badge.variant as any}>
                        {badge.badge}
                      </Badge>
                    ))}

                    {/* Contexte hiérarchique */}
                    <TaskContext task={task} />

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-auto">
                      <TaskBadgeManager
                        taskId={task.id}
                        currentBadges={task.badges || []}
                        onUpdate={loadTasks}
                      />
                      {task.status === 'open' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetWaiting(task.id);
                          }}
                          className="text-xs text-gray-500 hover:text-blue-600"
                          title="Mettre en attente"
                        >
                          ⏸️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
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

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          onSave={handleSaveTask}
        />
      )}
    </div>
  );
}

/* Composant Carte Kanban */
interface KanbanCardProps {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetWaiting: () => void;
  onChangeStatus: (taskId: string, status: TaskStatus) => void;
  isOverdue: boolean;
}

function KanbanCard({
  task,
  onToggle,
  onEdit,
  onDelete,
  onSetWaiting,
  onChangeStatus,
  isOverdue,
}: KanbanCardProps) {
  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
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
        <div className="mt-2">
          <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
            EN RETARD
          </span>
        </div>
      )}

      {/* Date d'échéance */}
      {task.due_date && (
        <p className={`text-xs mt-2 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
          📅 {new Date(task.due_date).toLocaleDateString('fr-FR')}
        </p>
      )}

      {/* Raison d'attente */}
      {task.wait_reason && task.status === 'en_attente' && (
        <p className="text-xs text-yellow-700 italic mt-2 line-clamp-2">
          ⏸️ {task.wait_reason}
        </p>
      )}

      {/* Description courte */}
      {task.description && (
        <p className="text-xs text-gray-500 mt-2 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Contexte (entité liée) */}
      {task.entity_type && (
        <div className="mt-2">
          <TaskContext task={task} />
        </div>
      )}

      {/* Badges */}
      {task.badges && task.badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.badges.slice(0, 2).map((badge) => (
            <Badge key={badge.id} variant={badge.variant as any} className="text-xs">
              {badge.badge}
            </Badge>
          ))}
          {task.badges.length > 2 && (
            <span className="text-xs text-gray-500">+{task.badges.length - 2}</span>
          )}
        </div>
      )}

      {/* Actions rapides de changement de statut */}
      <div className="flex gap-1 mt-3 pt-2 border-t border-gray-100">
        {task.status !== 'open' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChangeStatus(task.id, 'open');
            }}
            className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
            title="Réouvrir"
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
            className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
            title="Mettre en attente"
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
            className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100"
            title="Terminer"
          >
            Terminer
          </button>
        )}
        {!task.is_system && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Supprimer cette tâche ?')) {
                onDelete();
              }
            }}
            className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 ml-auto"
            title="Supprimer"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
