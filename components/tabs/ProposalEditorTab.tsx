'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface Page {
  id: string;
  title: string;
  sort_order: number;
  is_visible: boolean;
  is_cover: boolean;
  content: TipTapContent;
}

interface TipTapContent {
  type: string;
  content?: TipTapNode[];
  attrs?: Record<string, unknown>;
}

interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

interface Proposal {
  id: string;
  title: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REFUSED';
  deal?: { id: string; title: string };
  client?: { id: string; nom: string };
}

interface ProposalEditorTabProps {
  proposalId: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function ProposalEditorTab({ proposalId }: ProposalEditorTabProps) {
  const { updateTabTitle, activeTabId } = useTabsStore();

  // Data state
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  // Drag & drop state
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Save as template modal state
  const [showSaveAsTemplateModal, setShowSaveAsTemplateModal] = useState(false);

  // Count visible pages for template
  const visiblePageCount = useMemo(() => {
    return pages.filter(p => p.is_visible !== false).length;
  }, [pages]);

  // ============================================================================
  // Load Data
  // ============================================================================

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        // Load proposal
        const proposalRes = await fetch(`/api/proposals/${proposalId}`);
        if (!proposalRes.ok) throw new Error('Proposition non trouvée');
        const proposalData = await proposalRes.json();
        setProposal(proposalData.data);

        // Update tab title
        if (activeTabId && proposalData.data?.title) {
          updateTabTitle(activeTabId, `Éditer: ${proposalData.data.title}`);
        }

        // Load pages
        const pagesRes = await fetch(`/api/proposals/${proposalId}/pages`);
        if (!pagesRes.ok) throw new Error('Erreur lors du chargement des pages');
        const pagesData = await pagesRes.json();
        let loadedPages: Page[] = pagesData.data || [];

        // Transform old structure to new if needed (sections/blocks -> content)
        loadedPages = loadedPages.map((page: Page & { sections?: unknown[] }) => ({
          id: page.id,
          title: page.title,
          sort_order: page.sort_order,
          is_visible: page.is_visible ?? true,
          is_cover: page.is_cover ?? false,
          content: page.content || { type: 'doc', content: [{ type: 'paragraph' }] },
        }));

        // Ensure cover page exists
        if (!loadedPages.some(p => p.is_cover)) {
          // Create cover page if doesn't exist
          const coverRes = await fetch(`/api/proposals/${proposalId}/pages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Couverture',
              is_cover: true,
              sort_order: -1,
              content: {
                type: 'doc',
                content: [
                  { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: proposalData.data?.title || 'Proposition' }] },
                  { type: 'paragraph', content: [{ type: 'text', text: proposalData.data?.client?.nom || '' }] },
                ],
              },
            }),
          });
          if (coverRes.ok) {
            const { data: coverPage } = await coverRes.json();
            loadedPages = [{ ...coverPage, is_cover: true }, ...loadedPages];
          }
        }

        // Sort pages: cover first, then by sort_order
        loadedPages.sort((a, b) => {
          if (a.is_cover) return -1;
          if (b.is_cover) return 1;
          return a.sort_order - b.sort_order;
        });

        setPages(loadedPages);

        // Select first page
        if (loadedPages.length > 0) {
          setSelectedPageId(loadedPages[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [proposalId, activeTabId, updateTabTitle]);

  // ============================================================================
  // Derived State
  // ============================================================================

  const selectedPage = pages.find(p => p.id === selectedPageId);

  // ============================================================================
  // Proposal Title
  // ============================================================================

  const updateProposalTitle = useCallback(async (title: string) => {
    if (!proposal) return;
    setProposal({ ...proposal, title });

    try {
      await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (activeTabId) {
        updateTabTitle(activeTabId, `Éditer: ${title}`);
      }
    } catch (err) {
      console.error('Update proposal title error:', err);
    }
  }, [proposal, proposalId, activeTabId, updateTabTitle]);

  // ============================================================================
  // Page Operations
  // ============================================================================

  const addPage = useCallback(async () => {
    try {
      const newSortOrder = Math.max(...pages.map(p => p.sort_order), 0) + 1;
      const res = await fetch(`/api/proposals/${proposalId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Page ${pages.filter(p => !p.is_cover).length + 1}`,
          sort_order: newSortOrder,
          is_cover: false,
          content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Nouvelle page' }] }, { type: 'paragraph' }] },
        }),
      });
      if (!res.ok) throw new Error('Erreur création page');
      const { data: newPage } = await res.json();

      setPages(prev => [...prev, { ...newPage, is_visible: true, is_cover: false }]);
      setSelectedPageId(newPage.id);
    } catch (err) {
      console.error('Add page error:', err);
    }
  }, [proposalId, pages]);

  const updatePageTitle = useCallback(async (pageId: string, title: string) => {
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, title } : p));

    try {
      await fetch(`/api/proposals/${proposalId}/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
    } catch (err) {
      console.error('Update page title error:', err);
    }
  }, [proposalId]);

  const togglePageVisibility = useCallback(async (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;

    const newVisibility = !page.is_visible;
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, is_visible: newVisibility } : p));

