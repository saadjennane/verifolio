'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { TaskTemplateWithCounts, TemplateTargetEntityType } from '@/lib/tasks/templates';
import type { TaskEntityType } from '@/lib/tasks/types';

interface ApplyTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (templateId: string, referenceDate: string) => Promise<void>;
  entityType: TaskEntityType;
  entityId: string;
}

export function ApplyTemplateModal({
  isOpen,
  onClose,
  onApply,
  entityType,
}: ApplyTemplateModalProps) {
  const [templates, setTemplates] = useState<TaskTemplateWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      setSelectedTemplateId(null);
      setReferenceDate(new Date().toISOString().split('T')[0]);
      setError(null);
    }
  }, [isOpen, entityType]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // Filtrer par target_entity_type si c'est mission, deal ou client
      const targetType: TemplateTargetEntityType | null =
        ['mission', 'deal', 'client'].includes(entityType)
          ? (entityType as TemplateTargetEntityType)
          : null;

      const url = targetType
        ? `/api/task-templates?target_entity_type=${targetType}&is_active=true`
        : '/api/task-templates?is_active=true';

      const res = await fetch(url);
      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errJson = await res.json();
          throw new Error(errJson.error || 'Erreur lors du chargement');
        }
        throw new Error(`Erreur ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();

      // Filtrer aussi les templates sans target_entity_type (universels)
      const allTemplates = json.data || [];
      const filtered = allTemplates.filter(
        (t: TaskTemplateWithCounts) => !t.target_entity_type || t.target_entity_type === entityType
      );

      setTemplates(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedTemplateId) return;

    setApplying(true);
    setError(null);

    try {
      await onApply(selectedTemplateId, referenceDate);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'application');
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-background rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Appliquer un template de tâches</h2>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement des templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun template disponible</p>
              <p className="text-sm mt-1">
                Créez des templates dans Paramètres → Templates de tâches
              </p>
            </div>
          ) : (
            <>
              {/* Template selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Choisir un template
                </label>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedTemplateId === template.id
                          ? 'bg-primary/10 border-primary'
                          : 'bg-muted/50 border-border hover:bg-muted'
                      }`}
                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {template.item_count} tâche{template.item_count !== 1 ? 's' : ''}
                        {template.max_day_offset > 0 && (
                          <> • Délai max: {template.max_day_offset} jour{template.max_day_offset !== 1 ? 's' : ''}</>
                        )}
                      </div>
                      {template.description && (
                        <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {template.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference date */}
              {selectedTemplate && selectedTemplate.max_day_offset > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    <Calendar className="w-4 h-4 inline-block mr-1.5" />
                    Date de référence
                  </label>
                  <input
                    type="date"
                    value={referenceDate}
                    onChange={(e) => setReferenceDate(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Les échéances seront calculées à partir de cette date
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={applying}>
            Annuler
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedTemplateId || applying}
          >
            {applying ? 'Application...' : 'Appliquer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
