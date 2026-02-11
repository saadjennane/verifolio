'use client';

import { useState } from 'react';
import { Sparkles, FileText, Mail, ListOrdered, Lightbulb, Receipt, ChevronDown } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type AIAction = 'summarize' | 'structure' | 'extract_actions' | 'to_email' | 'to_proposal' | 'to_quote';

interface NoteAIActionsProps {
  noteContent: string;
  onAction: (action: AIAction, result: string) => void;
  disabled?: boolean;
}

interface ActionConfig {
  id: AIAction;
  label: string;
  icon: typeof Sparkles;
  description: string;
}

// ============================================================================
// Actions Config
// ============================================================================

const AI_ACTIONS: ActionConfig[] = [
  {
    id: 'summarize',
    label: 'Résumer',
    icon: Lightbulb,
    description: 'Crée un résumé concis de la note',
  },
  {
    id: 'structure',
    label: 'Structurer',
    icon: ListOrdered,
    description: 'Organise le contenu avec des titres et listes',
  },
  {
    id: 'extract_actions',
    label: 'Extraire les actions',
    icon: FileText,
    description: 'Identifie les tâches et actions à réaliser',
  },
  {
    id: 'to_email',
    label: 'Transformer en email',
    icon: Mail,
    description: 'Convertit en format email professionnel',
  },
  {
    id: 'to_proposal',
    label: 'Transformer en proposition',
    icon: FileText,
    description: 'Crée une proposition commerciale',
  },
  {
    id: 'to_quote',
    label: 'Transformer en devis',
    icon: Receipt,
    description: 'Génère une structure de devis',
  },
];

// ============================================================================
// Component
// ============================================================================

export function NoteAIActions({ noteContent, onAction, disabled }: NoteAIActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<AIAction | null>(null);

  const handleAction = async (action: AIAction) => {
    if (!noteContent.trim()) return;

    setLoading(action);
    try {
      const res = await fetch('/api/notes/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          content: noteContent,
        }),
      });

      if (!res.ok) {
        throw new Error('Erreur lors du traitement AI');
      }

      const data = await res.json();
      onAction(action, data.result);
      setIsOpen(false);
    } catch (error) {
      console.error('AI action error:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || !noteContent.trim()}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors
          ${disabled || !noteContent.trim()
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
          }
        `}
      >
        <Sparkles className="w-4 h-4" />
        Actions IA
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-500 uppercase">
                Transformer avec l&apos;IA
              </span>
            </div>

            <div className="p-1">
              {AI_ACTIONS.map((action) => {
                const Icon = action.icon;
                const isLoading = loading === action.id;

                return (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action.id)}
                    disabled={isLoading || !!loading}
                    className={`
                      w-full text-left px-3 py-2 rounded-md transition-colors
                      ${isLoading
                        ? 'bg-purple-50 text-purple-700'
                        : 'hover:bg-gray-100 text-gray-700'
                      }
                      ${loading && !isLoading ? 'opacity-50' : ''}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="font-medium text-sm">{action.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 ml-6">
                      {action.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
