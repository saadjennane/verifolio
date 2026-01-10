'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button, Badge } from '@/components/ui';
import { BriefQuestionBlock } from './BriefQuestionBlock';
import { BriefPreview } from './BriefPreview';
import { SaveAsTemplateModal } from './SaveAsTemplateModal';
import type {
  BriefWithDetails,
  BriefQuestion,
  BriefQuestionType,
  QuestionConfig,
} from '@/lib/briefs/types';
import { BRIEF_STATUS_LABELS, BRIEF_STATUS_VARIANTS, QUESTION_TYPE_LABELS, QUESTION_TYPE_ICONS } from '@/lib/briefs/types';

interface BriefEditorProps {
  brief: BriefWithDetails;
  onSave: (brief: Partial<BriefWithDetails>) => Promise<void>;
  onSend: () => Promise<void>;
  onClose?: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function BriefEditor({ brief, onSave, onSend, onClose }: BriefEditorProps) {
  const [title, setTitle] = useState(brief.title);
  const [description, setDescription] = useState(brief.description || '');
  const [questions, setQuestions] = useState<BriefQuestion[]>(brief.questions || []);
  const [isSending, setIsSending] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [draggingQuestionId, setDraggingQuestionId] = useState<string | null>(null);

  const isEditable = brief.status === 'DRAFT';
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef({ title: brief.title, description: brief.description || '', questions: brief.questions });

  // Check if there are unsaved changes
  const hasChanges = title !== lastSavedRef.current.title ||
    description !== lastSavedRef.current.description ||
    JSON.stringify(questions) !== JSON.stringify(lastSavedRef.current.questions);

  // Handle save
  const handleSave = useCallback(async () => {
    const currentTitle = title;
    const currentDescription = description;
    const currentQuestions = questions;

    // Check if anything changed since last save
    if (currentTitle === lastSavedRef.current.title &&
        currentDescription === lastSavedRef.current.description &&
        JSON.stringify(currentQuestions) === JSON.stringify(lastSavedRef.current.questions)) {
      return;
    }

    setSaveStatus('saving');
    try {
      await onSave({ title: currentTitle, description: currentDescription, questions: currentQuestions });
      lastSavedRef.current = { title: currentTitle, description: currentDescription, questions: currentQuestions };
      setSaveStatus('saved');
      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save brief:', error);
      setSaveStatus('error');
    }
  }, [title, description, questions, onSave]);

  // Auto-save with debounce
  useEffect(() => {
    if (!isEditable) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Check if there are changes
    if (title === lastSavedRef.current.title &&
        description === lastSavedRef.current.description &&
        JSON.stringify(questions) === JSON.stringify(lastSavedRef.current.questions)) {
      return;
    }

    // Set new timeout for auto-save (1 second debounce)
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, description, questions, isEditable, handleSave]);

  // Handle send
  const handleSend = async () => {
    // Save first if there are changes
    if (hasChanges) {
      await handleSave();
    }

    setIsSending(true);
    try {
      await onSend();
    } catch (error) {
      console.error('Failed to send brief:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Add a new question
  const handleAddQuestion = useCallback(
    (type: BriefQuestionType, afterIndex?: number) => {
      const newQuestion: BriefQuestion = {
        id: `temp-${Date.now()}`,
        brief_id: brief.id,
        type,
        label: getDefaultLabel(type),
        position: afterIndex !== undefined ? afterIndex + 1 : questions.length,
        is_required: false,
        config: getDefaultConfig(type),
        created_at: new Date().toISOString(),
      };

      if (afterIndex !== undefined) {
        // Insert after specific index
        const updated = [...questions];
        updated.splice(afterIndex + 1, 0, newQuestion);
        // Recalculate positions
        updated.forEach((q, i) => {
          q.position = i;
        });
        setQuestions(updated);
      } else {
        // Append at end
        setQuestions([...questions, newQuestion]);
      }

      // Select the new question
      setSelectedQuestionId(newQuestion.id);
    },
    [brief.id, questions]
  );

  // Duplicate a question
  const handleDuplicateQuestion = useCallback(
    (questionId: string) => {
      const index = questions.findIndex((q) => q.id === questionId);
      if (index === -1) return;

      const original = questions[index];
      const duplicated: BriefQuestion = {
        ...original,
        id: `temp-${Date.now()}`,
        position: index + 1,
        created_at: new Date().toISOString(),
      };

      const updated = [...questions];
      updated.splice(index + 1, 0, duplicated);
      // Recalculate positions
      updated.forEach((q, i) => {
        q.position = i;
      });
      setQuestions(updated);
      setSelectedQuestionId(duplicated.id);
    },
    [questions]
  );

  // Handle question updates
  const handleQuestionUpdate = useCallback(
    (questionId: string, updates: Partial<BriefQuestion>) => {
      const updated = questions.map((q) =>
        q.id === questionId ? { ...q, ...updates } : q
      );
      setQuestions(updated);
    },
    [questions]
  );

  // Handle question deletion
  const handleQuestionDelete = useCallback(
    (questionId: string) => {
      const updated = questions.filter((q) => q.id !== questionId);
      // Recalculate positions
      updated.forEach((q, i) => {
        q.position = i;
      });
      setQuestions(updated);
      if (selectedQuestionId === questionId) {
        setSelectedQuestionId(null);
      }
    },
    [questions, selectedQuestionId]
  );

  // Handle question reordering
  const handleQuestionMove = useCallback(
    (questionId: string, direction: 'up' | 'down') => {
      const index = questions.findIndex((q) => q.id === questionId);
      if (index === -1) return;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= questions.length) return;

      const updated = [...questions];
      [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];

      // Recalculate positions
      updated.forEach((q, i) => {
        q.position = i;
      });

      setQuestions(updated);
    },
    [questions]
  );

  // Drag & drop handlers for adding new blocks from panel
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const blockType = e.dataTransfer.types.includes('block-type');
    const questionId = e.dataTransfer.types.includes('question-id');
    e.dataTransfer.dropEffect = blockType || questionId ? 'move' : 'none';
    if (!isDraggingOver) {
      setIsDraggingOver(true);
    }
  }, [isDraggingOver]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only set to false if we're leaving the container (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
      setDropTargetIndex(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    setDropTargetIndex(null);
    setDraggingQuestionId(null);

    // Check if we're dropping an existing question (reordering)
    const questionId = e.dataTransfer.getData('question-id');
    if (questionId && dropTargetIndex !== null) {
      const fromIndex = questions.findIndex((q) => q.id === questionId);
      if (fromIndex !== -1) {
        let toIndex = dropTargetIndex;
        // Adjust target index if moving down
        if (fromIndex < toIndex) {
          toIndex = toIndex - 1;
        }
        if (fromIndex !== toIndex) {
          const updated = [...questions];
          const [moved] = updated.splice(fromIndex, 1);
          updated.splice(toIndex, 0, moved);
          // Recalculate positions
          updated.forEach((q, i) => {
            q.position = i;
          });
          setQuestions(updated);
        }
      }
      return;
    }

    // Check if we're dropping a new block type from the panel
    const blockType = e.dataTransfer.getData('block-type') as BriefQuestionType;
    if (blockType) {
      // If we have a drop target index, insert there, otherwise append
      if (dropTargetIndex !== null) {
        handleAddQuestion(blockType, dropTargetIndex - 1);
      } else {
        handleAddQuestion(blockType);
      }
    }
  }, [dropTargetIndex, handleAddQuestion, questions]);

  const handleDropZoneDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetIndex(index);
  }, []);

  // Handlers for reordering existing questions via drag & drop
  const handleQuestionDragStart = useCallback((e: React.DragEvent, questionId: string) => {
    e.dataTransfer.setData('question-id', questionId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingQuestionId(questionId);
  }, []);

  const handleQuestionDragEnd = useCallback(() => {
    setDraggingQuestionId(null);
    setDropTargetIndex(null);
    setIsDraggingOver(false);
  }, []);

  // Preview modal with client view
  if (showPreview) {
    return (
      <div className="h-full flex flex-col bg-gray-100">
        {/* Preview header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-medium text-gray-700">Apercu client</span>
            </div>
            <Button onClick={() => setShowPreview(false)} variant="outline">
              Fermer l'apercu
            </Button>
          </div>
        </div>

        {/* Preview content */}
        <div className="flex-1 overflow-auto p-8">
          <BriefPreview
            brief={{
              ...brief,
              title,
              description,
              questions: questions.map((q) => ({ ...q, response: null })),
            }}
            showResponses={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Back + breadcrumb */}
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Briefs</span>
              <span className="text-gray-300">/</span>
              <span className="text-gray-900 font-medium truncate max-w-[200px]">
                {title || 'Sans titre'}
              </span>
            </div>
            <Badge variant={BRIEF_STATUS_VARIANTS[brief.status]}>
              {BRIEF_STATUS_LABELS[brief.status]}
            </Badge>
          </div>

          {/* Right: Save status + actions */}
          <div className="flex items-center gap-3">
            {/* Save status indicator */}
            {isEditable && (
              <div className="flex items-center gap-1.5 text-xs">
                {saveStatus === 'saving' && (
                  <>
                    <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-500">Enregistrement...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-600">Enregistre</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-600">Erreur</span>
                  </>
                )}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(true)}
            >
              Previsualiser
            </Button>

            {isEditable && questions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveAsTemplate(true)}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Template
              </Button>
            )}

            {isEditable && (
              <Button
                size="sm"
                onClick={handleSend}
                disabled={isSending || questions.length === 0}
              >
                {isSending ? 'Envoi...' : 'Envoyer'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main content with left panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Block catalog (narrower, more discreet) */}
        {isEditable && (
          <BlockCatalogPanel onAddBlock={handleAddQuestion} />
        )}

        {/* Center - Brief content */}
        <div
          className={`flex-1 overflow-auto transition-colors ${isDraggingOver ? 'bg-blue-50/50' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="max-w-[650px] mx-auto py-8 px-6">
            {/* Brief header card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              {isEditable ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Titre du brief"
                    className="w-full text-xl font-semibold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none py-1"
                  />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description optionnelle du brief..."
                    rows={2}
                    className="w-full text-sm text-gray-600 bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none rounded p-2 resize-none"
                  />
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Client: {brief.client.nom}</span>
                    <span>•</span>
                    <span>Deal: {brief.deal.title}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                  {description && (
                    <p className="text-sm text-gray-600 mt-2">{description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-4">
                    <span>Client: {brief.client.nom}</span>
                    <span>•</span>
                    <span>Deal: {brief.deal.title}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Questions list */}
            {questions.length > 0 ? (
              <div className="space-y-2">
                {questions.map((question, index) => (
                  <div key={question.id}>
                    {/* Drop zone before first question */}
                    {isEditable && index === 0 && (
                      <DropZoneIndicator
                        index={0}
                        isActive={dropTargetIndex === 0}
                        isDragging={isDraggingOver}
                        isReordering={draggingQuestionId !== null}
                        onDragOver={(e) => handleDropZoneDragOver(e, 0)}
                        onAddBlock={(type) => handleAddQuestion(type, -1)}
                      />
                    )}

                    <BriefQuestionBlock
                      question={question}
                      index={index}
                      totalQuestions={questions.length}
                      isEditing={isEditable}
                      onUpdate={(updates) => handleQuestionUpdate(question.id, updates)}
                      onDelete={() => handleQuestionDelete(question.id)}
                      onMove={(direction) => handleQuestionMove(question.id, direction)}
                      onDuplicate={() => handleDuplicateQuestion(question.id)}
                      onSelect={() => setSelectedQuestionId(question.id)}
                      isSelected={selectedQuestionId === question.id}
                      onDragStart={(e) => handleQuestionDragStart(e, question.id)}
                      onDragEnd={handleQuestionDragEnd}
                      isDragging={draggingQuestionId === question.id}
                    />

                    {/* Drop zone after each question */}
                    {isEditable && (
                      <DropZoneIndicator
                        index={index + 1}
                        isActive={dropTargetIndex === index + 1}
                        isDragging={isDraggingOver}
                        isReordering={draggingQuestionId !== null}
                        onDragOver={(e) => handleDropZoneDragOver(e, index + 1)}
                        onAddBlock={(type) => handleAddQuestion(type, index)}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyBriefState onAddBlock={handleAddQuestion} isDragging={isDraggingOver} />
            )}

            {/* Add block button at bottom (when there are questions) */}
            {isEditable && questions.length > 0 && (
              <div className="mt-6">
                <AddBlockButton onAddBlock={handleAddQuestion} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save as template modal */}
      <SaveAsTemplateModal
        isOpen={showSaveAsTemplate}
        onClose={() => setShowSaveAsTemplate(false)}
        briefId={brief.id}
        briefTitle={title}
        questionCount={questions.length}
        onCreated={(templateId, templateName) => {
          console.log(`Template created: ${templateId} - ${templateName}`);
          // Could show a toast notification here
        }}
      />
    </div>
  );
}

// ============================================================================
// Block Catalog Panel (left sidebar - narrower, more discreet)
// ============================================================================

interface BlockCatalogPanelProps {
  onAddBlock: (type: BriefQuestionType) => void;
}

function BlockCatalogPanel({ onAddBlock }: BlockCatalogPanelProps) {
  const structureBlocks: BriefQuestionType[] = ['title', 'description', 'separator', 'media'];
  const questionBlocks: BriefQuestionType[] = ['text_short', 'text_long', 'number', 'address', 'time', 'date', 'selection', 'rating'];

  const handleDragStart = (e: React.DragEvent, type: BriefQuestionType) => {
    e.dataTransfer.setData('block-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-56 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto flex-shrink-0">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-1">Blocs</h3>

      {/* Structure section */}
      <div className="mb-5">
        <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
          Structure
        </h4>
        <div className="space-y-1">
          {structureBlocks.map((type) => (
            <button
              key={type}
              onClick={() => onAddBlock(type)}
              draggable
              onDragStart={(e) => handleDragStart(e, type)}
              className="w-full flex items-center gap-3 px-2.5 py-2 text-left rounded-lg hover:bg-white hover:shadow-sm transition-all text-sm cursor-grab active:cursor-grabbing"
            >
              <span className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-lg text-base font-semibold text-gray-700 shadow-sm">
                {QUESTION_TYPE_ICONS[type]}
              </span>
              <span className="text-gray-700 font-medium">{QUESTION_TYPE_LABELS[type]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Questions section */}
      <div>
        <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
          Questions
        </h4>
        <div className="space-y-1">
          {questionBlocks.map((type) => (
            <button
              key={type}
              onClick={() => onAddBlock(type)}
              draggable
              onDragStart={(e) => handleDragStart(e, type)}
              className="w-full flex items-center gap-3 px-2.5 py-2 text-left rounded-lg hover:bg-white hover:shadow-sm transition-all text-sm cursor-grab active:cursor-grabbing"
            >
              <span className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-lg text-base font-semibold text-gray-700 shadow-sm">
                {QUESTION_TYPE_ICONS[type]}
              </span>
              <span className="text-gray-700 font-medium">{QUESTION_TYPE_LABELS[type]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div className="mt-5 p-3 bg-blue-50 rounded-lg text-xs text-blue-600">
        Cliquez ou glissez un bloc vers le brief
      </div>
    </div>
  );
}

// ============================================================================
// Drop Zone Indicator (between questions - shows on hover or during drag)
// ============================================================================

interface DropZoneIndicatorProps {
  index: number;
  isActive: boolean;
  isDragging: boolean;
  isReordering?: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onAddBlock: (type: BriefQuestionType) => void;
}

function DropZoneIndicator({ index, isActive, isDragging, isReordering = false, onDragOver, onAddBlock }: DropZoneIndicatorProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`relative py-1 flex justify-center group transition-all ${
        isActive ? 'py-3' : ''
      }`}
      onDragOver={onDragOver}
    >
      {/* Visual drop indicator when dragging */}
      {isDragging && (
        <div
          className={`absolute inset-x-4 top-1/2 -translate-y-1/2 h-1 rounded transition-all ${
            isActive ? (isReordering ? 'bg-purple-500' : 'bg-blue-500') : 'bg-transparent'
          }`}
        />
      )}

      {/* Add button (visible on hover when not dragging) */}
      {!isDragging && (
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Drop here text when dragging and active */}
      {isDragging && isActive && (
        <span className={`text-xs font-medium ${isReordering ? 'text-purple-600' : 'text-blue-600'}`}>
          {isReordering ? 'Deplacer ici' : 'Deposer ici'}
        </span>
      )}

      {showMenu && (
        <BlockTypeMenu
          onSelect={(type) => {
            onAddBlock(type);
            setShowMenu(false);
          }}
          onClose={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Add Block Button (main primary action at bottom)
// ============================================================================

interface AddBlockButtonProps {
  onAddBlock: (type: BriefQuestionType) => void;
}

function AddBlockButton({ onAddBlock }: AddBlockButtonProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="font-medium">Ajouter un bloc</span>
      </button>

      {showMenu && (
        <BlockTypeMenu
          onSelect={(type) => {
            onAddBlock(type);
            setShowMenu(false);
          }}
          onClose={() => setShowMenu(false)}
          position="top"
        />
      )}
    </div>
  );
}

// ============================================================================
// Block Type Menu (compact dropdown for add block button)
// ============================================================================

interface BlockTypeMenuProps {
  onSelect: (type: BriefQuestionType) => void;
  onClose: () => void;
  position?: 'top' | 'bottom';
}

function BlockTypeMenu({ onSelect, onClose, position = 'bottom' }: BlockTypeMenuProps) {
  const structureBlocks: BriefQuestionType[] = ['title', 'description', 'separator', 'media'];
  const questionBlocks: BriefQuestionType[] = ['text_short', 'text_long', 'number', 'address', 'time', 'date', 'selection', 'rating'];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-10" onClick={onClose} />

      {/* Menu */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 z-20 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[240px] ${
          position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
        }`}
      >
        {/* Structure section */}
        <div className="px-3 py-1">
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Structure</span>
        </div>
        <div className="px-1">
          {structureBlocks.map((type) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left hover:bg-gray-50 rounded-md"
            >
              <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-xs">
                {QUESTION_TYPE_ICONS[type]}
              </span>
              <span className="text-sm text-gray-700">{QUESTION_TYPE_LABELS[type]}</span>
            </button>
          ))}
        </div>

        <div className="my-1.5 border-t border-gray-100" />

        {/* Questions section */}
        <div className="px-3 py-1">
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Questions</span>
        </div>
        <div className="px-1">
          {questionBlocks.map((type) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left hover:bg-gray-50 rounded-md"
            >
              <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-xs">
                {QUESTION_TYPE_ICONS[type]}
              </span>
              <span className="text-sm text-gray-700">{QUESTION_TYPE_LABELS[type]}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Empty Brief State
// ============================================================================

interface EmptyBriefStateProps {
  onAddBlock: (type: BriefQuestionType) => void;
  isDragging?: boolean;
}

function EmptyBriefState({ onAddBlock, isDragging = false }: EmptyBriefStateProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`bg-white rounded-lg border-2 p-12 text-center transition-colors ${
        isDragging ? 'border-blue-400 border-dashed bg-blue-50' : 'border-gray-200'
      }`}
    >
      {isDragging ? (
        <>
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-blue-700 mb-1">Deposez le bloc ici</h3>
          <p className="text-sm text-blue-600">
            Relâchez pour ajouter le bloc au brief
          </p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Brief vide</h3>
          <p className="text-sm text-gray-500 mb-6">
            Commencez par ajouter votre premier bloc au brief.
          </p>

          <div className="relative inline-block">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter un bloc
            </button>

            {showMenu && (
              <BlockTypeMenu
                onSelect={(type) => {
                  onAddBlock(type);
                  setShowMenu(false);
                }}
                onClose={() => setShowMenu(false)}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDefaultLabel(type: BriefQuestionType): string {
  switch (type) {
    case 'title':
      return 'Titre de section';
    case 'description':
      return 'Texte descriptif...';
    case 'separator':
      return '';
    case 'media':
      return '';
    case 'text_short':
      return 'Votre question';
    case 'text_long':
      return 'Votre question (reponse longue)';
    case 'number':
      return 'Entrez un nombre';
    case 'address':
      return 'Adresse';
    case 'time':
      return 'Selectionnez une heure';
    case 'date':
      return 'Selectionnez une date';
    case 'selection':
      return 'Choisissez une option';
    case 'rating':
      return 'Evaluez l\'importance';
    default:
      return 'Question';
  }
}

function getDefaultConfig(type: BriefQuestionType): QuestionConfig {
  switch (type) {
    case 'media':
      return { media_type: 'image', url: '', caption: '' };
    case 'date':
      return { mode: 'single' };
    case 'selection':
      return { selection_type: 'dropdown', options: ['Option 1', 'Option 2'], allow_other: false };
    default:
      return {};
  }
}

export default BriefEditor;
