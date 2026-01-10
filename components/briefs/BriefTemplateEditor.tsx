'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { Button, Input } from '@/components/ui';
import { BriefQuestionBlock } from './BriefQuestionBlock';
import type {
  BriefTemplateWithQuestions,
  BriefTemplateQuestion,
  BriefQuestionType,
  QuestionConfig,
  BriefQuestion,
} from '@/lib/briefs/types';
import { QUESTION_TYPE_LABELS, QUESTION_TYPE_ICONS } from '@/lib/briefs/types';

interface BriefTemplateEditorProps {
  template: BriefTemplateWithQuestions;
  onSave: (updates: Partial<BriefTemplateWithQuestions>) => Promise<void>;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function BriefTemplateEditor({ template, onSave }: BriefTemplateEditorProps) {
  const { openTab } = useTabsStore();
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description || '');
  const [questions, setQuestions] = useState<BriefTemplateQuestion[]>(template.questions || []);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [draggingQuestionId, setDraggingQuestionId] = useState<string | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef({
    name: template.name,
    description: template.description || '',
    questions: template.questions,
  });

  // Handle save
  const handleSave = useCallback(async () => {
    const currentName = name;
    const currentDescription = description;
    const currentQuestions = questions;

    // Check if anything changed since last save
    if (
      currentName === lastSavedRef.current.name &&
      currentDescription === lastSavedRef.current.description &&
      JSON.stringify(currentQuestions) === JSON.stringify(lastSavedRef.current.questions)
    ) {
      return;
    }

    setSaveStatus('saving');
    try {
      await onSave({
        name: currentName,
        description: currentDescription,
        questions: currentQuestions,
      });
      lastSavedRef.current = {
        name: currentName,
        description: currentDescription,
        questions: currentQuestions,
      };
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save template:', error);
      setSaveStatus('error');
    }
  }, [name, description, questions, onSave]);

  // Auto-save with debounce
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (
      name === lastSavedRef.current.name &&
      description === lastSavedRef.current.description &&
      JSON.stringify(questions) === JSON.stringify(lastSavedRef.current.questions)
    ) {
      return;
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [name, description, questions, handleSave]);

  // Add a new question
  const handleAddQuestion = useCallback(
    (type: BriefQuestionType, afterIndex?: number) => {
      const newQuestion: BriefTemplateQuestion = {
        id: `temp-${Date.now()}`,
        template_id: template.id,
        type,
        label: getDefaultLabel(type),
        position: afterIndex !== undefined ? afterIndex + 1 : questions.length,
        is_required: false,
        config: getDefaultConfig(type),
        created_at: new Date().toISOString(),
      };

      if (afterIndex !== undefined) {
        const updated = [...questions];
        updated.splice(afterIndex + 1, 0, newQuestion);
        updated.forEach((q, i) => {
          q.position = i;
        });
        setQuestions(updated);
      } else {
        setQuestions([...questions, newQuestion]);
      }

      setSelectedQuestionId(newQuestion.id);
    },
    [template.id, questions]
  );

