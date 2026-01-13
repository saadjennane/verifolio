'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { useChatStore, type Message } from '@/lib/stores/chat-store';
import { ChatModeButton } from '@/components/chat/ChatModeButton';
import { WorkingBlock } from '@/components/chat/WorkingBlock';

export function ChatPanelWrapper() {
  const { chatPanelOpen, chatPanelWidth, setChatPanelWidth } = useTabsStore();
  const {
    messages,
    addMessage,
    clearMessages,
    mode,
    working,
    startWorking,
    completeCurrentStep,
    stopWorking,
    toggleWorkingCollapse,
    clearWorking,
  } = useChatStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Resize handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = window.innerWidth - e.clientX;
    setChatPanelWidth(newWidth);
  }, [isResizing, setChatPanelWidth]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userContent = input.trim();
    addMessage({ role: 'user', content: userContent });
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userContent,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          mode, // Envoyer le mode actuel à l'API
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur de communication avec l'assistant");
      }

      const data = await response.json();

      // Si des étapes de travail sont retournées, les afficher
      if (data.workingSteps && data.workingSteps.length > 0) {
        startWorking(data.workingSteps);
        // Simuler la progression des étapes (en réalité déjà terminées côté serveur)
        for (let i = 0; i < data.workingSteps.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          completeCurrentStep();
        }
      }

      addMessage({ role: 'assistant', content: data.message });

      // Nettoyer le working block après un délai
      if (data.workingSteps && data.workingSteps.length > 0) {
        setTimeout(() => {
          clearWorking();
        }, 3000);
      }
    } catch (error) {
      console.error('Chat error:', error);
      clearWorking();
      addMessage({
        role: 'assistant',
        content: "Désolé, une erreur s'est produite. Veuillez réessayer.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!chatPanelOpen) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className="flex flex-col bg-muted border-l border-border relative"
      style={{ width: chatPanelWidth }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`
          absolute left-0 top-0 bottom-0 w-1 cursor-col-resize
          hover:bg-primary transition-colors
          ${isResizing ? 'bg-primary' : 'bg-transparent'}
        `}
        title="Redimensionner"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
        <h2 className="font-medium text-foreground">Assistant</h2>
        <button
          onClick={() => clearMessages()}
          className="text-xs text-muted-foreground hover:text-foreground"
          title="Nouvelle conversation"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message: Message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[90%] rounded-lg px-3 py-2 text-sm
                ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-foreground'
                }
              `}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {/* Working Block - checklist des étapes en cours */}
        {working.steps.length > 0 && (
          <WorkingBlock
            steps={working.steps}
            isCollapsed={working.isCollapsed}
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

        {loading && !working.isActive && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-lg px-3 py-2">
              <div className="flex gap-1">
                <span
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background">
        {/* Mode selector */}
        <div className="px-3 pt-3 pb-2 flex items-center justify-between">
          <ChatModeButton />
          <span className="text-xs text-muted-foreground">Cliquez pour changer</span>
        </div>

        {/* Message input */}
        <form onSubmit={handleSubmit} className="px-3 pb-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Votre message..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={loading}
            />
            <Button type="submit" disabled={!input.trim() || loading} size="sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
