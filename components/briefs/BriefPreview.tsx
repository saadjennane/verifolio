'use client';

import { Badge } from '@/components/ui';
import type {
  BriefWithDetails,
  BriefQuestion,
  BriefResponse,
  BriefQuestionWithResponse,
  DateConfig,
  SelectionConfig,
  TextConfig,
  AddressValue,
  DateRangeValue,
} from '@/lib/briefs/types';
import { BRIEF_STATUS_LABELS, BRIEF_STATUS_VARIANTS, isDataQuestion } from '@/lib/briefs/types';
import { getBriefTheme } from '@/lib/briefs/themes';

interface BriefPreviewProps {
  brief: BriefWithDetails;
  showResponses?: boolean;
  companyLogoUrl?: string | null;
}

export function BriefPreview({ brief, showResponses = false, companyLogoUrl }: BriefPreviewProps) {
  const theme = getBriefTheme(brief.theme_color);

  return (
    <div
      className="min-h-full p-6"
      style={{ backgroundColor: theme.background }}
    >
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Logo */}
        {brief.show_logo && companyLogoUrl && (
          <div className="text-center pt-2 pb-2">
            <img
              src={companyLogoUrl}
              alt=""
              className="h-10 mx-auto object-contain"
            />
          </div>
        )}

        {/* Header card */}
        <div
          className="bg-white rounded-lg shadow-sm border-l-4 p-6"
          style={{ borderLeftColor: theme.accent }}
        >
          <div className="flex items-center justify-between mb-4">
            <Badge variant={BRIEF_STATUS_VARIANTS[brief.status]}>
              {BRIEF_STATUS_LABELS[brief.status]}
            </Badge>
            {brief.responded_at && (
              <span className="text-sm text-gray-500">
                Repondu le {new Date(brief.responded_at).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{brief.title}</h1>
          {brief.description && (
            <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap">{brief.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-3">
            Pour {brief.client.nom} - {brief.deal.title}
          </p>
        </div>

        {/* Questions as cards */}
        {brief.questions.map((question) => (
          <QuestionPreviewCard
            key={question.id}
            question={question}
            showResponse={showResponses}
            accentColor={theme.accent}
          />
        ))}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">
            Brief cree le {new Date(brief.created_at).toLocaleDateString('fr-FR')}
            {brief.sent_at && ` - Envoye le ${new Date(brief.sent_at).toLocaleDateString('fr-FR')}`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Question Preview Card
// ============================================================================

interface QuestionPreviewCardProps {
  question: BriefQuestionWithResponse;
  showResponse: boolean;
  accentColor: string;
}

function QuestionPreviewCard({ question, showResponse, accentColor }: QuestionPreviewCardProps) {
  const hasResponse = question.response != null;

  // Title blocks get their own card style
  if (question.type === 'title') {
    return (
      <div
        className="bg-white rounded-lg shadow-sm border-l-4 p-4"
        style={{ borderLeftColor: accentColor }}
      >
        <h3 className="text-lg font-semibold text-gray-900">
          {question.label}
        </h3>
      </div>
    );
  }

  // Description inline
  if (question.type === 'description') {
    return (
      <div className="px-2">
        <p className="text-sm text-gray-600 whitespace-pre-wrap">
          {question.label}
        </p>
      </div>
    );
  }

  // Separator
  if (question.type === 'separator') {
    return <hr className="border-gray-200 my-2" />;
  }

  // Regular data questions in a card
  return (
    <div
      className="bg-white rounded-lg shadow-sm border-l-4 p-6"
      style={{ borderLeftColor: accentColor }}
    >
      <div className="space-y-3">
        <label className="block font-medium text-gray-900">
          {question.label}
          {question.is_required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {showResponse && hasResponse ? (
          <ResponseDisplay question={question} response={question.response!} accentColor={accentColor} />
        ) : (
          <QuestionPlaceholder question={question} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Response Display
// ============================================================================

interface ResponseDisplayProps {
  question: BriefQuestion;
  response: BriefResponse;
  accentColor: string;
}

function ResponseDisplay({ question, response, accentColor }: ResponseDisplayProps) {
  // Compute a lighter version of accent for backgrounds
  const bgColor = `${accentColor}15`; // 15 = ~9% opacity in hex
  switch (question.type) {
    case 'text_short':
    case 'text_long':
    case 'number':
      return (
        <div
          className="rounded-lg p-3 text-gray-900"
          style={{ backgroundColor: bgColor, border: `1px solid ${accentColor}30` }}
        >
          {response.value || <span className="text-gray-400 italic">Pas de reponse</span>}
        </div>
      );

    case 'address': {
      const address = response.structured_value as AddressValue | null;
      if (!address) {
        return <span className="text-gray-400 italic">Pas de reponse</span>;
      }
      return (
        <div
          className="rounded-lg p-3 text-gray-900"
          style={{ backgroundColor: bgColor, border: `1px solid ${accentColor}30` }}
        >
          {address.lieu && <div className="font-medium">{address.lieu}</div>}
          {address.adresse && <div>{address.adresse}</div>}
          {(address.ville || address.pays) && (
            <div>
              {address.ville}
              {address.ville && address.pays && ', '}
              {address.pays}
            </div>
          )}
        </div>
      );
    }

    case 'date': {
      const dateConfig = question.config as DateConfig;
      const mode = dateConfig?.mode || 'single';

      if (mode === 'single') {
        return (
          <div
            className="rounded-lg p-3 text-gray-900 inline-flex items-center gap-2"
            style={{ backgroundColor: bgColor, border: `1px solid ${accentColor}30` }}
          >
            <svg className="w-4 h-4" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {response.value
              ? new Date(response.value).toLocaleDateString('fr-FR')
              : <span className="text-gray-400 italic">Pas de date</span>
            }
          </div>
        );
      }

      if (mode === 'range') {
        const range = response.structured_value as DateRangeValue | null;
        return (
          <div
            className="rounded-lg p-3 text-gray-900 inline-flex items-center gap-2"
            style={{ backgroundColor: bgColor, border: `1px solid ${accentColor}30` }}
          >
            <svg className="w-4 h-4" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {range ? (
              <>
                Du {new Date(range.start).toLocaleDateString('fr-FR')} au{' '}
                {new Date(range.end).toLocaleDateString('fr-FR')}
              </>
            ) : (
              <span className="text-gray-400 italic">Pas de periode</span>
            )}
          </div>
        );
      }

      // Multiple dates
      const dates = response.structured_value as string[] | null;
      return (
        <div
          className="rounded-lg p-3 text-gray-900"
          style={{ backgroundColor: bgColor, border: `1px solid ${accentColor}30` }}
        >
          {dates && dates.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {dates.map((date, i) => (
                <span
                  key={i}
                  className="px-2 py-1 rounded text-sm"
                  style={{ backgroundColor: `${accentColor}25` }}
                >
                  {new Date(date).toLocaleDateString('fr-FR')}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-gray-400 italic">Pas de dates</span>
          )}
        </div>
      );
    }

    case 'selection': {
      const selConfig = question.config as SelectionConfig;
      const selectionType = selConfig?.selection_type || 'dropdown';

      if (selectionType === 'multiple') {
        const selections = response.structured_value as string[] | null;
        return (
          <div
            className="rounded-lg p-3 text-gray-900"
            style={{ backgroundColor: bgColor, border: `1px solid ${accentColor}30` }}
          >
            {selections && selections.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selections.map((sel, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded text-sm"
                    style={{ backgroundColor: `${accentColor}25` }}
                  >
                    {sel}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 italic">Aucune selection</span>
            )}
          </div>
        );
      }

      return (
        <div
          className="rounded-lg p-3 text-gray-900"
          style={{ backgroundColor: bgColor, border: `1px solid ${accentColor}30` }}
        >
          {response.value || <span className="text-gray-400 italic">Pas de selection</span>}
        </div>
      );
    }

    default:
      return (
        <div
          className="rounded-lg p-3 text-gray-900"
          style={{ backgroundColor: bgColor, border: `1px solid ${accentColor}30` }}
        >
          {response.value || <span className="text-gray-400 italic">Pas de reponse</span>}
        </div>
      );
  }
}

// ============================================================================
// Question Placeholder (no response yet)
// ============================================================================

interface QuestionPlaceholderProps {
  question: BriefQuestion;
}

function QuestionPlaceholder({ question }: QuestionPlaceholderProps) {
  switch (question.type) {
    case 'text_short': {
      const textConfig = question.config as TextConfig;
      const placeholder = textConfig?.placeholder || 'Reponse courte...';
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400">
          {placeholder}
        </div>
      );
    }

    case 'text_long': {
      const textConfig = question.config as TextConfig;
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
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400">Lieu</div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400">Adresse</div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400">Ville</div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400">Pays</div>
        </div>
      );

    case 'date':
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Selectionnez une date
        </div>
      );

    case 'selection': {
      const selConfig = question.config as SelectionConfig;
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 flex items-center justify-between">
          <span>Selectionnez...</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      );
    }

    default:
      return null;
  }
}

export default BriefPreview;
