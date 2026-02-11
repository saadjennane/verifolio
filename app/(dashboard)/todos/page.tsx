'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TaskBadgeManager } from '@/components/tasks/TaskBadgeManager';
import { TaskContext } from '@/components/tasks/TaskContext';
import { TaskActionsMenu } from '@/components/tasks/TaskActionsMenu';
import { WaitReasonModal } from '@/components/modals/WaitReasonModal';
import { TaskEditModal } from '@/components/modals/TaskEditModal';
import { EntitySelector } from '@/components/tasks/EntitySelector';

interface TaskBadge {
  id: string;
  task_id: string;
  badge: string;
  variant: 'gray' | 'blue' | 'green' | 'yellow' | 'red';
  created_at: string;
}

type TaskEntityType = 'deal' | 'mission' | 'client' | 'contact' | 'invoice';

type TaskOwnerScope = 'me' | 'client' | 'supplier';

interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: 'open' | 'en_attente' | 'done';
  entity_type: TaskEntityType | null;
  entity_id: string | null;
  is_system: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  wait_reason: string | null;
  owner_scope: TaskOwnerScope;
  owner_entity_id: string | null;
  category: string;
  subgroup: string | null;
  badges?: TaskBadge[];
  // Relations enrichies
  deal?: { id: string; title: string; client_id: string } | null;
  mission?: { id: string; title: string; client_id: string; deal_id: string | null } | null;
  client?: { id: string; nom: string } | null;
  contact?: { id: string; prenom: string; nom: string; client_id: string | null } | null;
  owner?: { id: string; nom: string; type: 'client' | 'supplier' } | null;
}

export default function TodosPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'en_attente' | 'done'>('open');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskEntityType, setNewTaskEntityType] = useState<'client' | 'deal' | 'mission' | 'contact' | ''>('');
  const [newTaskEntityId, setNewTaskEntityId] = useState('');
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [waitReasonModalOpen, setWaitReasonModalOpen] = useState(false);
  const [waitingTask, setWaitingTask] = useState<{ id: string; reason?: string } | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [filter]);

  async function loadTasks() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('status', filter);
      }

      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load tasks');

      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createTask() {
    if (!newTaskTitle.trim()) return;

    try {
      const taskData: any = {
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        due_date: newTaskDueDate || undefined,
      };

      // Ajouter le lien vers l'entité si sélectionné
      if (newTaskEntityType && newTaskEntityId) {
        taskData.entity_type = newTaskEntityType;
        taskData.entity_id = newTaskEntityId;
      }

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (!res.ok) throw new Error('Failed to create task');

      // Reset form
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDueDate('');
      setNewTaskEntityType('');
      setNewTaskEntityId('');
      setShowNewTaskForm(false);
      await loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Erreur lors de la création de la tâche');
    }
  }

  async function toggleTask(taskId: string, currentStatus: string) {
    try {
      const endpoint = currentStatus === 'done' ? 'reopen' : 'complete';
      const res = await fetch(`/api/tasks/${taskId}/${endpoint}`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to toggle task');

      await loadTasks();
    } catch (error) {
      console.error('Error toggling task:', error);
      alert('Erreur lors de la mise à jour');
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
        const errorData = await res.json();
        alert(errorData.error || 'Erreur lors de la suppression');
        return;
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

  function getStatusBorderColor(status: 'open' | 'en_attente' | 'done'): string {
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

  const openTasks = tasks.filter((t) => t.status === 'open');
  const waitingTasks = tasks.filter((t) => t.status === 'en_attente');
  const doneTasks = tasks.filter((t) => t.status === 'done');
  const overdueTasks = openTasks.filter((t) => isOverdue(t));

  return (
    <div className="p-6">
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
        <Button onClick={() => setShowNewTaskForm(!showNewTaskForm)}>
          {showNewTaskForm ? 'Annuler' : 'Nouvelle tâche'}
        </Button>
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

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Toutes ({tasks.length})
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

      {loading ? (
        <Card>
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        </Card>
      ) : tasks.length === 0 ? (
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
                        task.status === 'done' ? 'line-through text-gray-500' : ''
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
