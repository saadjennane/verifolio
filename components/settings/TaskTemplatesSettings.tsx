'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type {
  TaskTemplateWithCounts,
  TaskTemplateWithItems,
  TemplateTargetEntityType,
  CreateTaskTemplatePayload,
  CreateTaskTemplateItemPayload,
} from '@/lib/tasks/templates';
import type { TaskOwnerScope } from '@/lib/tasks/types';

const TARGET_LABELS: Record<TemplateTargetEntityType, string> = {
  deal: 'Deals',
  mission: 'Missions',
  client: 'Clients',
};

const OWNER_LABELS: Record<TaskOwnerScope, string> = {
  me: 'Moi',
  client: 'Client',
  supplier: 'Fournisseur',
};

export function TaskTemplatesSettings() {
  const [templates, setTemplates] = useState<TaskTemplateWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<TaskTemplateWithItems | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/task-templates');
      if (!res.ok) throw new Error('Erreur lors du chargement');
      const json = await res.json();
      setTemplates(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleExpand = async (templateId: string) => {
    if (expandedTemplateId === templateId) {
      setExpandedTemplateId(null);
      setExpandedTemplate(null);
      return;
    }

    try {
      const res = await fetch(`/api/task-templates/${templateId}`);
      if (!res.ok) throw new Error('Erreur');
      const json = await res.json();
      setExpandedTemplate(json.data);
      setExpandedTemplateId(templateId);
    } catch {
      // Ignore error
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Supprimer ce template ?')) return;

    try {
      const res = await fetch(`/api/task-templates/${templateId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erreur');
      fetchTemplates();
      if (expandedTemplateId === templateId) {
        setExpandedTemplateId(null);
        setExpandedTemplate(null);
      }
    } catch {
      alert('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600">
        {error}
        <Button size="sm" onClick={fetchTemplates} className="ml-2">
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Templates de tâches</h2>
          <p className="text-sm text-muted-foreground">
            Créez des templates de tâches à appliquer sur vos missions, deals ou clients
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Nouveau template
        </Button>
      </div>

      {/* Create form */}
      {isCreating && (
        <TemplateForm
          onSave={async (payload) => {
            const res = await fetch('/api/task-templates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Erreur');
            }
            setIsCreating(false);
            fetchTemplates();
          }}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {/* Templates list */}
      {templates.length === 0 && !isCreating ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucun template créé</p>
          <Button className="mt-4" onClick={() => setIsCreating(true)}>
            Créer votre premier template
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="border rounded-lg bg-background overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleExpand(template.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {expandedTemplateId === template.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{template.name}</span>
                      {template.target_entity_type && (
                        <Badge variant="blue">
                          {TARGET_LABELS[template.target_entity_type]}
                        </Badge>
                      )}
                      {!template.is_active && (
                        <Badge variant="gray">Inactif</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {template.item_count} tâche{template.item_count !== 1 ? 's' : ''}
                      {template.max_day_offset > 0 && (
                        <> • Délai max: {template.max_day_offset} jour{template.max_day_offset !== 1 ? 's' : ''}</>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingTemplateId(template.id)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>

              {/* Expanded content */}
              {expandedTemplateId === template.id && expandedTemplate && (
                <div className="border-t px-4 py-3 bg-muted/30">
                  {template.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {template.description}
                    </p>
                  )}
                  {expandedTemplate.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucune tâche dans ce template
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {/* Group items by category */}
                      {Object.entries(
                        expandedTemplate.items.reduce((acc, item) => {
                          const cat = item.category || 'Général';
                          if (!acc[cat]) acc[cat] = [];
                          acc[cat].push(item);
                          return acc;
                        }, {} as Record<string, typeof expandedTemplate.items>)
                      ).map(([category, categoryItems]) => (
                        <div key={category}>
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            {category}
                          </div>
                          <div className="space-y-1">
                            {categoryItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 p-2 bg-background rounded border text-sm"
                              >
                                <span className="flex-1">
                                  {item.subgroup && (
                                    <span className="text-muted-foreground mr-1">[{item.subgroup}]</span>
                                  )}
                                  {item.title}
                                </span>
                                {item.day_offset > 0 && (
                                  <Badge variant="gray">J+{item.day_offset}</Badge>
                                )}
                                {item.owner_scope !== 'me' && (
                                  <Badge variant={item.owner_scope === 'client' ? 'yellow' : 'blue'}>
                                    {OWNER_LABELS[item.owner_scope]}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Edit modal */}
              {editingTemplateId === template.id && (
                <div className="border-t">
                  <TemplateForm
                    template={expandedTemplate || undefined}
                    templateId={template.id}
                    onSave={async () => {
                      setEditingTemplateId(null);
                      fetchTemplates();
                      // Refresh expanded template
                      if (expandedTemplateId === template.id) {
                        const res = await fetch(`/api/task-templates/${template.id}`);
                        if (res.ok) {
                          const json = await res.json();
                          setExpandedTemplate(json.data);
                        }
                      }
                    }}
                    onCancel={() => setEditingTemplateId(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Template Form Component
interface TemplateFormProps {
  template?: TaskTemplateWithItems;
  templateId?: string;
  onSave: (payload: CreateTaskTemplatePayload) => Promise<void>;
  onCancel: () => void;
}

function TemplateForm({ template, templateId, onSave, onCancel }: TemplateFormProps) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [targetEntityType, setTargetEntityType] = useState<TemplateTargetEntityType | ''>(
    template?.target_entity_type || ''
  );
  const [items, setItems] = useState<CreateTaskTemplateItemPayload[]>(
    template?.items.map((i) => ({
      title: i.title,
      description: i.description || undefined,
      day_offset: i.day_offset,
      sort_order: i.sort_order,
      owner_scope: i.owner_scope,
      category: i.category || 'Général',
      subgroup: i.subgroup || undefined,
    })) || []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Categories from existing items
  const existingCategories = [...new Set(items.map(i => i.category || 'Général'))];

  // New item form
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDayOffset, setNewItemDayOffset] = useState(0);
  const [newItemOwnerScope, setNewItemOwnerScope] = useState<TaskOwnerScope>('me');
  const [newItemCategory, setNewItemCategory] = useState('Général');
  const [newItemSubgroup, setNewItemSubgroup] = useState('');

  const handleAddItem = () => {
    if (!newItemTitle.trim()) return;

    setItems([
      ...items,
      {
        title: newItemTitle.trim(),
        day_offset: newItemDayOffset,
        sort_order: items.length,
        owner_scope: newItemOwnerScope,
        category: newItemCategory.trim() || 'Général',
        subgroup: newItemSubgroup.trim() || undefined,
      },
    ]);
    setNewItemTitle('');
    setNewItemDayOffset(0);
    setNewItemOwnerScope('me');
    // Keep category for next item (often adding multiple to same category)
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    setItems(newItems.map((item, i) => ({ ...item, sort_order: i })));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Le nom est requis');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (templateId) {
        // Update template
        const res = await fetch(`/api/task-templates/${templateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            target_entity_type: targetEntityType || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Erreur');
        }

        // Delete old items and create new ones
        // For simplicity, we'll use the API to add items
        // In a real app, you'd want to diff and update only changed items
        const templateRes = await fetch(`/api/task-templates/${templateId}`);
        const templateData = await templateRes.json();
        const existingItems = templateData.data?.items || [];

        // Delete existing items
        for (const item of existingItems) {
          await fetch(`/api/task-templates/${templateId}/items/${item.id}`, {
            method: 'DELETE',
          });
        }

        // Add new items
        for (const item of items) {
          await fetch(`/api/task-templates/${templateId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
        }

        await onSave({
          name: name.trim(),
          description: description.trim() || undefined,
          target_entity_type: targetEntityType || undefined,
          items,
        });
      } else {
        // Create new template with items
        await onSave({
          name: name.trim(),
          description: description.trim() || undefined,
          target_entity_type: targetEntityType || undefined,
          items,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 bg-muted/30 space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nom *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Workflow mission photo"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Pour</label>
          <select
            value={targetEntityType}
            onChange={(e) => setTargetEntityType(e.target.value as TemplateTargetEntityType | '')}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
          >
            <option value="">Tout type d&apos;entité</option>
            <option value="deal">Deals</option>
            <option value="mission">Missions</option>
            <option value="client">Clients</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description optionnelle..."
          rows={2}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none"
        />
      </div>

      {/* Items list */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Tâches ({items.length})
        </label>
        {items.length > 0 && (
          <div className="space-y-3 mb-3">
            {/* Group items by category for display */}
            {Object.entries(
              items.reduce((acc, item, idx) => {
                const cat = item.category || 'Général';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push({ item, originalIndex: idx });
                return acc;
              }, {} as Record<string, { item: CreateTaskTemplateItemPayload; originalIndex: number }[]>)
            ).map(([category, categoryItems]) => (
              <div key={category} className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  {category}
                  <span className="text-xs font-normal">({categoryItems.length})</span>
                </div>
                {categoryItems.map(({ item, originalIndex }) => (
                  <div
                    key={originalIndex}
                    className="flex items-center gap-2 p-2 bg-background rounded border text-sm"
                  >
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleMoveItem(originalIndex, 'up')}
                        disabled={originalIndex === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveItem(originalIndex, 'down')}
                        disabled={originalIndex === items.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="flex-1">
                      {item.subgroup && (
                        <span className="text-muted-foreground mr-1">[{item.subgroup}]</span>
                      )}
                      {item.title}
                    </span>
                    {(item.day_offset ?? 0) > 0 && (
                      <Badge variant="gray">J+{item.day_offset}</Badge>
                    )}
                    {item.owner_scope && item.owner_scope !== 'me' && (
                      <Badge variant={item.owner_scope === 'client' ? 'yellow' : 'blue'}>
                        {OWNER_LABELS[item.owner_scope]}
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(originalIndex)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Add item form */}
        <div className="space-y-2 p-3 bg-background rounded-lg border border-dashed">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">Titre de la tâche</label>
              <input
                type="text"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                placeholder="Nouvelle tâche..."
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              />
            </div>
            <div className="w-20">
              <label className="block text-xs text-muted-foreground mb-1">J+</label>
              <input
                type="number"
                value={newItemDayOffset}
                onChange={(e) => setNewItemDayOffset(parseInt(e.target.value) || 0)}
                min={0}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs text-muted-foreground mb-1">Responsable</label>
              <select
                value={newItemOwnerScope}
                onChange={(e) => setNewItemOwnerScope(e.target.value as TaskOwnerScope)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              >
                <option value="me">Moi</option>
                <option value="client">Client</option>
                <option value="supplier">Fournisseur</option>
              </select>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">Catégorie</label>
              <input
                type="text"
                list="categories-datalist"
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                placeholder="Ex: Administratif, Logistique..."
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              />
              <datalist id="categories-datalist">
                {existingCategories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">Sous-groupe (optionnel)</label>
              <input
                type="text"
                value={newItemSubgroup}
                onChange={(e) => setNewItemSubgroup(e.target.value)}
                placeholder="Ex: Book Test, Prédiction..."
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              />
            </div>
            <Button size="sm" onClick={handleAddItem} disabled={!newItemTitle.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Enregistrement...' : templateId ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </div>
  );
}
