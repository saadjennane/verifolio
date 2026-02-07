'use client';

import { MessageCircle } from 'lucide-react';
import { useTabsStore } from '@/lib/stores/tabs-store';

export function FloatingChatButton() {
  const { mobileChatOpen, toggleMobileChat } = useTabsStore();

  // Ne pas afficher si le chat est déjà ouvert
  if (mobileChatOpen) return null;

  return (
    <button
      onClick={toggleMobileChat}
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
      aria-label="Ouvrir l'assistant IA"
    >
      <MessageCircle className="w-6 h-6" />
    </button>
  );
}