  // Duplicate a question
  const handleDuplicateQuestion = useCallback(
    (questionId: string) => {
      const index = questions.findIndex((q) => q.id === questionId);
      if (index === -1) return;

      const original = questions[index];
      const duplicated: BriefTemplateQuestion = {
        ...original,
        id: `temp-${Date.now()}`,
        position: index + 1,
        created_at: new Date().toISOString(),
      };

      const updated = [...questions];
      updated.splice(index + 1, 0, duplicated);
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
    (questionId: string, updates: Partial<BriefTemplateQuestion>) => {
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
      updated.forEach((q, i) => {
        q.position = i;
      });
      setQuestions(updated);
    },
    [questions]
  );

  // Drag & drop handlers
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const blockType = e.dataTransfer.types.includes('block-type');
      const questionId = e.dataTransfer.types.includes('question-id');
      e.dataTransfer.dropEffect = blockType || questionId ? 'move' : 'none';
      if (!isDraggingOver) {
        setIsDraggingOver(true);
      }
    },
    [isDraggingOver]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
      setDropTargetIndex(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      setDropTargetIndex(null);
      setDraggingQuestionId(null);

      const questionId = e.dataTransfer.getData('question-id');
      if (questionId && dropTargetIndex !== null) {
        const fromIndex = questions.findIndex((q) => q.id === questionId);
        if (fromIndex !== -1) {
          let toIndex = dropTargetIndex;
          if (fromIndex < toIndex) {
            toIndex = toIndex - 1;
          }
          if (fromIndex !== toIndex) {
            const updated = [...questions];
            const [moved] = updated.splice(fromIndex, 1);
            updated.splice(toIndex, 0, moved);
            updated.forEach((q, i) => {
              q.position = i;
            });
            setQuestions(updated);
          }
        }
        return;
      }

      const blockType = e.dataTransfer.getData('block-type') as BriefQuestionType;
      if (blockType) {
        if (dropTargetIndex !== null) {
          handleAddQuestion(blockType, dropTargetIndex - 1);
        } else {
          handleAddQuestion(blockType);
        }
      }
    },
    [dropTargetIndex, handleAddQuestion, questions]
  );

  const handleDropZoneDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetIndex(index);
  }, []);

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

  // Convert template question to brief question format for BriefQuestionBlock
  const toBriefQuestion = (q: BriefTemplateQuestion): BriefQuestion => ({
    ...q,
    brief_id: template.id, // Use template_id as brief_id for compatibility
  });

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Back + name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => openTab({ type: 'settings', path: '/settings', title: 'Parametres' }, true)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Templates</span>
              <span className="text-gray-300">/</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom du template"
                className="border-none shadow-none text-gray-900 font-medium p-0 h-auto focus:ring-0"
              />
            </div>
          </div>

          {/* Right: Save status + actions */}
          <div className="flex items-center gap-3">
            {/* Save status indicator */}
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

            <Button variant="outline" size="sm" onClick={handleSave}>
              Enregistrer
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Block catalog */}
        <BlockCatalogPanel onAddBlock={handleAddQuestion} />

        {/* Center - Template content */}
        <div
          className={`flex-1 overflow-auto transition-colors ${isDraggingOver ? 'bg-blue-50/50' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="max-w-[650px] mx-auto py-8 px-6">
            {/* Template header card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <div className="space-y-4">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nom du template"
                  className="w-full text-xl font-semibold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none py-1"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description optionnelle du template..."
                  rows={2}
                  className="w-full text-sm text-gray-600 bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none rounded p-2 resize-none"
                />
              </div>
            </div>

            {/* Questions list */}
            {questions.length > 0 ? (
              <div className="space-y-2">
                {questions.map((question, index) => (
                  <div key={question.id}>
                    {/* Drop zone before first question */}
                    {index === 0 && (
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
                      question={toBriefQuestion(question)}
                      index={index}
                      totalQuestions={questions.length}
                      isEditing={true}
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
                    <DropZoneIndicator
                      index={index + 1}
                      isActive={dropTargetIndex === index + 1}
                      isDragging={isDraggingOver}
                      isReordering={draggingQuestionId !== null}
                      onDragOver={(e) => handleDropZoneDragOver(e, index + 1)}
                      onAddBlock={(type) => handleAddQuestion(type, index)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyTemplateState onAddBlock={handleAddQuestion} isDragging={isDraggingOver} />
            )}

            {/* Add block button at bottom */}
            {questions.length > 0 && (
              <div className="mt-6">
                <AddBlockButton onAddBlock={handleAddQuestion} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Block Catalog Panel
// ============================================================================

interface BlockCatalogPanelProps {
  onAddBlock: (type: BriefQuestionType) => void;
}

function BlockCatalogPanel({ onAddBlock }: BlockCatalogPanelProps) {
  const structureBlocks: BriefQuestionType[] = ['title', 'description', 'separator', 'media'];
  const questionBlocks: BriefQuestionType[] = [
    'text_short',
    'text_long',
    'number',
    'address',
    'time',
    'date',
    'selection',
    'rating',
  ];

  const handleDragStart = (e: React.DragEvent, type: BriefQuestionType) => {
    e.dataTransfer.setData('block-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-56 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto flex-shrink-0">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-1">
        Blocs
      </h3>

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
        Cliquez ou glissez un bloc vers le template
      </div>
    </div>
  );
}

// ============================================================================
// Drop Zone Indicator
// ============================================================================

interface DropZoneIndicatorProps {
  index: number;
  isActive: boolean;
  isDragging: boolean;
  isReordering?: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onAddBlock: (type: BriefQuestionType) => void;
}

function DropZoneIndicator({
  isActive,
  isDragging,
  isReordering = false,
  onDragOver,
}: DropZoneIndicatorProps) {
  return (
    <div
      className={`relative py-1 flex justify-center group transition-all ${isActive ? 'py-3' : ''}`}
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

      {/* Drop here text when dragging and active */}
      {isDragging && isActive && (
        <span className={`text-xs font-medium ${isReordering ? 'text-purple-600' : 'text-blue-600'}`}>
          {isReordering ? 'Deplacer ici' : 'Deposer ici'}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Add Block Button
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
// Block Type Menu
// ============================================================================

interface BlockTypeMenuProps {
  onSelect: (type: BriefQuestionType) => void;
  onClose: () => void;
  position?: 'top' | 'bottom';
}

function BlockTypeMenu({ onSelect, onClose, position = 'bottom' }: BlockTypeMenuProps) {
  const structureBlocks: BriefQuestionType[] = ['title', 'description', 'separator', 'media'];
  const questionBlocks: BriefQuestionType[] = [
    'text_short',
    'text_long',
    'number',
    'address',
    'time',
    'date',
    'selection',
    'rating',
  ];

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
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
            Structure
          </span>
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
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
            Questions
          </span>
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
// Empty Template State
// ============================================================================

interface EmptyTemplateStateProps {
  onAddBlock: (type: BriefQuestionType) => void;
  isDragging?: boolean;
}

function EmptyTemplateState({ onAddBlock, isDragging = false }: EmptyTemplateStateProps) {
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
          <p className="text-sm text-blue-600">Relachez pour ajouter le bloc au template</p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Template vide</h3>
          <p className="text-sm text-gray-500 mb-6">
            Commencez par ajouter votre premier bloc au template.
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
      return "Evaluez l'importance";
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

export default BriefTemplateEditor;
