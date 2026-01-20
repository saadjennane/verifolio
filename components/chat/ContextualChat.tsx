'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui';
import { useTabsStore, type EntityType } from '@/lib/stores/tabs-store';
import { useContextStore } from '@/lib/stores/context-store';
import { useCurrentContext } from '@/lib/hooks/useCurrentContext';
import { useTriggerRefresh } from '@/lib/hooks/useRefreshTrigger';
import {
  useProactiveSuggestions,
  type ScreenSuggestion,
} from '@/lib/hooks/useProactiveSuggestions';
import { ChatModeButton } from '@/components/chat/ChatModeButton';
import { WorkingBlock } from '@/components/chat/WorkingBlock';
import { ProactiveSuggestionsList } from '@/components/chat/ProactiveSuggestion';
import { contextIdToString } from '@/lib/chat/context';
import { initialWorkingState, type WorkingState } from '@/lib/chat/working';

// Interface pour les entités créées retournées par l'API
interface EntityCreated {
  type: string;
  id: string;
  title: string;
}

// Limite de caractères pour les messages
const MAX_MESSAGE_LENGTH = 1000;

// Détecter l'intention de l'utilisateur pour afficher des étapes préliminaires
function detectPreliminarySteps(message: string): string[] {
  const lower = message.toLowerCase();

  // Modification de client (email, téléphone, etc.) - doit être AVANT création
  // "Ajoute le mail X au client Y" = modification, pas création
  if (lower.includes('client') &&
      (lower.includes('mail') || lower.includes('email') || lower.includes('téléphone') ||
       lower.includes('telephone') || lower.includes('adresse'))) {
    return [
      'Analyse de la demande',
      'Recherche du client',
      'Mise à jour du client',
    ];
  }

  // Création de client avec champs personnalisés (ICE, SIRET)
  // "Crée un client X avec ICE Y" = création avec custom fields
  if ((lower.includes('crée') || lower.includes('créer') || lower.includes('ajoute un client') || lower.includes('ajoute le client')) &&
      lower.includes('client') &&
      (lower.includes('ice') || lower.includes('siret'))) {
    return [
      'Analyse de la demande',
      'Vérification du client existant',
      'Création du client',
      'Ajout des champs personnalisés',
    ];
  }

  // Création de client simple
  // "Crée un client X" ou "Ajoute un client X"
  if ((lower.includes('crée') || lower.includes('créer') || lower.includes('ajoute un client') || lower.includes('ajoute le client')) &&
      lower.includes('client')) {
    return [
      'Analyse de la demande',
      'Vérification du client existant',
      'Création du client',
    ];
  }

  // Création de devis
  if ((lower.includes('crée') || lower.includes('créer')) &&
      (lower.includes('devis') || lower.includes('quote'))) {
    return [
      'Analyse de la demande',
      'Recherche du client',
      'Création du devis',
    ];
  }

  // Création de facture
  if ((lower.includes('crée') || lower.includes('créer')) &&
      lower.includes('facture')) {
    return [
      'Analyse de la demande',
      'Recherche du client',
      'Création de la facture',
    ];
  }

  // Modification/mise à jour générique
  if (lower.includes('modif') || lower.includes('change') || lower.includes('met à jour')) {
    return ['Analyse de la demande', 'Mise à jour des données'];
  }

  // Questions/recherches
  if (lower.includes('?') || lower.includes('combien') || lower.includes('liste') || lower.includes('montre')) {
    return ['Recherche des données'];
  }

  return [];
}

