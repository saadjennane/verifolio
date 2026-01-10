import { Sidebar } from '@/components/layout/Sidebar';
import { TabsContainer } from '@/components/layout/TabsContainer';
import { ActivityHistoryPanel } from '@/components/activity/ActivityHistoryPanel';
import { ContextualChat } from '@/components/chat/ContextualChat';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <TabsContainer />
      <ActivityHistoryPanel />
      <ContextualChat />
      {/* children kept for URL fallback routing */}
      <div className="hidden">{children}</div>
    </div>
  );
}
