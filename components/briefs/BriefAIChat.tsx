'use client';

import { useState } from 'react';
import { Button, Textarea } from '@/components/ui';
import type { BriefQuestion, BriefQuestionType } from '@/lib/briefs/types';

interface Suggestion {
  id: string;
  type: 'question' | 'improvement' | 'template';
  title: string;
  description: string;
  action?: {
    type: BriefQuestionType;
    label: string;
    config?: Record<string, unknown>;
  };
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: Suggestion[];
  timestamp: Date;
}

interface BriefAIChatProps {
  briefId: string;
  briefTitle: string;
  questions: BriefQuestion[];
  onAddQuestion: (type: BriefQuestionType, label: string, config?: Record<string, unknown>) => void;
  dealContext?: {
    title: string;
    clientName: string;
  };
}

export function BriefAIChat({
  briefId,
  briefTitle,
  questions,
  onAddQuestion,
  dealContext,
}: BriefAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Bonjour ! Je suis la pour vous aider a construire votre brief${dealContext ? ` pour "${dealContext.title}"` : ''}. Posez-moi des questions ou demandez-moi des suggestions.`,
      suggestions: getInitialSuggestions(dealContext),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response (in real implementation, this would call an API)
    setTimeout(() => {
      const assistantMessage = generateResponse(input, questions, dealContext);
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.action) {
      onAddQuestion(
        suggestion.action.type,
        suggestion.action.label,
        suggestion.action.config
      );

      // Add confirmation message
      const confirmMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `J'ai ajoute la question "${suggestion.action.label}" a votre brief.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMessage]);
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Assistant IA</h3>
            <p className="text-xs text-gray-500">Suggestions et ameliorations</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            <div
              className={`rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-50 text-blue-900 ml-4'
                  : 'bg-gray-50 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>

            {/* Suggestions */}
            {message.suggestions && message.suggestions.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">
                        {suggestion.type === 'question' && '❓'}
                        {suggestion.type === 'improvement' && '✨'}
                        {suggestion.type === 'template' && '📋'}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {suggestion.title}
                        </p>
                        <p className="text-xs text-gray-500">{suggestion.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs">Reflexion en cours...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Demandez des suggestions..."
            rows={2}
            className="text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={!input.trim() || isLoading}
          >
            Envoyer
          </Button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getInitialSuggestions(dealContext?: { title: string; clientName: string }): Suggestion[] {
  const suggestions: Suggestion[] = [
    {
      id: '1',
      type: 'question',
      title: 'Objectifs du projet',
      description: 'Ajouter une question sur les objectifs principaux',
      action: {
        type: 'text_long',
        label: 'Quels sont vos objectifs principaux pour ce projet ?',
      },
    },
    {
      id: '2',
      type: 'question',
      title: 'Budget estimatif',
      description: 'Demander une fourchette de budget',
      action: {
        type: 'selection',
        label: 'Quel est votre budget pour ce projet ?',
        config: {
          mode: 'radio',
          options: ['Moins de 5 000 €', '5 000 € - 15 000 €', '15 000 € - 50 000 €', 'Plus de 50 000 €'],
        },
      },
    },
    {
      id: '3',
      type: 'question',
      title: 'Delai souhaite',
      description: 'Ajouter une question sur les dates',
      action: {
        type: 'date',
        label: 'Quelle est la date de livraison souhaitee ?',
        config: { mode: 'single' },
      },
    },
  ];

  if (dealContext) {
    suggestions.unshift({
      id: '0',
      type: 'template',
      title: `Brief pour ${dealContext.clientName}`,
      description: 'Utiliser un modele adapte a ce client',
    });
  }

  return suggestions;
}

function generateResponse(
  input: string,
  questions: BriefQuestion[],
  dealContext?: { title: string; clientName: string }
): Message {
  const lowerInput = input.toLowerCase();

  // Simple keyword matching for demo (would be replaced by actual AI)
  if (lowerInput.includes('budget') || lowerInput.includes('prix') || lowerInput.includes('cout')) {
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Pour les questions de budget, je vous suggere plusieurs options:',
      suggestions: [
        {
          id: '1',
          type: 'question',
          title: 'Budget en fourchette',
          description: 'Selection parmi des tranches de prix',
          action: {
            type: 'selection',
            label: 'Quel est votre budget pour ce projet ?',
            config: {
              mode: 'radio',
              options: ['Moins de 5 000 €', '5 000 € - 15 000 €', '15 000 € - 50 000 €', 'Plus de 50 000 €'],
            },
          },
        },
        {
          id: '2',
          type: 'question',
          title: 'Budget exact',
          description: 'Montant precis en euros',
          action: {
            type: 'number',
            label: 'Quel est votre budget maximum (en euros) ?',
          },
        },
      ],
      timestamp: new Date(),
    };
  }

  if (lowerInput.includes('date') || lowerInput.includes('delai') || lowerInput.includes('quand')) {
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Pour les dates et delais, voici mes suggestions:',
      suggestions: [
        {
          id: '1',
          type: 'question',
          title: 'Date unique',
          description: 'Une seule date de livraison',
          action: {
            type: 'date',
            label: 'Quelle est la date de livraison souhaitee ?',
            config: { mode: 'single' },
          },
        },
        {
          id: '2',
          type: 'question',
          title: 'Periode',
          description: 'Debut et fin de projet',
          action: {
            type: 'date',
            label: 'Quelle est la periode du projet ?',
            config: { mode: 'range' },
          },
        },
      ],
      timestamp: new Date(),
    };
  }

  if (lowerInput.includes('lieu') || lowerInput.includes('adresse') || lowerInput.includes('location')) {
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Pour collecter des informations de lieu:',
      suggestions: [
        {
          id: '1',
          type: 'question',
          title: 'Adresse complete',
          description: 'Lieu, adresse, ville et pays',
          action: {
            type: 'address',
            label: 'Ou doit se derouler le projet ?',
          },
        },
      ],
      timestamp: new Date(),
    };
  }

  // Default response
  return {
    id: Date.now().toString(),
    role: 'assistant',
    content: `Je comprends votre demande. Votre brief contient actuellement ${questions.length} question${questions.length > 1 ? 's' : ''}. Voulez-vous que je vous suggere des questions supplementaires ou que j'ameliore les questions existantes ?`,
    suggestions: [
      {
        id: '1',
        type: 'improvement',
        title: 'Suggerer des questions',
        description: 'Obtenir des idees de questions pertinentes',
      },
      {
        id: '2',
        type: 'improvement',
        title: 'Analyser le brief',
        description: 'Verifier la coherence et la completude',
      },
    ],
    timestamp: new Date(),
  };
}
