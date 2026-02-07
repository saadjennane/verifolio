'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { X, Send, Mic, ChevronDown } from 'lucide-react';
import { useTabsStore, type EntityType } from '@/lib/stores/tabs-store';
import { useContextStore } from '@/lib/stores/context-store';
import { useCurrentContext } from '@/lib/hooks/useCurrentContext';
import { useTriggerRefresh } from '@/lib/hooks/useRefreshTrigger';
import { ChatModeButton } from '@/components/chat/ChatModeButton';
import { WorkingBlock } from '@/components/chat/WorkingBlock';
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

/**
 * Parse simple markdown (bold, italic, lists) to React elements
 */
function parseSimpleMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    const listMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (listMatch) {
      const [, indent, content] = listMatch;
      const indentLevel = Math.floor(indent.length / 2);
      elements.push(
        <div key={lineIndex} className="flex gap-2" style={{ marginLeft: indentLevel * 16 }}>
          <span className="text-muted-foreground">•</span>
          <span>{parseInlineMarkdown(content)}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={lineIndex} className="h-2" />);
    } else {
      elements.push(
        <div key={lineIndex}>{parseInlineMarkdown(line)}</div>
      );
    }
  });

  return <>{elements}</>;
}

function parseInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let key = 0;

  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      parts.push(<strong key={key++} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={key++}>{match[3]}</em>);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

// Détecter l'intention de l'utilisateur pour afficher des étapes préliminaires
function detectPreliminarySteps(message: string): string[] {
  const lower = message.toLowerCase();

  if (lower.includes('client') &&
      (lower.includes('mail') || lower.includes('email') || lower.includes('téléphone') ||
       lower.includes('telephone') || lower.includes('adresse'))) {
    return ['Analyse de la demande', 'Recherche du client', 'Mise à jour du client'];
  }

  if ((lower.includes('crée') || lower.includes('créer') || lower.includes('ajoute un client') || lower.includes('ajoute le client')) &&
      lower.includes('client')) {
    return ['Analyse de la demande', 'Vérification du client existant', 'Création du client'];
  }

  if ((lower.includes('crée') || lower.includes('créer')) &&
      (lower.includes('devis') || lower.includes('quote'))) {
    return ['Analyse de la demande', 'Recherche du client', 'Création du devis'];
  }

  if ((lower.includes('crée') || lower.includes('créer')) && lower.includes('facture')) {
    return ['Analyse de la demande', 'Recherche du client', 'Création de la facture'];
  }

  if (lower.includes('modif') || lower.includes('change') || lower.includes('met à jour')) {
    return ['Analyse de la demande', 'Mise à jour des données'];
  }

  if (lower.includes('?') || lower.includes('combien') || lower.includes('liste') || lower.includes('montre')) {
    return ['Recherche des données'];
  }

  return [];
}