// Détecter si un message demande une confirmation
function detectConfirmationRequest(content: string): { detected: boolean; options: string[] } {
  // Patterns de demande de confirmation
  const confirmPatterns = [
    /\(Oui\s*\/\s*Non\)/i,
    /\(Oui\s*\/\s*Modifier\s*\/\s*Non\)/i,
    /\(Oui\s*\/\s*Non\s*\/\s*Modifier\)/i,
    /Confirmer.*\?\s*\(Oui/i,
    /Je vais (créer|modifier|supprimer|envoyer).*Confirmer/i,
  ];

  const hasConfirmRequest = confirmPatterns.some(p => p.test(content));

  if (hasConfirmRequest) {
    // Déterminer les options disponibles
    if (/Modifier/i.test(content)) {
      return { detected: true, options: ['Oui', 'Non', 'Modifier'] };
    }
    return { detected: true, options: ['Oui', 'Non'] };
  }

  return { detected: false, options: [] };
}

/**
 * ChatPanel avec gestion de contexte basée sur l'URL
 * Chaque page/entité a son propre historique de conversation
 */
export function ContextualChat() {
  // Hydration guard - wait for client-side hydration
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const { chatPanelOpen, chatPanelWidth, setChatPanelWidth, openTab } = useTabsStore();
  const triggerRefresh = useTriggerRefresh();

  // Context management
  const {
    contextId,
    contextLabel,
    messages,
    mode,
    working: contextWorking,
  } = useCurrentContext();

  const {
    addMessage,
    clearMessages,
    setWorking,
  } = useContextStore();

  // Proactive suggestions (screen-based)
  const {
    suggestions,
    loading: suggestionsLoading,
    dismissSuggestion,
  } = useProactiveSuggestions(contextId);

  // Local state
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [localWorking, setLocalWorking] = useState<WorkingState>(initialWorkingState);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [errorMessageIds, setErrorMessageIds] = useState<Set<string>>(new Set());
  const [pendingEntity, setPendingEntity] = useState<EntityCreated | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync local working with context working (from store to local)
  // Only sync steps and isActive, NOT isCollapsed (which is UI-only state)
  useEffect(() => {
    if (contextWorking) {
      setLocalWorking(prev => ({
        ...contextWorking,
        isCollapsed: prev.isCollapsed, // Preserve local collapse state
      }));
    } else {
      setLocalWorking(prev => ({
        ...initialWorkingState,
        isCollapsed: prev.isCollapsed, // Preserve local collapse state
      }));
    }
  }, [contextWorking]);

  // Sync local working to store (from local to store) - avoids calling setWorking inside setLocalWorking
  const prevLocalWorkingRef = useRef<WorkingState>(initialWorkingState);
  useEffect(() => {
    // Only sync if localWorking changed (excluding isCollapsed which is UI-only)
    const prevWithoutCollapse = { ...prevLocalWorkingRef.current, isCollapsed: false };
    const currWithoutCollapse = { ...localWorking, isCollapsed: false };

    if (JSON.stringify(prevWithoutCollapse) !== JSON.stringify(currWithoutCollapse)) {
      prevLocalWorkingRef.current = localWorking;
      // Only update store if we're in a working state that we initiated
      if (localWorking.isActive || localWorking.steps.length > 0) {
        setWorking(localWorking);
      }
    }
  }, [localWorking, setWorking]);

  // Improved scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  useEffect(() => {
    // Petit délai pour laisser le DOM se mettre à jour
    const timer = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

  // Resize handling with min/max constraints
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(280, Math.min(600, window.innerWidth - e.clientX));
      setChatPanelWidth(newWidth);
    },
    [isResizing, setChatPanelWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Working state helpers
  const startWorking = (steps: string[]) => {
    const newWorking: WorkingState = {
      isActive: true,
      isCollapsed: false,
      steps: steps.map((label, index) => ({
        id: `step-${Date.now()}-${index}`,
        label,
        status: index === 0 ? 'in_progress' : 'pending',
      })),
      contextId: contextId ? contextIdToString(contextId) : null,
    };
    setLocalWorking(newWorking);
  };

  const completeCurrentStep = useCallback(() => {
    setLocalWorking(prev => {
      const steps = [...prev.steps];
      const currentIndex = steps.findIndex((s) => s.status === 'in_progress');

      if (currentIndex >= 0 && currentIndex < steps.length - 1) {
        steps[currentIndex] = { ...steps[currentIndex], status: 'completed' };
        steps[currentIndex + 1] = { ...steps[currentIndex + 1], status: 'in_progress' };
      } else if (currentIndex >= 0) {
        steps[currentIndex] = { ...steps[currentIndex], status: 'completed' };
      }

      return {
        ...prev,
        steps,
        isActive: steps.some((s) => s.status === 'in_progress' || s.status === 'pending'),
      };
    });
  }, []);

  const stopWorking = useCallback(() => {
    setLocalWorking(prev => ({
      ...prev,
      isActive: false,
      steps: prev.steps.map((step) =>
        step.status === 'in_progress' || step.status === 'pending'
          ? { ...step, status: 'cancelled' as const }
          : step
      ),
    }));
  }, []);

  const clearWorking = useCallback(() => {
    setLocalWorking(initialWorkingState);
  }, []);

  const toggleWorkingCollapse = useCallback(() => {
    setLocalWorking(prev => ({ ...prev, isCollapsed: !prev.isCollapsed }));
  }, []);

  // Handle accepting a proactive suggestion
  const handleAcceptSuggestion = async (suggestion: ScreenSuggestion) => {
    dismissSuggestion(suggestion.id);
    const prompt = suggestion.prompt;
    setInput(prompt);

    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }, 100);
  };

  // Handle clearing messages with confirmation
  const handleClearMessages = () => {
    if (showClearConfirm) {
      clearMessages();
      setShowClearConfirm(false);
      setErrorMessageIds(new Set());
      setPendingEntity(null);
    } else {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 3000);
    }
  };

  // Ouvrir l'entité créée
  const handleOpenEntity = useCallback(() => {
    if (!pendingEntity) return;

    const typeToPath: Record<string, string> = {
      clients: '/clients',
      invoices: '/invoices',
      quotes: '/quotes',
      deals: '/deals',
      missions: '/missions',
      proposals: '/proposals',
      briefs: '/briefs',
      contacts: '/contacts',
      reviews: '/reviews',
    };

    const basePath = typeToPath[pendingEntity.type];
    if (basePath) {
      openTab(
        {
          type: pendingEntity.type.slice(0, -1) as 'client' | 'invoice' | 'quote' | 'deal' | 'mission' | 'proposal' | 'brief' | 'contact' | 'review',
          path: `${basePath}/${pendingEntity.id}`,
          title: pendingEntity.title,
          entityId: pendingEntity.id,
        },
        true
      );
      setPendingEntity(null);
    }
  }, [pendingEntity, openTab]);

  // Envoyer une réponse rapide (pour les boutons de confirmation)
  const handleQuickReply = useCallback((reply: string) => {
    setInput(reply);
    // Soumettre après un court délai pour que l'état soit mis à jour
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }, 50);
  }, []);

  // Vérifier si le dernier message demande une confirmation
  const lastAssistantMessage = messages.filter(m => m.role === 'assistant').slice(-1)[0];
  const confirmationRequest = lastAssistantMessage
    ? detectConfirmationRequest(lastAssistantMessage.content)
    : { detected: false, options: [] };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userContent = input.trim().slice(0, MAX_MESSAGE_LENGTH);
    addMessage({ role: 'user', content: userContent });
    setInput('');
    setLoading(true);

    // Détecter et afficher immédiatement les étapes préliminaires
    const preliminarySteps = detectPreliminarySteps(userContent);
    let stepIndex = 0;
    let progressInterval: NodeJS.Timeout | null = null;

    if (preliminarySteps.length > 0) {
      // Créer les étapes avec la première en cours
      const workingState: WorkingState = {
        isActive: true,
        isCollapsed: false,
        steps: preliminarySteps.map((label, index) => ({
          id: `step-${Date.now()}-${index}`,
          label,
          status: index === 0 ? 'in_progress' : 'pending',
        })),
        contextId: contextId ? contextIdToString(contextId) : null,
      };
      setLocalWorking(workingState);

      // Progresser automatiquement toutes les 1.5s
      progressInterval = setInterval(() => {
        stepIndex++;
        if (stepIndex < preliminarySteps.length) {
          setLocalWorking(prev => {
            const newSteps = prev.steps.map((s, i) => ({
              ...s,
              status: i < stepIndex ? 'completed' as const :
                      i === stepIndex ? 'in_progress' as const : 'pending' as const
            }));
            return { ...prev, steps: newSteps };
          });
        }
      }, 1500);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userContent,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          mode,
          contextId: contextId ? contextIdToString(contextId) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur de communication avec l'assistant");
      }

      // Arrêter la progression automatique
      if (progressInterval) {
        clearInterval(progressInterval);
      }

      // Compléter toutes les étapes préliminaires et garder collapsed
      if (preliminarySteps.length > 0) {
        setLocalWorking(prev => {
          const newSteps = prev.steps.map(s => ({ ...s, status: 'completed' as const }));
          // Garder visible mais collapsed après complétion
          return { ...prev, steps: newSteps, isActive: false, isCollapsed: true };
        });
      }

      // Si des étapes de travail supplémentaires sont retournées par l'API, les afficher
      if (data.workingSteps && data.workingSteps.length > 0 && preliminarySteps.length === 0) {
        startWorking(data.workingSteps);
        for (let i = 0; i < data.workingSteps.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          completeCurrentStep();
        }
      }

      addMessage({ role: 'assistant', content: data.message });

      // Gérer les entités créées : refresh + stocker pour proposition d'ouverture
      if (data.entitiesCreated && data.entitiesCreated.length > 0) {
        const entities = data.entitiesCreated as EntityCreated[];

        // Déclencher le refresh pour chaque type d'entité modifié
        const refreshedTypes = new Set<string>();
        for (const entity of entities) {
          if (!refreshedTypes.has(entity.type)) {
            triggerRefresh(entity.type as EntityType);
            refreshedTypes.add(entity.type);
          }
        }

        // Stocker l'entité pour permettre l'ouverture via clic
        const firstEntity = entities[0];
        if (firstEntity) {
          setPendingEntity(firstEntity);
        }
      }

      // Ne pas clear les steps - les garder visibles en collapsed
    } catch (error) {
      console.error('Chat error:', error);
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      clearWorking();

      const errorMessage = error instanceof Error
        ? error.message
        : "Désolé, une erreur s'est produite. Veuillez réessayer.";

      // Marquer ce message comme erreur
      const errorId = Date.now().toString();
      setErrorMessageIds((prev) => new Set([...prev, errorId]));

      addMessage({
        role: 'assistant',
        content: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  // Detecter si un message est une erreur (basé sur le contenu)
  const isErrorMessage = (content: string) => {
    const errorPatterns = [
      /erreur/i,
      /error/i,
      /désolé/i,
      /impossible/i,
      /échoué/i,
      /failed/i,
      /timeout/i,
      /problème de connexion/i,
    ];
    return errorPatterns.some((pattern) => pattern.test(content));
  };

  if (!chatPanelOpen) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className="flex flex-col bg-gray-50 border-l border-gray-200 relative"
      style={{ width: chatPanelWidth, minWidth: 280, maxWidth: 600 }}
    >
      {/* Resize handle - larger for easier grabbing */}
      <div
        onMouseDown={handleMouseDown}
        className={`
          absolute left-0 top-0 bottom-0 w-2 cursor-col-resize
          hover:bg-blue-500/50 transition-colors
          ${isResizing ? 'bg-blue-500' : 'bg-transparent'}
        `}
        title="Redimensionner"
      />

      {/* Header with context indicator */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-gray-900">Assistant</h2>
          {contextLabel && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {contextLabel}
            </span>
          )}
        </div>
        <button
          onClick={handleClearMessages}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            showClearConfirm
              ? 'bg-red-100 text-red-600 hover:bg-red-200'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
          title={showClearConfirm ? 'Cliquez pour confirmer' : 'Nouvelle conversation'}
          aria-label={showClearConfirm ? 'Confirmer la suppression' : 'Nouvelle conversation'}
        >
          {showClearConfirm ? (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Effacer ?
            </span>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {isHydrated && messages.map((message) => {
          const isError = message.role === 'assistant' && isErrorMessage(message.content);

          return (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[90%] rounded-lg px-3 py-2 text-sm
                  ${
                    isError
                      ? 'bg-red-50 border border-red-200 text-red-900'
                      : message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }
                `}
              >
                {isError && (
                  <div className="flex items-center gap-1.5 mb-1.5 text-red-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-medium">Erreur</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
            </div>
          );
        })}

        {/* Proactive Suggestions */}
        {isHydrated && !loading && !localWorking.isActive && (suggestions.length > 0 || suggestionsLoading) && (
          <ProactiveSuggestionsList
            suggestions={suggestions}
            onAccept={handleAcceptSuggestion}
            onDismiss={dismissSuggestion}
            loading={suggestionsLoading}
          />
        )}

        {/* Working Block */}
        {localWorking.steps.length > 0 && (
          <WorkingBlock
            steps={localWorking.steps}
            isCollapsed={localWorking.isCollapsed}
            onToggleCollapse={toggleWorkingCollapse}
            onStop={() => {
              stopWorking();
              addMessage({
                role: 'assistant',
                content: 'Action interrompue.',
              });
            }}
          />
        )}

        {/* Boutons de confirmation rapide */}
        {isHydrated && confirmationRequest.detected && !loading && (
          <div className="flex justify-start px-2 gap-2">
            {confirmationRequest.options.map((option) => (
              <button
                key={option}
                onClick={() => handleQuickReply(option)}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  option === 'Oui'
                    ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                    : option === 'Non'
                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {/* Bouton pour ouvrir l'entité créée */}
        {pendingEntity && !loading && (
          <div className="flex justify-start px-2">
            <button
              onClick={handleOpenEntity}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ouvrir « {pendingEntity.title} »
            </button>
          </div>
        )}

        {/* Loading indicator */}
        {loading && !localWorking.isActive && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
                <span className="text-xs text-gray-500">L&apos;assistant réfléchit...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white">
        {/* Mode selector */}
        <div className="px-3 pt-3 pb-2 flex items-center justify-between">
          <ChatModeButton />
          <span className="text-xs text-gray-500">Cliquez pour changer</span>
        </div>

        {/* Message input */}
        <form onSubmit={handleSubmit} className="px-3 pb-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH));
                  // Auto-resize textarea
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={(e) => {
                  // Soumettre avec Enter (sans Shift)
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !loading) {
                      handleSubmit(e);
                    }
                  }
                }}
                placeholder="Votre message..."
                maxLength={MAX_MESSAGE_LENGTH}
                rows={1}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-14 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-y-auto"
                style={{ minHeight: '38px', maxHeight: '120px' }}
                disabled={loading}
                aria-label="Message à envoyer"
              />
              {input.length > 0 && (
                <span
                  className={`absolute right-3 bottom-2 text-xs ${
                    input.length >= MAX_MESSAGE_LENGTH * 0.9 ? 'text-amber-500' : 'text-gray-400'
                  } ${input.length >= MAX_MESSAGE_LENGTH ? 'text-red-500' : ''}`}
                >
                  {input.length}/{MAX_MESSAGE_LENGTH}
                </span>
              )}
            </div>
            <Button
              type="submit"
              disabled={!input.trim() || loading}
              size="sm"
              aria-label="Envoyer le message"
              className="mb-0.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
