'use client';

import { useState } from 'react';
import { Button, Input, Textarea, Select, Checkbox } from '@/components/ui';
import type {
  BriefQuestion,
  BriefQuestionType,
  QuestionConfig,
  DateConfig,
  SelectionConfig,
  SubmitResponsePayload,
  AddressValue,
  DateRangeValue,
} from '@/lib/briefs/types';
import { isDataQuestion } from '@/lib/briefs/types';
import { getBriefTheme, type BriefThemeColor } from '@/lib/briefs/themes';

// Public brief data (subset of BriefWithDetails returned by API)
interface PublicBrief {
  id: string;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'SENT' | 'RESPONDED';
  client: { id: string; nom: string };
  deal: { title: string };
  questions: BriefQuestion[];
  responded_at: string | null;
  theme_color: BriefThemeColor;
  show_logo: boolean;
  company_logo_url: string | null;
}

interface BriefPublicViewProps {
  brief: PublicBrief;
  token: string;
}

export function BriefPublicView({ brief, token }: BriefPublicViewProps) {
  const [responses, setResponses] = useState<Record<string, SubmitResponsePayload>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(brief.status === 'RESPONDED');
  const [error, setError] = useState<string | null>(null);

  // Get theme colors
  const theme = getBriefTheme(brief.theme_color);

  // Check if brief is already responded
  if (isSubmitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: theme.background }}
      >
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center border-t-4" style={{ borderTopColor: theme.accent }}>
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${theme.accent}20` }}
          >
            <svg className="h-8 w-8" style={{ color: theme.accent }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Merci !</h2>
          <p className="text-gray-600">
            Vos reponses ont bien ete enregistrees. Nous reviendrons vers vous prochainement.
          </p>
        </div>
      </div>
    );
  }

  // Check if brief is in SENT status
  if (brief.status !== 'SENT') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: theme.background }}
      >
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center border-t-4" style={{ borderTopColor: theme.accent }}>
          <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Brief non disponible</h2>
          <p className="text-gray-600">
            Ce brief n&apos;est pas encore pret a recevoir des reponses.
          </p>
        </div>
      </div>
    );
  }

  const updateResponse = (questionId: string, payload: Partial<SubmitResponsePayload>) => {
    setResponses((prev) => {
      const existing = prev[questionId] || { question_id: questionId };
      return {
        ...prev,
        [questionId]: {
          ...existing,
          ...payload,
          question_id: questionId,
        },
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required questions
    const dataQuestions = brief.questions.filter((q) => isDataQuestion(q.type));
    const requiredQuestions = dataQuestions.filter((q) => q.is_required);

    for (const q of requiredQuestions) {
      const response = responses[q.id];
      if (!response || (!response.value && !response.structured_value)) {
        setError(`Veuillez repondre a la question: "${q.label}"`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/public/briefs/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: Object.values(responses),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la soumission');
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{ backgroundColor: theme.background }}
    >
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Logo */}
        {brief.show_logo && brief.company_logo_url && (
          <div className="text-center pb-2">
            <img
              src={brief.company_logo_url}
              alt=""
              className="h-10 mx-auto"
            />
          </div>
        )}

        {/* Header card */}
        <div
          className="bg-white rounded-lg shadow-sm border-l-4 p-6"
          style={{ borderLeftColor: theme.accent }}
        >
          <h1 className="text-2xl font-bold text-gray-900">{brief.title}</h1>
          {brief.description && (
            <p className="text-gray-600 mt-2 whitespace-pre-wrap">{brief.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-3">
            Merci de prendre le temps de repondre a ce brief.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Questions */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {brief.questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              response={responses[question.id]}
              onUpdate={(payload) => updateResponse(question.id, payload)}
              accentColor={theme.accent}
            />
          ))}

          {/* Submit */}
          <div className="pt-4 flex justify-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 rounded-md text-white font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: theme.accent }}
            >
              {isSubmitting ? 'Envoi en cours...' : 'Envoyer mes reponses'}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 pb-4">
            Vos reponses seront transmises directement a l&apos;equipe en charge de votre projet.
          </p>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Question Card Component (Google Forms style)
// ============================================================================

interface QuestionCardProps {
  question: BriefQuestion;
  response?: SubmitResponsePayload;
  onUpdate: (payload: Partial<SubmitResponsePayload>) => void;
  accentColor: string;
}

function QuestionCard({ question, response, onUpdate, accentColor }: QuestionCardProps) {
  // Structure questions (title, description, separator) - rendered differently
  if (!isDataQuestion(question.type)) {
    switch (question.type) {
      case 'title':
        return (
          <div
            className="bg-white rounded-lg shadow-sm border-l-4 p-5"
            style={{ borderLeftColor: accentColor }}
          >
            <h3 className="text-lg font-semibold text-gray-900">{question.label}</h3>
          </div>
        );
      case 'description':
        return (
          <div
            className="bg-white rounded-lg shadow-sm border-l-4 p-5"
            style={{ borderLeftColor: accentColor }}
          >
            <p className="text-gray-600 whitespace-pre-wrap">{question.label}</p>
          </div>
        );
      case 'separator':
        return <div className="py-2" />;
      default:
        return null;
    }
  }

  // Data collection questions
  return (
    <div
      className="bg-white rounded-lg shadow-sm border-l-4 p-5"
      style={{ borderLeftColor: accentColor }}
    >
      <label className="block font-medium text-gray-900 mb-3">
        {question.label}
        {question.is_required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <QuestionInput
        question={question}
        response={response}
        onUpdate={onUpdate}
        accentColor={accentColor}
      />
    </div>
  );
}

// ============================================================================
// Question Input Component
// ============================================================================

interface QuestionInputProps {
  question: BriefQuestion;
  response?: SubmitResponsePayload;
  onUpdate: (payload: Partial<SubmitResponsePayload>) => void;
  accentColor: string;
}

function QuestionInput({ question, response, onUpdate, accentColor }: QuestionInputProps) {
  switch (question.type) {
    case 'text_short':
      return (
        <Input
          value={response?.value || ''}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder="Votre reponse..."
        />
      );

    case 'text_long':
      return (
        <Textarea
          value={response?.value || ''}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder="Votre reponse..."
          rows={4}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          value={response?.value || ''}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder="0"
        />
      );

    case 'address':
      return (
        <AddressInput
          value={(response?.structured_value as AddressValue) || {}}
          onChange={(addr) => onUpdate({ structured_value: addr })}
        />
      );

    case 'date':
      return (
        <DateInput
          config={question.config as DateConfig}
          value={response?.value}
          structuredValue={response?.structured_value}
          onUpdate={onUpdate}
        />
      );

    case 'selection':
      return (
        <SelectionInput
          config={question.config as SelectionConfig}
          value={response?.value}
          structuredValue={response?.structured_value as string[] | undefined}
          onUpdate={onUpdate}
        />
      );

    default:
      return null;
  }
}

// ============================================================================
// Address Input
// ============================================================================

interface AddressInputProps {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
}

function AddressInput({ value, onChange }: AddressInputProps) {
  const update = (field: keyof AddressValue, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Input
        placeholder="Nom du lieu"
        value={value.lieu || ''}
        onChange={(e) => update('lieu', e.target.value)}
      />
      <Input
        placeholder="Adresse"
        value={value.adresse || ''}
        onChange={(e) => update('adresse', e.target.value)}
      />
      <Input
        placeholder="Ville"
        value={value.ville || ''}
        onChange={(e) => update('ville', e.target.value)}
      />
      <Input
        placeholder="Pays"
        value={value.pays || ''}
        onChange={(e) => update('pays', e.target.value)}
      />
    </div>
  );
}

// ============================================================================
// Date Input
// ============================================================================

interface DateInputProps {
  config: DateConfig;
  value?: string | null;
  structuredValue?: any;
  onUpdate: (payload: Partial<SubmitResponsePayload>) => void;
}

function DateInput({ config, value, structuredValue, onUpdate }: DateInputProps) {
  const mode = config?.mode || 'single';

  if (mode === 'single') {
    return (
      <Input
        type="date"
        value={value || ''}
        onChange={(e) => onUpdate({ value: e.target.value })}
      />
    );
  }

  if (mode === 'range') {
    const range = (structuredValue as DateRangeValue) || { start: '', end: '' };
    return (
      <div className="flex items-center gap-3">
        <Input
          type="date"
          value={range.start || ''}
          onChange={(e) =>
            onUpdate({ structured_value: { ...range, start: e.target.value } })
          }
        />
        <span className="text-gray-500">au</span>
        <Input
          type="date"
          value={range.end || ''}
          onChange={(e) =>
            onUpdate({ structured_value: { ...range, end: e.target.value } })
          }
        />
      </div>
    );
  }

  if (mode === 'multiple') {
    const dates = (structuredValue as string[]) || [];
    return (
      <div className="space-y-2">
        {dates.map((date, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                const newDates = [...dates];
                newDates[index] = e.target.value;
                onUpdate({ structured_value: newDates });
              }}
            />
            <button
              type="button"
              onClick={() => {
                const newDates = dates.filter((_, i) => i !== index);
                onUpdate({ structured_value: newDates });
              }}
              className="p-2 text-gray-400 hover:text-red-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onUpdate({ structured_value: [...dates, ''] })}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          + Ajouter une date
        </button>
      </div>
    );
  }

  // Flexible
  return (
    <Textarea
      value={value || ''}
      onChange={(e) => onUpdate({ value: e.target.value })}
      placeholder="Decrivez vos disponibilites..."
      rows={3}
    />
  );
}

// ============================================================================
// Selection Input
// ============================================================================

interface SelectionInputProps {
  config: SelectionConfig;
  value?: string | null;
  structuredValue?: string[];
  onUpdate: (payload: Partial<SubmitResponsePayload>) => void;
}

function SelectionInput({ config, value, structuredValue, onUpdate }: SelectionInputProps) {
  const selectionType = config?.selection_type || 'dropdown';
  const options = config?.options || [];
  const allowOther = config?.allow_other || false;
  const [otherValue, setOtherValue] = useState('');
  const [showOther, setShowOther] = useState(false);

  if (selectionType === 'dropdown') {
    return (
      <div className="space-y-2">
        <Select
          value={value || ''}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '__other__') {
              setShowOther(true);
              onUpdate({ value: '' });
            } else {
              setShowOther(false);
              onUpdate({ value: val });
            }
          }}
          options={[
            { value: '', label: 'Selectionnez...' },
            ...options.map((opt) => ({ value: opt, label: opt })),
            ...(allowOther ? [{ value: '__other__', label: 'Autre...' }] : []),
          ]}
        />
        {showOther && (
          <Input
            value={otherValue}
            onChange={(e) => {
              setOtherValue(e.target.value);
              onUpdate({ value: e.target.value });
            }}
            placeholder="Precisez..."
          />
        )}
      </div>
    );
  }

  if (selectionType === 'radio') {
    return (
      <div className="space-y-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name={`selection-${config.selection_type}`}
              checked={value === opt}
              onChange={() => {
                setShowOther(false);
                onUpdate({ value: opt });
              }}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-gray-700">{opt}</span>
          </label>
        ))}
        {allowOther && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name={`selection-${config.selection_type}`}
              checked={showOther}
              onChange={() => {
                setShowOther(true);
                onUpdate({ value: otherValue });
              }}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-gray-700">Autre:</span>
            {showOther && (
              <Input
                value={otherValue}
                onChange={(e) => {
                  setOtherValue(e.target.value);
                  onUpdate({ value: e.target.value });
                }}
                placeholder="Precisez..."
                className="flex-1"
              />
            )}
          </label>
        )}
      </div>
    );
  }

  // Checkbox (multiple selection)
  const selected = structuredValue || [];

  const toggleOption = (opt: string) => {
    const newSelected = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    onUpdate({ structured_value: newSelected });
  };

  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggleOption(opt)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-gray-700">{opt}</span>
        </label>
      ))}
      {allowOther && (
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={selected.includes(otherValue) && otherValue !== ''}
            onChange={() => {
              if (otherValue) {
                toggleOption(otherValue);
              }
            }}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-gray-700">Autre:</span>
          <Input
            value={otherValue}
            onChange={(e) => {
              const oldValue = otherValue;
              const newValue = e.target.value;
              setOtherValue(newValue);

              // Update selection if was selected
              if (selected.includes(oldValue)) {
                const newSelected = selected.filter((s) => s !== oldValue);
                if (newValue) {
                  newSelected.push(newValue);
                }
                onUpdate({ structured_value: newSelected });
              }
            }}
            placeholder="Precisez..."
            className="flex-1"
          />
        </div>
      )}
    </div>
  );
}