// Détecter si un message demande une confirmation
function detectConfirmationRequest(content: string): { detected: boolean; options: string[] } {
  const confirmPatterns = [
    /\(Oui\s*\/\s*Non\)/i,
    /\(Oui\s*\/\s*Modifier\s*\/\s*Non\)/i,
    /\(Oui\s*\/\s*Non\s*\/\s*Modifier\)/i,
    /Confirmer.*\?\s*\(Oui/i,
    /Je vais (créer|modifier|supprimer|envoyer).*Confirmer/i,
  ];

  const hasConfirmRequest = confirmPatterns.some(p => p.test(content));

  if (hasConfirmRequest) {
    if (/Modifier/i.test(content)) {
      return { detected: true, options: ['Oui', 'Non', 'Modifier'] };
    }
    return { detected: true, options: ['Oui', 'Non'] };
  }

  return { detected: false, options: [] };
}

export function MobileChatModal() {
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const { mobileChatOpen, setMobileChatOpen, openTab } = useTabsStore();
  const triggerRefresh = useTriggerRefresh();

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

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [localWorking, setLocalWorking] = useState<WorkingState>(initialWorkingState);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [pendingEntity, setPendingEntity] = useState<EntityCreated | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync local working with context working
  useEffect(() => {
    if (contextWorking) {
      setLocalWorking(prev => ({
        ...contextWorking,
        isCollapsed: prev.isCollapsed,
      }));
    } else {
      setLocalWorking(prev => ({
        ...initialWorkingState,
        isCollapsed: prev.isCollapsed,
      }));
    }
  }, [contextWorking]);

  // Sync local working to store
  const prevLocalWorkingRef = useRef<WorkingState>(initialWorkingState);
  useEffect(() => {
    const prevWithoutCollapse = { ...prevLocalWorkingRef.current, isCollapsed: false };
    const currWithoutCollapse = { ...localWorking, isCollapsed: false };

    if (JSON.stringify(prevWithoutCollapse) !== JSON.stringify(currWithoutCollapse)) {
      prevLocalWorkingRef.current = localWorking;
      if (localWorking.isActive || localWorking.steps.length > 0) {
        setWorking(localWorking);
      }
    }
  }, [localWorking, setWorking]);

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileChatOpen) {
        setMobileChatOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileChatOpen, setMobileChatOpen]);

  // Bloquer le scroll du body quand ouvert
  useEffect(() => {
    if (mobileChatOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileChatOpen]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

  // Working state helpers
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

  // Clear messages
  const handleClearMessages = () => {
    if (showClearConfirm) {
      clearMessages();
      setShowClearConfirm(false);
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
      setMobileChatOpen(false);
    }
  }, [pendingEntity, openTab, setMobileChatOpen]);

  // Quick reply
  const handleQuickReply = useCallback((reply: string) => {
    setInput(reply);
    setTimeout(() => {
      const form = document.querySelector('#mobile-chat-form');
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }, 50);
  }, []);

  // Check for confirmation request
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

    const preliminarySteps = detectPreliminarySteps(userContent);
    let stepIndex = 0;
    let progressInterval: NodeJS.Timeout | null = null;

    if (preliminarySteps.length > 0) {
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

      if (progressInterval) {
        clearInterval(progressInterval);
      }

      if (preliminarySteps.length > 0) {
        setLocalWorking(prev => {
          const newSteps = prev.steps.map(s => ({ ...s, status: 'completed' as const }));
          return { ...prev, steps: newSteps, isActive: false, isCollapsed: true };
        });
      }

      addMessage({ role: 'assistant', content: data.message });

      if (data.entitiesCreated && data.entitiesCreated.length > 0) {
        const entities = data.entitiesCreated as EntityCreated[];

        const refreshedTypes = new Set<string>();
        for (const entity of entities) {
          if (!refreshedTypes.has(entity.type)) {
            triggerRefresh(entity.type as EntityType);
            refreshedTypes.add(entity.type);
          }
        }

        const firstEntity = entities[0];
        if (firstEntity) {
          setPendingEntity(firstEntity);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      clearWorking();

      const errorMessage = error instanceof Error
        ? error.message
        : "Désolé, une erreur s'est produite. Veuillez réessayer.";

      addMessage({
        role: 'assistant',
        content: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          mobileChatOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileChatOpen(false)}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out ${
          mobileChatOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ height: '90vh', maxHeight: '90vh' }}
      >
        {/* Drag handle + Header */}
        <div className="flex flex-col border-b border-border">
          {/* Drag handle */}
          <div className="flex justify-center py-2">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground">Assistant IA</h2>
              {contextLabel && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {contextLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearMessages}
                className={`p-2 rounded-full transition-colors ${
                  showClearConfirm
                    ? 'bg-destructive/10 text-destructive'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                title={showClearConfirm ? 'Confirmer' : 'Nouvelle conversation'}
              >
                {showClearConfirm ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => setMobileChatOpen(false)}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Fermer"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{ height: 'calc(100% - 140px)' }}
        >
          {isHydrated && messages.map((message) => {
            const isError = message.role === 'assistant' && isErrorMessage(message.content);
            const isUser = message.role === 'user';

            return (
              <div
                key={message.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[85%] rounded-[20px] px-4 py-2.5 text-sm shadow-sm
                    ${
                      isError
                        ? 'bg-destructive/10 text-destructive rounded-bl-[4px]'
                        : isUser
                        ? 'bg-primary text-primary-foreground rounded-br-[4px]'
                        : 'bg-card text-card-foreground rounded-bl-[4px] border border-border/50'
                    }
                  `}
                >
                  {isError && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-medium">Erreur</span>
                    </div>
                  )}
                  {isUser ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  ) : (
                    <div className="leading-relaxed">{parseSimpleMarkdown(message.content)}</div>
                  )}
                </div>
              </div>
            );
          })}

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

          {/* Confirmation buttons */}
          {isHydrated && confirmationRequest.detected && !loading && (
            <div className="flex justify-center flex-wrap gap-2 pt-2">
              {confirmationRequest.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleQuickReply(option)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-full shadow-sm transition-all active:scale-95 ${
                    option === 'Oui'
                      ? 'bg-green-500 text-white'
                      : option === 'Non'
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-card text-foreground border border-border'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* Open entity button */}
          {pendingEntity && !loading && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleOpenEntity}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary/10 text-primary rounded-full shadow-sm active:scale-95 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Ouvrir « {pendingEntity.title} »
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && !localWorking.isActive && (
            <div className="flex justify-start">
              <div className="bg-card rounded-[20px] rounded-bl-[4px] px-4 py-3 shadow-sm border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-muted-foreground">En cours...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-background border-t border-border safe-area-pb">
          <form id="mobile-chat-form" onSubmit={handleSubmit}>
            <div className="bg-muted rounded-2xl border border-border/50 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all overflow-hidden">
              <div className="px-4 pt-3 pb-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH));
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim() && !loading) {
                        handleSubmit(e);
                      }
                    }
                  }}
                  placeholder="Demandez quelque chose..."
                  maxLength={MAX_MESSAGE_LENGTH}
                  rows={1}
                  className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
                  style={{ minHeight: '24px', maxHeight: '100px' }}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between px-3 pb-2">
                <ChatModeButton compact />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="p-2 text-muted-foreground rounded-full"
                    disabled
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className={`p-2 rounded-full transition-all ${
                      input.trim() && !loading
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted-foreground/20 text-muted-foreground'
                    }`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
