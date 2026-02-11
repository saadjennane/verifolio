'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { NoteEditor, NoteLinkPicker } from '@/components/notes';
import { NOTE_COLORS } from '@/lib/notes/types';
import type { NoteEntityType, LinkedEntity, TipTapContent } from '@/lib/notes/types';
import { toast } from 'sonner';
import { Palette } from 'lucide-react';

// ============================================================================
// Component
// ============================================================================

export function NewNoteTab() {
  const { closeTab, openTab, activeTabId, updateTabTitle } = useTabsStore();

  const [title, setTitle] = useState('Sans titre');
  const [content, setContent] = useState<TipTapContent>({ type: 'doc', content: [{ type: 'paragraph' }] });
  const [color, setColor] = useState('gray');
  const [linkedEntities, setLinkedEntities] = useState<LinkedEntity[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Track if note has been created
  const noteIdRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-create note on first edit
  const createOrUpdateNote = useCallback(async () => {
    // Don't save if content is empty
    const plainText = extractPlainText(content);
    if (!plainText.trim() && title === 'Sans titre') return;

    setSaving(true);

    try {
      if (!noteIdRef.current) {
        // Create new note
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content: plainText,
            content_json: content,
            color,
            links: linkedEntities.map((e) => ({
              entity_type: e.type,
              entity_id: e.id,
            })),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          noteIdRef.current = data.note.id;

          // Update tab to be the actual note
          if (activeTabId) {
            closeTab(activeTabId);
            openTab({
              type: 'note',
              path: `/notes/${data.note.id}`,
              title: title,
              entityId: data.note.id,
            });
          }
        }
      } else {
        // Update existing note
        await fetch(`/api/notes/${noteIdRef.current}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content: plainText,
            content_json: content,
            color,
          }),
        });
      }
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }, [title, content, color, linkedEntities, activeTabId, closeTab, openTab]);

  // Trigger auto-save
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      createOrUpdateNote();
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, createOrUpdateNote]);

  // Update tab title when title changes
  useEffect(() => {
    if (activeTabId && title) {
      updateTabTitle(activeTabId, title || 'Nouvelle note');
    }
  }, [title, activeTabId, updateTabTitle]);

  // Add link (will be saved when note is created)
  const handleAddLink = async (entityType: NoteEntityType, entityId: string) => {
    // Fetch entity title
    const endpoint = getEntityEndpoint(entityType);
    try {
      const res = await fetch(`${endpoint}/${entityId}`);
      const data = await res.json();
      const entityTitle = extractEntityTitle(entityType, data);

      setLinkedEntities((prev) => [
        ...prev,
        { type: entityType, id: entityId, title: entityTitle },
      ]);
    } catch {
      setLinkedEntities((prev) => [
        ...prev,
        { type: entityType, id: entityId, title: entityId.slice(0, 8) },
      ]);
    }
  };

  // Remove link
  const handleRemoveLink = (entityType: NoteEntityType, entityId: string) => {
    setLinkedEntities((prev) =>
      prev.filter((e) => !(e.type === entityType && e.id === entityId))
    );
  };

  // Change color
  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    setShowColorPicker(false);
  };

  const colorConfig = NOTE_COLORS[color as keyof typeof NOTE_COLORS] || NOTE_COLORS.gray;

  return (
    <div className={`h-full flex flex-col ${colorConfig.bg}`}>
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          {/* Title input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de la note..."
            className="flex-1 text-xl font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0"
            autoFocus
          />

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Save status */}
            <span className="text-xs text-gray-400">
              {saving ? 'Enregistrement...' : noteIdRef.current ? 'Enregistré' : 'Brouillon'}
            </span>

            {/* Color picker */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                title="Couleur"
              >
                <Palette className="w-4 h-4" />
              </button>
              {showColorPicker && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowColorPicker(false)}
                  />
                  <div className="absolute top-full right-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 flex gap-1">
                    {Object.entries(NOTE_COLORS).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => handleColorChange(key)}
                        className={`
                          w-6 h-6 rounded-full border-2 transition-transform hover:scale-110
                          ${config.border} ${config.bg}
                          ${color === key ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                        `}
                        title={config.label}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Links */}
        <NoteLinkPicker
          linkedEntities={linkedEntities}
          onAdd={handleAddLink}
          onRemove={handleRemoveLink}
        />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <NoteEditor
            content={content}
            onChange={setContent}
            placeholder="Commencez à écrire votre note..."
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function extractPlainText(content: TipTapContent): string {
  if (!content?.content) return '';

  function extractFromNode(node: unknown): string {
    if (!node || typeof node !== 'object') return '';

    const n = node as { type?: string; text?: string; content?: unknown[] };

    if (n.type === 'text' && n.text) {
      return n.text;
    }

    if (n.content && Array.isArray(n.content)) {
      return n.content.map(extractFromNode).join('');
    }

    return '';
  }

  return content.content.map(extractFromNode).join('\n').trim();
}

function getEntityEndpoint(type: NoteEntityType): string {
  const endpoints: Record<NoteEntityType, string> = {
    deal: '/api/deals',
    mission: '/api/missions',
    proposal: '/api/proposals',
    brief: '/api/briefs',
    client: '/api/clients',
    contact: '/api/contacts',
    invoice: '/api/invoices',
    quote: '/api/quotes',
    review: '/api/reviews',
    task: '/api/tasks',
    supplier: '/api/suppliers',
  };
  return endpoints[type];
}

function extractEntityTitle(type: NoteEntityType, data: Record<string, unknown>): string {
  const item = data.data || data.deal || data.mission || data.proposal ||
    data.brief || data.client || data.contact || data.invoice ||
    data.quote || data.review || data.task || data.supplier || data;

  if (!item || typeof item !== 'object') return 'Sans titre';

  const i = item as Record<string, unknown>;

  switch (type) {
    case 'client':
    case 'contact':
    case 'supplier':
      return (i.nom as string) || (i.name as string) || 'Sans nom';
    case 'invoice':
    case 'quote':
      return (i.numero as string) || (i.number as string) || 'Sans numéro';
    default:
      return (i.title as string) || (i.nom as string) || 'Sans titre';
  }
}