    try {
      await fetch(`/api/proposals/${proposalId}/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: newVisibility }),
      });
    } catch (err) {
      console.error('Toggle visibility error:', err);
    }
  }, [proposalId, pages]);

  const deletePage = useCallback(async (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page || page.is_cover) return; // Can't delete cover
    if (!confirm('Supprimer cette page ?')) return;

    try {
      await fetch(`/api/proposals/${proposalId}/pages/${pageId}`, {
        method: 'DELETE',
      });
      setPages(prev => prev.filter(p => p.id !== pageId));
      if (selectedPageId === pageId) {
        const remaining = pages.filter(p => p.id !== pageId);
        setSelectedPageId(remaining[0]?.id || null);
      }
    } catch (err) {
      console.error('Delete page error:', err);
    }
  }, [proposalId, pages, selectedPageId]);

  const updatePageContent = useCallback(async (pageId: string, content: TipTapContent) => {
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, content } : p));
    setSaveStatus('saving');

    try {
      await fetch(`/api/proposals/${proposalId}/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Update page content error:', err);
      setSaveStatus('error');
    }
  }, [proposalId]);

  const reorderPage = useCallback(async (draggedPageId: string, targetIndex: number) => {
    // Don't allow dropping before cover (index 0)
    if (targetIndex === 0) return;

    const draggedPage = pages.find(p => p.id === draggedPageId);
    if (!draggedPage || draggedPage.is_cover) return;

    // Reorder locally
    const newPages = pages.filter(p => p.id !== draggedPageId);
    newPages.splice(targetIndex, 0, draggedPage);

    // Update sort_order for all non-cover pages
    const updatedPages = newPages.map((p, i) => ({
      ...p,
      sort_order: p.is_cover ? -1 : i,
    }));

    setPages(updatedPages);

    // Save new order to backend
    try {
      // Update each page's sort_order
      for (const page of updatedPages) {
        if (!page.is_cover) {
          await fetch(`/api/proposals/${proposalId}/pages/${page.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sort_order: page.sort_order }),
          });
        }
      }
    } catch (err) {
      console.error('Reorder pages error:', err);
    }
  }, [proposalId, pages]);

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <button onClick={() => window.location.reload()} className="text-blue-600 hover:underline">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* ================================================================== */}
      {/* HEADER GLOBAL */}
      {/* ================================================================== */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm">
        <div className="flex items-center gap-4">
          {/* Editable Title */}
          {editingTitle ? (
            <input
              type="text"
              defaultValue={proposal?.title}
              autoFocus
              className="text-xl font-bold px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500"
              onBlur={(e) => {
                updateProposalTitle(e.target.value);
                setEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateProposalTitle(e.currentTarget.value);
                  setEditingTitle(false);
                }
                if (e.key === 'Escape') setEditingTitle(false);
              }}
            />
          ) : (
            <h1
              className="text-xl font-bold text-gray-900 cursor-pointer hover:text-blue-600"
              onClick={() => setEditingTitle(true)}
              title="Cliquer pour modifier"
            >
              {proposal?.title}
            </h1>
          )}

          {/* Status Badge */}
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
            proposal?.status === 'DRAFT' ? 'bg-gray-200 text-gray-700' :
            proposal?.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
            proposal?.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
            'bg-red-100 text-red-700'
          }`}>
            {proposal?.status}
          </span>

          {/* Save Status */}
          <span className={`text-sm ${
            saveStatus === 'saving' ? 'text-orange-500' :
            saveStatus === 'saved' ? 'text-green-500' :
            saveStatus === 'error' ? 'text-red-500' :
            'text-transparent'
          }`}>
            {saveStatus === 'saving' ? 'Sauvegarde...' :
             saveStatus === 'saved' ? 'Sauvegardé' :
             saveStatus === 'error' ? 'Erreur' : '-'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {visiblePageCount > 0 && (
            <button
              onClick={() => setShowSaveAsTemplateModal(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 flex items-center gap-2"
              title="Enregistrer comme template"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Template
            </button>
          )}
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50">
            Prévisualiser
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              proposal?.status === 'DRAFT'
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            disabled={proposal?.status === 'DRAFT'}
          >
            Envoyer
          </button>
        </div>
      </header>

      {/* ================================================================== */}
      {/* MAIN CONTENT - 3 COLUMNS */}
      {/* ================================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ============================================================== */}
        {/* LEFT SIDEBAR - PAGES */}
        {/* ============================================================== */}
        <aside className="w-56 bg-white border-r flex flex-col">
          <div className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pages</span>
              <div className="flex items-center gap-1">
                {/* Reorder toggle button */}
                <button
                  onClick={() => setReorderMode(!reorderMode)}
                  className={`p-1 rounded transition-colors ${
                    reorderMode
                      ? 'text-green-600 bg-green-50 hover:bg-green-100'
                      : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                  title={reorderMode ? 'Valider l\'ordre' : 'Réorganiser les pages'}
                >
                  {reorderMode ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
                {/* Add page button */}
                <button
                  onClick={addPage}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Ajouter une page"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto py-2">
            <div className="space-y-0.5">
              {pages.map((page, index) => {
                const isSelected = selectedPageId === page.id;
                const canDrag = reorderMode && !page.is_cover;
                const isDragging = draggedPageId === page.id;
                const isDropTarget = dragOverIndex === index && draggedPageId && draggedPageId !== page.id && !page.is_cover;
                return (
                  <div
                    key={page.id}
                    draggable={canDrag}
                    onDragStart={(e) => {
                      if (!canDrag) {
                        e.preventDefault();
                        return;
                      }
                      setDraggedPageId(page.id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', page.id);
                    }}
                    onDragEnd={() => {
                      setDraggedPageId(null);
                      setDragOverIndex(null);
                    }}
                    onDragOver={(e) => {
                      if (!reorderMode || page.is_cover) return;
                      e.preventDefault();
                      if (dragOverIndex !== index) {
                        setDragOverIndex(index);
                      }
                    }}
                    onDragLeave={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX;
                      const y = e.clientY;
                      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                        setDragOverIndex(null);
                      }
                    }}
                    onDrop={(e) => {
                      if (!reorderMode) return;
                      e.preventDefault();
                      if (draggedPageId && draggedPageId !== page.id) {
                        reorderPage(draggedPageId, index);
                      }
                      setDraggedPageId(null);
                      setDragOverIndex(null);
                    }}
                    className={`
                      group mx-2 px-3 py-2 rounded-md transition-all duration-150 ease-out relative
                      ${isSelected && !isDragging
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                      }
                      ${!page.is_visible && !isDragging ? 'opacity-50' : ''}
                      ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                      ${reorderMode && !page.is_cover ? 'border-l-2 border-l-blue-400' : ''}
                      ${isDragging ? 'opacity-40 scale-[0.98] shadow-lg z-10 bg-blue-100' : ''}
                    `}
                    onClick={() => !reorderMode && setSelectedPageId(page.id)}
                  >
                    {/* Drop indicator line */}
                    {isDropTarget && (
                      <div className="absolute -top-1 left-2 right-2 h-1 bg-blue-500 rounded-full shadow-sm" />
                    )}
                    <div className="flex items-center gap-2">
                      {/* Drag handle in reorder mode, or cover icon/page number */}
                      {reorderMode && !page.is_cover ? (
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/>
                        </svg>
                      ) : page.is_cover ? (
                        <span className="w-5 h-5 flex items-center justify-center text-xs font-medium text-purple-600 bg-purple-100 rounded">
                          C
                        </span>
                      ) : (
                        <span className={`w-5 h-5 flex items-center justify-center text-xs font-medium rounded ${
                          isSelected ? 'text-blue-700 bg-blue-100' : 'text-gray-500 bg-gray-100'
                        }`}>
                          {pages.filter(p => !p.is_cover).findIndex(p => p.id === page.id) + 1}
                        </span>
                      )}

                      {/* Page title or edit input */}
                      {editingPageId === page.id ? (
                        <input
                          type="text"
                          defaultValue={page.title}
                          autoFocus
                          className="flex-1 text-sm px-2 py-0.5 border rounded bg-white text-gray-900 focus:ring-1 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                          onBlur={(e) => {
                            updatePageTitle(page.id, e.target.value);
                            setEditingPageId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updatePageTitle(page.id, e.currentTarget.value);
                              setEditingPageId(null);
                            }
                            if (e.key === 'Escape') setEditingPageId(null);
                          }}
                        />
                      ) : (
                        <span className={`flex-1 text-sm truncate ${
                          isSelected ? 'text-blue-900 font-medium' : 'text-gray-700'
                        }`}>{page.title}</span>
                      )}

                      {/* Visibility indicator (always show if hidden) */}
                      {!page.is_visible && (
                        <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}

                      {/* Actions - show on hover only (hidden in reorder mode) */}
                      {!reorderMode && (
                      <div className={`flex items-center gap-0.5 transition-opacity ${
                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        {/* Visibility toggle */}
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePageVisibility(page.id); }}
                          className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
                          title={page.is_visible ? 'Masquer' : 'Afficher'}
                        >
                          {page.is_visible ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          )}
                        </button>

                        {/* Rename */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingPageId(page.id); }}
                          className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
                          title="Renommer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>

                        {/* Delete (not for cover) */}
                        {!page.is_cover && (
                          <button
                            onClick={(e) => { e.stopPropagation(); deletePage(page.id); }}
                            className="p-1 hover:bg-red-100 rounded text-gray-500 hover:text-red-600"
                            title="Supprimer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Zone de drop pour dernière position */}
              {reorderMode && draggedPageId && (
                <div
                  className={`mx-2 h-10 rounded-md transition-all duration-150 flex items-center justify-center ${
                    dragOverIndex === pages.length
                      ? 'bg-blue-100 border-2 border-dashed border-blue-400'
                      : 'border-2 border-dashed border-transparent hover:border-gray-300'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverIndex(pages.length);
                  }}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedPageId) {
                      reorderPage(draggedPageId, pages.length);
                    }
                    setDraggedPageId(null);
                    setDragOverIndex(null);
                  }}
                >
                  {dragOverIndex === pages.length && (
                    <span className="text-xs text-blue-600 font-medium">Déposer ici</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ============================================================== */}
        {/* CENTER - DOCUMENT (TipTap) - A4 Format */}
        {/* ============================================================== */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#f6f7f9]">
          {selectedPage ? (
              <PageEditor
                key={selectedPage.id}
                page={selectedPage}
                proposalTitle={proposal?.title || ''}
                clientName={proposal?.client?.nom || ''}
                onContentChange={(content) => updatePageContent(selectedPage.id, content)}
              />
            ) : (
              <div className="flex-1 overflow-auto py-8">
                <div className="flex justify-center">
                  <div className="w-[794px] min-h-[1123px] bg-white border border-gray-200 shadow-sm rounded-lg flex items-center justify-center">
                    <p className="text-gray-400">Sélectionnez une page pour commencer</p>
                  </div>
                </div>
              </div>
            )}
        </main>

      </div>

      {/* Save As Template Modal */}
      {showSaveAsTemplateModal && proposal && (
        <SaveAsTemplateModal
          proposalId={proposalId}
          proposalTitle={proposal.title}
          pageCount={visiblePageCount}
          onClose={() => setShowSaveAsTemplateModal(false)}
          onCreated={(templateName) => {
            toast.success(`Template "${templateName}" cree avec succes`);
            setShowSaveAsTemplateModal(false);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Save As Template Modal
// ============================================================================

interface SaveAsTemplateModalProps {
  proposalId: string;
  proposalTitle: string;
  pageCount: number;
  onClose: () => void;
  onCreated: (templateName: string) => void;
}

function SaveAsTemplateModal({
  proposalId,
  proposalTitle,
  pageCount,
  onClose,
  onCreated,
}: SaveAsTemplateModalProps) {
  const [name, setName] = useState(`${proposalTitle} - Template`);
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError('Le nom du template est requis');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/proposals/templates/from-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId,
          name: name.trim(),
          description: description.trim() || undefined,
          isDefault,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la creation');
        return;
      }

      onCreated(data.data.name);
    } catch (err) {
      console.error('Error creating template:', err);
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Enregistrer comme template
          </h2>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="template-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nom du template *
              </label>
              <input
                id="template-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mon template"
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label
                htmlFor="template-description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description (optionnel)
              </label>
              <textarea
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du template..."
                disabled={saving}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                disabled={saving}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Definir comme template par defaut</span>
            </label>

            <p className="text-sm text-gray-500">
              Ce template contiendra {pageCount} page{pageCount > 1 ? 's' : ''}.
            </p>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              )}
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Page Editor Component
// ============================================================================

interface PageEditorProps {
  page: Page;
  proposalTitle: string;
  clientName: string;
  onContentChange: (content: TipTapContent) => void;
}

function PageEditor({ page, proposalTitle, clientName, onContentChange }: PageEditorProps) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced save
  const handleUpdate = useCallback((json: TipTapContent) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      onContentChange(json);
    }, 700);
  }, [onContentChange]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Get content based on page type
  const content = page.is_cover && !page.content?.content?.length
    ? {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1, textAlign: 'center' }, content: [{ type: 'text', text: proposalTitle }] },
          { type: 'paragraph', attrs: { textAlign: 'center' } },
          { type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', text: clientName }] },
        ],
      }
    : page.content;

  return (
    <TipTapPageEditor
      content={content}
      onChange={handleUpdate}
      placeholder={page.is_cover ? "Titre de la proposition..." : "Commencez à rédiger cette page..."}
      coverMode={page.is_cover}
    />
  );
}

// ============================================================================
// TipTap Page Editor
// ============================================================================

interface TipTapPageEditorProps {
  content: TipTapContent;
  onChange: (json: TipTapContent) => void;
  placeholder?: string;
  coverMode?: boolean;
}

function TipTapPageEditor({ content, onChange, placeholder = 'Commencez à écrire...', coverMode = false }: TipTapPageEditorProps) {
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON() as TipTapContent);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-full px-16 py-[72px]',
      },
    },
  });

  // Get current style label
  const getCurrentStyleLabel = () => {
    if (!editor) return 'Style';
    if (editor.isActive('heading', { level: 1 })) return 'Titre 1';
    if (editor.isActive('heading', { level: 2 })) return 'Titre 2';
    if (editor.isActive('heading', { level: 3 })) return 'Titre 3';
    return 'Paragraphe';
  };

  if (!editor) {
    return (
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <div className="flex-shrink-0 flex items-center gap-1 px-4 py-2 bg-white border-b">
          <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="flex-1 overflow-auto py-8">
          <div className="flex justify-center">
            <div className="w-[794px] min-h-[1123px] bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden">
              <div className="px-16 py-[72px] animate-pulse">
                <div className="h-8 bg-gray-100 rounded w-1/3 mb-4" />
                <div className="h-4 bg-gray-100 rounded w-full mb-2" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      {/* Toolbar - fixed at top */}
      <div className="flex-shrink-0 flex items-center gap-1 px-4 py-2 bg-white border-b">
        {/* Style Dropdown */}
        <div className="relative">
          <button
            onClick={() => setStyleDropdownOpen(!styleDropdownOpen)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 min-w-[100px]"
          >
            <span>{getCurrentStyleLabel()}</span>
            <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {styleDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-20">
              <button
                onClick={() => { editor.chain().focus().setParagraph().run(); setStyleDropdownOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${!editor.isActive('heading') ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
              >
                Paragraphe
              </button>
              <button
                onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); setStyleDropdownOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-lg font-bold hover:bg-gray-50 ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
              >
                Titre 1
              </button>
              <button
                onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); setStyleDropdownOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-base font-semibold hover:bg-gray-50 ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
              >
                Titre 2
              </button>
              <button
                onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); setStyleDropdownOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-sm font-semibold hover:bg-gray-50 ${editor.isActive('heading', { level: 3 }) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
              >
                Titre 3
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Gras (Ctrl+B)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italique (Ctrl+I)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="4" x2="10" y2="4" />
            <line x1="14" y1="20" x2="5" y2="20" />
            <line x1="15" y1="4" x2="9" y2="20" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Liste à puces"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="9" y1="6" x2="20" y2="6" />
            <line x1="9" y1="12" x2="20" y2="12" />
            <line x1="9" y1="18" x2="20" y2="18" />
            <circle cx="5" cy="6" r="1" fill="currentColor" />
            <circle cx="5" cy="12" r="1" fill="currentColor" />
            <circle cx="5" cy="18" r="1" fill="currentColor" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Liste numérotée"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="10" y1="6" x2="20" y2="6" />
            <line x1="10" y1="12" x2="20" y2="12" />
            <line x1="10" y1="18" x2="20" y2="18" />
            <text x="4" y="7" fontSize="6" fill="currentColor" stroke="none">1</text>
            <text x="4" y="13" fontSize="6" fill="currentColor" stroke="none">2</text>
            <text x="4" y="19" fontSize="6" fill="currentColor" stroke="none">3</text>
          </svg>
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })}
          title="Aligner à gauche"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="14" y2="12" />
            <line x1="4" y1="18" x2="18" y2="18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })}
          title="Centrer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="5" y1="18" x2="19" y2="18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })}
          title="Aligner à droite"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="10" y1="12" x2="20" y2="12" />
            <line x1="6" y1="18" x2="20" y2="18" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Other tools */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Séparateur"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="12" x2="20" y2="12" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => {
            const url = window.prompt('URL de l\'image:');
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
          title="Image"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </ToolbarButton>
      </div>

      {/* Scrollable A4 content area */}
      <div className="flex-1 overflow-auto py-8">
        <div className="flex justify-center">
          <div className={`w-[794px] min-h-[1123px] bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden ${coverMode ? 'cover-editor' : ''}`}>
            <EditorContent editor={editor} className="h-full" />
          </div>
        </div>
      </div>

      {/* Styles */}
      <style jsx global>{`
        .ProseMirror {
          outline: none;
          min-height: 100%;
          color: #111827;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #9ca3af;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .ProseMirror h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 1rem;
          line-height: 1.2;
          color: #111827;
        }
        .cover-editor .ProseMirror h1 {
          font-size: 2.5rem;
          text-align: center;
          margin-top: 200px;
          color: #111827;
        }
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          line-height: 1.3;
          color: #1f2937;
        }
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          line-height: 1.4;
          color: #1f2937;
        }
        .ProseMirror p {
          margin-bottom: 0.75rem;
          line-height: 1.6;
          color: #374151;
        }
        .cover-editor .ProseMirror p {
          text-align: center;
          color: #4b5563;
        }
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .ProseMirror li {
          margin-bottom: 0.25rem;
        }
        .ProseMirror hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 1.5rem 0;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .ProseMirror blockquote {
          border-left: 3px solid #d1d5db;
          padding-left: 1rem;
          color: #4b5563;
          margin: 1rem 0;
          font-style: italic;
        }
        /* Text alignment */
        .ProseMirror [style*="text-align: center"],
        .ProseMirror [data-text-align="center"] {
          text-align: center;
        }
        .ProseMirror [style*="text-align: right"],
        .ProseMirror [data-text-align="right"] {
          text-align: right;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Toolbar Button
// ============================================================================

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active = false, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2.5 py-1.5 rounded text-sm font-medium transition-colors ${
        active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}

export default ProposalEditorTab;
