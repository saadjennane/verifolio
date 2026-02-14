'use client';

import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { Sidebar } from '@/components/layout/Sidebar';
import { TabsContainer } from '@/components/layout/TabsContainer';
import { ActivityHistoryPanel } from '@/components/activity/ActivityHistoryPanel';
import { ContextualChat } from '@/components/chat/ContextualChat';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { MobileSidebarDrawer } from '@/components/layout/MobileSidebarDrawer';
import { MobileChatModal } from '@/components/chat/MobileChatModal';
import { FloatingChatButton } from '@/components/chat/FloatingChatButton';
import { CommandPalette } from '@/components/search/CommandPalette';

export function DashboardLayoutClient() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="flex flex-col h-[100dvh] bg-gray-50 dark:bg-gray-900">
        <MobileHeader />
        <main className="flex-1 overflow-hidden">
          <TabsContainer />
        </main>
        <MobileSidebarDrawer />
        <MobileChatModal />
        <FloatingChatButton />
        <CommandPalette />
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <TabsContainer />
      <ActivityHistoryPanel />
      <ContextualChat />
      <CommandPalette />
    </div>
  );
}
