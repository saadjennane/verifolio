'use client';

import { useState } from 'react';
import { Input, Checkbox } from '@/components/ui';
import type {
  BriefQuestion,
  BriefQuestionType,
  QuestionConfig,
  DateConfig,
  SelectionConfig,
  MediaConfig,
  TextConfig,
  DateMode,
  SelectionMode,
  MediaType,
} from '@/lib/briefs/types';
import { QUESTION_TYPE_LABELS, QUESTION_TYPE_ICONS, isDataQuestion } from '@/lib/briefs/types';

interface BriefQuestionBlockProps {
  question: BriefQuestion;
  index: number;
  totalQuestions: number;
  isEditing: boolean;
  onUpdate: (updates: Partial<BriefQuestion>) => void;
  onDelete: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onDuplicate?: () => void;
  onSelect: () => void;
  isSelected: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

export function BriefQuestionBlock({
  question,
  index,
  totalQuestions,
  isEditing,
  onUpdate,
  onDelete,
  onMove,
  onDuplicate,
  onSelect,
  isSelected,
  onDragStart,
  onDragEnd,
  isDragging = false,
}: BriefQuestionBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const canCollectData = isDataQuestion(question.type);

  return (
    <div
      className={`group relative rounded-lg border transition-all ${
        isDragging
          ? 'opacity-50 border-purple-400 ring-2 ring-purple-100'
          : isSelected
          ? 'border-blue-500 ring-2 ring-blue-100'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
      draggable={isEditing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {/* Block header with drag handle */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-t-lg border-b border-gray-200">
        {/* Drag handle */}
        <div className={`text-gray-400 hover:text-gray-600 ${isEditing ? 'cursor-grab active:cursor-grabbing' : ''}`}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
            <circle cx="4" cy="4" r="1.5" />
            <circle cx="4" cy="8" r="1.5" />
            <circle cx="4" cy="12" r="1.5" />
            <circle cx="10" cy="4" r="1.5" />
            <circle cx="10" cy="8" r="1.5" />
            <circle cx="10" cy="12" r="1.5" />
          </svg>
        </div>

        {/* Type icon and label */}
        <span className="w-6 h-6 flex items-center justify-center bg-white border border-gray-300 rounded text-sm font-semibold text-gray-700">
          {QUESTION_TYPE_ICONS[question.type]}
        </span>
        <span className="text-xs text-gray-600 font-medium">{QUESTION_TYPE_LABELS[question.type]}</span>

        {/* Required badge */}
        {canCollectData && question.is_required && (
          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
            Obligatoire
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {index > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMove('up');
              }}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Monter"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}
          {index < totalQuestions - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMove('down');
              }}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Descendre"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Configurer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          {onDuplicate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Dupliquer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Supprimer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Block content */}
      <div className="p-4">
        {isEditing ? (
          <QuestionEditor
            question={question}
            onUpdate={onUpdate}
          />
        ) : (
          <QuestionPreview question={question} />
        )}
      </div>

      {/* Expanded configuration panel */}
      {isExpanded && canCollectData && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <QuestionConfigEditor
            question={question}
            onUpdate={onUpdate}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Question Editor (inline editing of label)
// ============================================================================

interface QuestionEditorProps {
  question: BriefQuestion;
  onUpdate: (updates: Partial<BriefQuestion>) => void;
}

function QuestionEditor({ question, onUpdate }: QuestionEditorProps) {
  const handleLabelChange = (label: string) => {
    onUpdate({ label });
  };

  switch (question.type) {
    case 'title':
      return (
        <input
          type="text"
          value={question.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Titre de section"
          className="w-full text-xl font-semibold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none py-1"
        />
      );

    case 'description':
      return (
        <textarea
          value={question.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Texte descriptif..."
          rows={2}
          className="w-full text-sm text-gray-600 bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none rounded p-1 resize-none"
        />
      );

    case 'separator':
      return (
        <div className="flex items-center gap-2">
          <hr className="flex-1 border-gray-300" />
          <span className="text-xs text-gray-400">Separateur</span>
          <hr className="flex-1 border-gray-300" />
        </div>
      );

    case 'media':
      return (
        <MediaEditor
          config={question.config as MediaConfig}
          onUpdate={(config) => onUpdate({ config })}
        />
      );

    default:
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={question.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="Intitule de la question"
            className="w-full font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none py-1"
          />
          <QuestionInputPreview type={question.type} config={question.config} />
        </div>
      );
  }
}

// ============================================================================
// Question Preview (read-only display)
// ============================================================================

interface QuestionPreviewProps {
  question: BriefQuestion;
}

function QuestionPreview({ question }: QuestionPreviewProps) {
  switch (question.type) {
    case 'title':
      return (
        <h3 className="text-xl font-semibold text-gray-900">
          {question.label || 'Titre de section'}
        </h3>
      );

    case 'description':
      return (
        <p className="text-sm text-gray-600 whitespace-pre-wrap">
          {question.label || 'Texte descriptif...'}
        </p>
      );

    case 'separator':
      return <hr className="border-gray-300" />;

    case 'media':
      return <MediaPreview config={question.config as MediaConfig} />;

    default:
      return (
        <div className="space-y-2">
          <label className="block font-medium text-gray-900">
            {question.label || 'Question'}
            {question.is_required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <QuestionInputPreview type={question.type} config={question.config} />
        </div>
      );
  }
}

// ============================================================================
// Question Input Preview (shows what the input will look like)
// ============================================================================

interface QuestionInputPreviewProps {
  type: BriefQuestionType;
  config: QuestionConfig;
}

function QuestionInputPreview({ type, config }: QuestionInputPreviewProps) {
  switch (type) {
    case 'text_short': {
      const textConfig = config as TextConfig;
      const placeholder = textConfig?.placeholder || 'Reponse courte...';
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400">
          {placeholder}
        </div>
      );
    }

    case 'text_long': {
      const textConfig = config as TextConfig;
      const placeholder = textConfig?.placeholder || 'Reponse longue...';
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 h-20">
          {placeholder}
        </div>
      );
    }

    case 'number':
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 w-32">
          0
        </div>
      );

    case 'address':
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400">
          Entrez une adresse...
        </div>
      );

    case 'time':
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 w-32 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          HH:MM
        </div>
      );

    case 'date': {
      const dateConfig = config as DateConfig;
      const mode = dateConfig?.mode || 'single';
      return (
        <div className="flex items-center gap-2">
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {mode === 'single' && 'Date'}
            {mode === 'range' && 'Du ... au ...'}
            {mode === 'multiple' && 'Plusieurs dates'}
            {mode === 'flexible' && 'Dates flexibles'}
          </div>
        </div>
      );
    }

    case 'selection': {
      const selConfig = config as SelectionConfig;
      const options = selConfig?.options || ['Option 1', 'Option 2'];
      const selectionType = selConfig?.selection_type || 'dropdown';

      if (selectionType === 'dropdown') {
        return (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 flex items-center justify-between">
            <span>Selectionnez...</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        );
      }

      return (
        <div className="space-y-1">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
              {selectionType === 'radio' ? (
                <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
              ) : (
                <div className="w-4 h-4 rounded border-2 border-gray-300" />
              )}
              <span>{opt}</span>
            </div>
          ))}
          {selConfig?.allow_other && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              {selectionType === 'radio' ? (
                <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
              ) : (
                <div className="w-4 h-4 rounded border-2 border-gray-300" />
              )}
              <span>Autre...</span>
            </div>
          )}
        </div>
      );
    }

    case 'rating':
      return (
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className="w-6 h-6 text-gray-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ))}
          <span className="ml-2 text-sm text-gray-400">1 a 5</span>
        </div>
      );

    default:
      return null;
  }
}

// ============================================================================
// Question Config Editor (expanded settings)
// ============================================================================

interface QuestionConfigEditorProps {
  question: BriefQuestion;
  onUpdate: (updates: Partial<BriefQuestion>) => void;
}

function QuestionConfigEditor({ question, onUpdate }: QuestionConfigEditorProps) {
  const handleRequiredChange = (is_required: boolean) => {
    onUpdate({ is_required });
  };

  return (
    <div className="space-y-4">
      {/* Required toggle */}
      <Checkbox
        label="Reponse obligatoire"
        checked={question.is_required}
        onChange={handleRequiredChange}
      />

      {/* Placeholder for text fields */}
      {(question.type === 'text_short' || question.type === 'text_long') && (
        <TextConfigEditor
          config={question.config as TextConfig}
          onUpdate={(config) => onUpdate({ config })}
          isLong={question.type === 'text_long'}
        />
      )}

      {/* Type-specific config */}
      {question.type === 'date' && (
        <DateConfigEditor
          config={question.config as DateConfig}
          onUpdate={(config) => onUpdate({ config })}
        />
      )}

      {question.type === 'selection' && (
        <SelectionConfigEditor
          config={question.config as SelectionConfig}
          onUpdate={(config) => onUpdate({ config })}
        />
      )}
    </div>
  );
}

// ============================================================================
// Text Config Editor (placeholder)
// ============================================================================

interface TextConfigEditorProps {
  config: TextConfig;
  onUpdate: (config: TextConfig) => void;
  isLong?: boolean;
}

function TextConfigEditor({ config, onUpdate, isLong = false }: TextConfigEditorProps) {
  const placeholder = config?.placeholder || '';
  const defaultPlaceholder = isLong ? 'Reponse longue...' : 'Reponse courte...';

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        Texte d'aide (placeholder)
      </label>
      <Input
        value={placeholder}
        onChange={(e) => onUpdate({ ...config, placeholder: e.target.value })}
        placeholder={defaultPlaceholder}
        className="text-sm"
      />
      <p className="text-[10px] text-gray-400 mt-1">
        Ce texte apparaitra dans le champ avant que le client ne saisisse sa reponse
      </p>
    </div>
  );
}

// ============================================================================
// Date Config Editor
// ============================================================================

interface DateConfigEditorProps {
  config: DateConfig;
  onUpdate: (config: DateConfig) => void;
}

function DateConfigEditor({ config, onUpdate }: DateConfigEditorProps) {
  const mode = config?.mode || 'single';

  const modes: { value: DateMode; label: string }[] = [
    { value: 'single', label: 'Date unique' },
    { value: 'range', label: 'Plage de dates' },
    { value: 'multiple', label: 'Plusieurs dates' },
    { value: 'flexible', label: 'Dates flexibles' },
  ];

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-2">Mode de date</label>
      <div className="flex flex-wrap gap-2">
        {modes.map((m) => (
          <button
            key={m.value}
            onClick={() => onUpdate({ mode: m.value })}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              mode === m.value
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Selection Config Editor
// ============================================================================

interface SelectionConfigEditorProps {
  config: SelectionConfig;
  onUpdate: (config: SelectionConfig) => void;
}

function SelectionConfigEditor({ config, onUpdate }: SelectionConfigEditorProps) {
  const selectionType = config?.selection_type || 'dropdown';
  const options = config?.options || [];
  const allowOther = config?.allow_other || false;

  const types: { value: SelectionMode; label: string }[] = [
    { value: 'dropdown', label: 'Liste deroulante' },
    { value: 'radio', label: 'Choix unique' },
    { value: 'multiple', label: 'Choix multiples' },
  ];

  const addOption = () => {
    onUpdate({
      ...config,
      options: [...options, `Option ${options.length + 1}`],
    });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    onUpdate({ ...config, options: newOptions });
  };

  const removeOption = (index: number) => {
    onUpdate({
      ...config,
      options: options.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      {/* Selection type */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Type de selection</label>
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <button
              key={t.value}
              onClick={() => onUpdate({ ...config, selection_type: t.value })}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                selectionType === t.value
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Options list */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Options</label>
        <div className="space-y-2">
          {options.map((opt, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={opt}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                className="flex-1 text-sm"
              />
              {options.length > 1 && (
                <button
                  onClick={() => removeOption(index)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addOption}
            className="w-full py-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50"
          >
            + Ajouter une option
          </button>
        </div>
      </div>

      {/* Allow other */}
      <Checkbox
        label='Permettre "Autre" (reponse libre)'
        checked={allowOther}
        onChange={(checked) => onUpdate({ ...config, allow_other: checked })}
      />
    </div>
  );
}

// ============================================================================
// Media Editor (for image/video/link blocks)
// ============================================================================

interface MediaEditorProps {
  config: MediaConfig;
  onUpdate: (config: MediaConfig) => void;
}

function MediaEditor({ config, onUpdate }: MediaEditorProps) {
  const mediaType = config?.media_type || 'image';
  const url = config?.url || '';
  const caption = config?.caption || '';

  const types: { value: MediaType; label: string; icon: string }[] = [
    { value: 'image', label: 'Image', icon: '🖼' },
    { value: 'video', label: 'Video', icon: '🎬' },
    { value: 'link', label: 'Lien', icon: '🔗' },
  ];

  return (
    <div className="space-y-4">
      {/* Media type selector */}
      <div className="flex gap-2">
        {types.map((t) => (
          <button
            key={t.value}
            onClick={() => onUpdate({ ...config, media_type: t.value })}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
              mediaType === t.value
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* URL input */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          {mediaType === 'image' && 'URL de l\'image'}
          {mediaType === 'video' && 'URL YouTube ou Vimeo'}
          {mediaType === 'link' && 'URL du lien'}
        </label>
        <Input
          value={url}
          onChange={(e) => onUpdate({ ...config, url: e.target.value })}
          placeholder={
            mediaType === 'image'
              ? 'https://example.com/image.jpg'
              : mediaType === 'video'
              ? 'https://youtube.com/watch?v=...'
              : 'https://example.com'
          }
        />
      </div>

      {/* Caption */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Legende (optionnel)
        </label>
        <Input
          value={caption}
          onChange={(e) => onUpdate({ ...config, caption: e.target.value })}
          placeholder="Description du media..."
        />
      </div>

      {/* Preview */}
      {url && (
        <div className="mt-2">
          <MediaPreview config={{ media_type: mediaType, url, caption }} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Media Preview
// ============================================================================

interface MediaPreviewProps {
  config: MediaConfig;
}

function MediaPreview({ config }: MediaPreviewProps) {
  const mediaType = config?.media_type || 'image';
  const url = config?.url || '';
  const caption = config?.caption || '';

  if (!url) {
    return (
      <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center">
        <span className="text-2xl">
          {mediaType === 'image' && '🖼'}
          {mediaType === 'video' && '🎬'}
          {mediaType === 'link' && '🔗'}
        </span>
        <p className="text-sm text-gray-400 mt-2">
          {mediaType === 'image' && 'Ajoutez une image'}
          {mediaType === 'video' && 'Ajoutez une video'}
          {mediaType === 'link' && 'Ajoutez un lien'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {mediaType === 'image' && (
        <div className="rounded-lg overflow-hidden border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={caption || 'Image'} className="w-full h-auto max-h-64 object-contain bg-gray-100" />
        </div>
      )}

      {mediaType === 'video' && (
        <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-900 aspect-video flex items-center justify-center">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-300">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </a>
        </div>
      )}

      {mediaType === 'link' && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="text-sm text-blue-600 truncate">{url}</span>
        </a>
      )}

      {caption && (
        <p className="text-sm text-gray-500 text-center">{caption}</p>
      )}
    </div>
  );
}
