'use client';

import { useState, useEffect } from 'react';
import { Plus, Pin, Search, StickyNote } from 'lucide-react';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { NOTE_COLORS } from '@/lib/notes/types';
import type { NoteListItem } from '@/lib/notes/types';

// ============================================================================
// Component
// ============================================================================

export function NotesListTab() {
  const { openTab } = useTabsStore();
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    setLoading(true);
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      setNotes(data.notes || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateNote = () => {
    openTab({
      type: 'new-note',
      path: '/notes/new',
      title: 'Nouvelle note',
    });
  };

  const handleOpenNote = (note: NoteListItem) => {
    openTab({
      type: 'note',
      path: `/notes/${note.id}`,
      title: note.title,
      entityId: note.id,
    });
  };

  // Filter notes by search query
  const filteredNotes = notes.filter((note) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.content?.toLowerCase().includes(query)
    );
  });

  // Separate pinned and unpinned notes
  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.pinned);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <StickyNote className="w-6 h-6 text-yellow-500" />
            <h1 className="text-xl font-semibold text-gray-900">Notes</h1>
            <span className="text-sm text-gray-500">({notes.length})</span>
          </div>
          <button
            onClick={handleCreateNote}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle note
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans les notes..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-auto p-6">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12">
            <StickyNote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {searchQuery ? 'Aucune note trouvée' : 'Aucune note pour le moment'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleCreateNote}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Créer votre première note
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pinned notes */}
            {pinnedNotes.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Pin className="w-3 h-3" />
                  Épinglées
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pinnedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onClick={() => handleOpenNote(note)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other notes */}
            {unpinnedNotes.length > 0 && (
              <div>
                {pinnedNotes.length > 0 && (
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Autres notes
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unpinnedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onClick={() => handleOpenNote(note)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Note Card
// ============================================================================

interface NoteCardProps {
  note: NoteListItem;
  onClick: () => void;
}

function NoteCard({ note, onClick }: NoteCardProps) {
  const colorConfig = NOTE_COLORS[note.color as keyof typeof NOTE_COLORS] || NOTE_COLORS.gray;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Get preview text (first 100 chars of content)
  const preview = note.content?.slice(0, 100) || '';

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-4 rounded-lg border-2 transition-all hover:shadow-md
        ${colorConfig.border} ${colorConfig.bg} hover:border-gray-300
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-gray-900 line-clamp-1">{note.title}</h3>
        {note.pinned && <Pin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
      </div>

      {preview && (
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{preview}...</p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{formatDate(note.updated_at)}</span>
        {note.link_count > 0 && (
          <span className="px-1.5 py-0.5 bg-white/50 rounded">
            {note.link_count} lien{note.link_count > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </button>
  );
}
