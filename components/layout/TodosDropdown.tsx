'use client';

import { useState, useEffect, useCallback } from 'react';
import { ListTodo, Search, Check, ExternalLink, Eye, EyeOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { useUIPreferencesStore } from '@/lib/stores/ui-preferences-store';

// ============================================================================
// Types
// ============================================================================

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: 'open' | 'en_attente' | 'done';
  category: string | null;
  subgroup: string | null;
  entity_type: string | null;
  entity_id: string | null;
}

interface GroupedTasks {
  [category: string]: Task[];
}

// ============================================================================
// Helpers
// ============================================================================

function formatRelativeDate(dateStr: string | null): { text: string; overdue: boolean } | null {
  if (!dateStr) return null;

  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: 'En retard', overdue: true };
  if (diffDays === 0) return { text: 'Auj.', overdue: false };
  if (diffDays === 1) return { text: 'Demain', overdue: false };
  if (diffDays <= 7) {
    return { text: date.toLocaleDateString('fr-FR', { weekday: 'short' }), overdue: false };
  }
  return { text: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), overdue: false };
}

function groupTasksByCategory(tasks: Task[]): GroupedTasks {
  return tasks.reduce((acc, task) => {
    const cat = task.category || 'Sans catégorie';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(task);
    return acc;
  }, {} as GroupedTasks);
}

function sortTasksByDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
}

// ============================================================================
// Component
// ============================================================================

export function TodosDropdown() {
  const { openTab } = useTabsStore();
  const { showTodosBadge, toggleTodosBadge } = useUIPreferencesStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        // Filter to show only open and en_attente tasks
        const openTasks = (data.tasks || []).filter(
          (t: Task) => t.status === 'open' || t.status === 'en_attente'
        );
        setTasks(openTasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Refetch when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen, fetchTasks]);

  // Complete task
  const handleCompleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      });
      if (res.ok) {
        // Remove from local state
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  // Open todos tab
  const handleOpenTodos = () => {
    openTab({ type: 'todos', path: '/todos', title: 'Todos' });
    setIsOpen(false);
  };

  // Filter tasks by search query
  const filteredTasks = searchQuery
    ? tasks.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tasks;

  // Group and sort
  const grouped = groupTasksByCategory(filteredTasks);
  const sortedCategories = Object.keys(grouped).sort();

  // Sort tasks within each category
  sortedCategories.forEach((cat) => {
    grouped[cat] = sortTasksByDate(grouped[cat]);
  });

  // Calculate badge info
  const taskCount = tasks.length;
  const hasOverdue = tasks.some((t) => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  });

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={`
            relative flex items-center justify-center w-10 h-10 border-l border-border
            hover:bg-accent transition-colors text-muted-foreground
          `}
          title="Todos"
        >
          <ListTodo className="w-5 h-5" />
          {showTodosBadge && taskCount > 0 && (
            <span
              className={`
                absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
                flex items-center justify-center rounded-full text-[10px] font-medium
                ${hasOverdue ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}
              `}
            >
              {taskCount > 99 ? '99+' : taskCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-hidden flex flex-col">
        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/50 border-0 rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Tasks list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {searchQuery ? 'Aucun résultat' : 'Aucune tâche à faire'}
            </div>
          ) : (
            sortedCategories.map((category, idx) => (
              <div key={category}>
                {idx > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span className="truncate">{category}</span>
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                    {grouped[category].length}
                  </span>
                </DropdownMenuLabel>
                {grouped[category].map((task) => {
                  const dateInfo = formatRelativeDate(task.due_date);
                  return (
                    <DropdownMenuItem
                      key={task.id}
                      className="flex items-start gap-2 py-2 cursor-pointer"
                      onSelect={(e) => e.preventDefault()}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={(e) => handleCompleteTask(task.id, e)}
                        className="mt-0.5 w-4 h-4 rounded-full border border-muted-foreground/40 hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-colors flex-shrink-0"
                      >
                        <Check className="w-2.5 h-2.5 opacity-0 hover:opacity-50 text-primary" />
                      </button>

                      {/* Task info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Date */}
                      {dateInfo && (
                        <span
                          className={`
                            text-xs flex-shrink-0
                            ${dateInfo.overdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}
                          `}
                        >
                          {dateInfo.text}
                        </span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleOpenTodos}
          className="flex items-center gap-2 text-sm font-medium text-primary cursor-pointer"
        >
          <ExternalLink className="w-4 h-4" />
          Voir tous les todos
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            toggleTodosBadge();
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer"
        >
          {showTodosBadge ? (
            <>
              <EyeOff className="w-4 h-4" />
              Masquer le badge
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Afficher le badge
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
