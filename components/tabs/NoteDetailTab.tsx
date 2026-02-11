'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Pin, Trash2, Download, Palette } from 'lucide-react';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { NoteEditor, NoteLinkPicker, NoteAIActions } from '@/components/notes';
import { NOTE_COLORS } from '@/lib/notes/types';
import type { NoteWithLinks, NoteEntityType, LinkedEntity, TipTapContent } from '@/lib/notes/types';
import { toast } from 'sonner';

interface NoteDetailTabProps {
  noteId: string;
}

// ============================================================================
// Component
// ============================================================================

export function NoteDetailTab({ noteId }: NoteDetailTabProps) {
  const { closeTab, activeTabId, updateTabTitle } = useTabsStore();

  const [note, setNote] = useState<NoteWithLinks | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Edit state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<TipTapContent>({ type: 'doc', content: [{ type: 'paragraph' }] });
  const [linkedEntities, setLinkedEntities] = useState<LinkedEntity[]>([]);

  // Auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  // Load note
  useEffect(() => {
    loadNote();
  }, [noteId]);

  async function loadNote() {
    setLoading(true);
    try {
      const res = await fetch(`/api/notes/${noteId}`);
      const data = await res.json();

      if (res.ok && data.note) {
        setNote(data.note);
        setTitle(data.note.title);
        setContent(data.note.content_json || { type: 'doc', content: [{ type: 'paragraph' }] });
        setLinkedEntities(data.note.linked_entities || []);
        lastSavedRef.current = JSON.stringify({
          title: data.note.title,
          content_json: data.note.content_json,
        });
      }
    } catch (error) {
      console.error('Error loading note:', error);
    } finally {
      setLoading(false);
    }
  }

  // Auto-save logic
  const saveNote = useCallback(async () => {
    if (!note) return;

    const currentState = JSON.stringify({ title, content_json: content });
    if (currentState === lastSavedRef.current) return;

    setSaving(true);
    try {
      // Extract plain text from TipTap content
      const plainText = extractPlainText(content);

      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: plainText,
          content_json: content,
        }),
      });

      if (res.ok) {
        lastSavedRef.current = currentState;
        // Update tab title
        if (activeTabId) {
          updateTabTitle(activeTabId, title);
        }
      }
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setSaving(false);
    }
  }, [note, noteId, title, content, activeTabId, updateTabTitle]);

  // Trigger auto-save on changes
  useEffect(() => {
    if (loading || !note) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveNote();
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, loading, note, saveNote]);

  // Toggle pin
  const handleTogglePin = async () => {
    if (!note) return;

    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !note.pinned }),
      });

      if (res.ok) {
        setNote({ ...note, pinned: !note.pinned });
        toast.success(note.pinned ? 'Note désépinglée' : 'Note épinglée');
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  // Change color
  const handleColorChange = async (color: string) => {
    if (!note) return;

    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color }),
      });

      if (res.ok) {
        setNote({ ...note, color });
        setShowColorPicker(false);
      }
    } catch (error) {
      console.error('Error changing color:', error);
    }
  };

  // Delete note
  const handleDelete = async () => {
    if (!confirm('Supprimer cette note ?')) return;

    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });

      if (res.ok) {
        toast.success('Note supprimée');
        if (activeTabId) {
          closeTab(activeTabId);
        }
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    try {
      const res = await fetch(`/api/notes/${noteId}/pdf`);

      if (!res.ok) throw new Error('Erreur lors de la génération du PDF');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'note'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('PDF téléchargé');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  // Add link
  const handleAddLink = async (entityType: NoteEntityType, entityId: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId }),
      });

      if (res.ok) {
        // Reload note to get updated links with titles
        loadNote();
        toast.success('Lien ajouté');
      }
    } catch (error) {
      console.error('Error adding link:', error);
    }
  };

  // Remove link
  const handleRemoveLink = async (entityType: NoteEntityType, entityId: string) => {
    try {
      const res = await fetch(
        `/api/notes/${noteId}/links?entity_type=${entityType}&entity_id=${entityId}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        setLinkedEntities((prev) =>
          prev.filter((e) => !(e.type === entityType && e.id === entityId))
        );
        toast.success('Lien supprimé');
      }
    } catch (error) {
      console.error('Error removing link:', error);
    }
  };

  // Handle AI action result
  const handleAIResult = (action: string, result: string) => {
    // For now, append the result to the note content
    // You could also replace or show in a modal
    const newContent: TipTapContent = {
      type: 'doc',
      content: [
        ...(content.content || []),
        { type: 'horizontalRule' },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: `Résultat IA: ${action}` }] },
        { type: 'paragraph', content: [{ type: 'text', text: result }] },
      ],
    };
    setContent(newContent);
    toast.success('Transformation appliquée');
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">Note non trouvée</p>
      </div>
    );
  }

  const colorConfig = NOTE_COLORS[note.color as keyof typeof NOTE_COLORS] || NOTE_COLORS.gray;

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
          />

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Save status */}
            <span className="text-xs text-gray-400">
              {saving ? 'Enregistrement...' : 'Enregistré'}
            </span>

            {/* AI Actions */}
            <NoteAIActions
              noteContent={extractPlainText(content)}
              onAction={handleAIResult}
            />

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
                          ${note.color === key ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                        `}
                        title={config.label}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Pin */}
            <button
              onClick={handleTogglePin}
              className={`p-2 rounded-md transition-colors ${
                note.pinned
                  ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title={note.pinned ? 'Désépingler' : 'Épingler'}
            >
              <Pin className="w-4 h-4" />
            </button>

            {/* Download PDF */}
            <button
              onClick={handleDownloadPDF}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
              title="Télécharger en PDF"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Delete */}
            <button
              onClick={handleDelete}
              className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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
            autoFocus
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
