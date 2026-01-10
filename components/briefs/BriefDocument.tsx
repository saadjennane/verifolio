'use client';

import { useState, useCallback } from 'react';
import { BriefQuestionBlock } from './BriefQuestionBlock';
import type { BriefQuestion, BriefQuestionType, QuestionConfig } from '@/lib/briefs/types';

interface BriefDocumentProps {
  briefId: string;
  title: string;
  questions: BriefQuestion[];
  isEditing: boolean;
  onTitleChange: (title: string) => void;
  onQuestionsChange: (questions: BriefQuestion[]) => void;
  onAddQuestion: (type: BriefQuestionType, afterIndex?: number) => void;
}

export function BriefDocument({
  briefId,
  title,
  questions,
  isEditing,
  onTitleChange,
  onQuestionsChange,
  onAddQuestion,
}: BriefDocumentProps) {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  // Handle question updates
  const handleQuestionUpdate = useCallback(
    (questionId: string, updates: Partial<BriefQuestion>) => {
      const updated = questions.map((q) =>
        q.id === questionId ? { ...q, ...updates } : q
      );
      onQuestionsChange(updated);
    },
    [questions, onQuestionsChange]
  );

  // Handle question deletion
  const handleQuestionDelete = useCallback(
    (questionId: string) => {
      const updated = questions.filter((q) => q.id !== questionId);
      // Recalculate positions
      updated.forEach((q, i) => {
        q.position = i;
      });
      onQuestionsChange(updated);
      if (selectedQuestionId === questionId) {
        setSelectedQuestionId(null);
      }
    },
    [questions, onQuestionsChange, selectedQuestionId]
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

      onQuestionsChange(updated);
    },
    [questions, onQuestionsChange]
  );

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const blockType = e.dataTransfer.getData('block-type') as BriefQuestionType;
    if (blockType) {
      onAddQuestion(blockType);
    }
  };

  return (
    <div className="flex-1 bg-gray-100 overflow-auto p-8">
      {/* A4 Document container */}
      <div
        className="bg-white mx-auto shadow-lg rounded-lg max-w-[210mm] min-h-[297mm]"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Document header */}
        <div className="px-12 pt-12 pb-6 border-b border-gray-100">
          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Titre du brief"
              className="w-full text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none py-2"
            />
          ) : (
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          )}
        </div>

        {/* Questions */}
        <div className="px-12 py-8">
          {questions.length > 0 ? (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={question.id}>
                  <BriefQuestionBlock
                    question={question}
                    index={index}
                    totalQuestions={questions.length}
                    isEditing={isEditing}
                    onUpdate={(updates) => handleQuestionUpdate(question.id, updates)}
                    onDelete={() => handleQuestionDelete(question.id)}
                    onMove={(direction) => handleQuestionMove(question.id, direction)}
                    onSelect={() => setSelectedQuestionId(question.id)}
                    isSelected={selectedQuestionId === question.id}
                  />

                  {/* Add block button between questions */}
                  {isEditing && (
                    <AddBlockDivider
                      onAddBlock={(type) => onAddQuestion(type, index)}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState onAddBlock={onAddQuestion} />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Add Block Divider (between questions)
// ============================================================================

interface AddBlockDividerProps {
  onAddBlock: (type: BriefQuestionType) => void;
}

function AddBlockDivider({ onAddBlock }: AddBlockDividerProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative py-2">
      <div className="flex items-center justify-center">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-blue-600 transition-colors opacity-0 hover:opacity-100 focus:opacity-100"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {showMenu && (
        <QuickAddMenu
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
// Quick Add Menu
// ============================================================================

interface QuickAddMenuProps {
  onSelect: (type: BriefQuestionType) => void;
  onClose: () => void;
}

function QuickAddMenu({ onSelect, onClose }: QuickAddMenuProps) {
  const items: { type: BriefQuestionType; label: string; icon: string }[] = [
    { type: 'text_short', label: 'Texte court', icon: 'Aa' },
    { type: 'text_long', label: 'Texte long', icon: '¶' },
    { type: 'number', label: 'Nombre', icon: '#' },
    { type: 'date', label: 'Date', icon: '📅' },
    { type: 'selection', label: 'Selection', icon: '☑' },
    { type: 'address', label: 'Adresse', icon: '📍' },
    { type: 'title', label: 'Titre', icon: 'H1' },
    { type: 'separator', label: 'Separateur', icon: '—' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-10"
        onClick={onClose}
      />

      {/* Menu */}
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px]">
        {items.map((item) => (
          <button
            key={item.type}
            onClick={() => onSelect(item.type)}
            className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 text-sm"
          >
            <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-xs font-mono">
              {item.icon}
            </span>
            <span className="text-gray-700">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

// ============================================================================
// Empty State
// ============================================================================

interface EmptyStateProps {
  onAddBlock: (type: BriefQuestionType) => void;
}

function EmptyState({ onAddBlock }: EmptyStateProps) {
  const quickBlocks: { type: BriefQuestionType; label: string; icon: string }[] = [
    { type: 'title', label: 'Titre', icon: 'H1' },
    { type: 'text_short', label: 'Texte court', icon: 'Aa' },
    { type: 'text_long', label: 'Texte long', icon: '¶' },
    { type: 'selection', label: 'Selection', icon: '☑' },
  ];

  return (
    <div className="py-12 text-center">
      <div className="mb-6">
        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Brief vide</h3>
        <p className="mt-1 text-sm text-gray-500">
          Commencez par ajouter des composants depuis la palette ou cliquez ci-dessous.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {quickBlocks.map((block) => (
          <button
            key={block.type}
            onClick={() => onAddBlock(block.type)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-xs font-mono">
              {block.icon}
            </span>
            <span className="text-sm text-gray-700">{block.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
