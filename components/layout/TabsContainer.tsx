'use client';

import { TabsBar } from './TabsBar';
import { TabContent } from './TabContent';

export function TabsContainer() {
  return (
    <div className="flex flex-col flex-1 min-w-0 bg-background">
      <TabsBar />
      <div className="flex-1 overflow-hidden">
        <TabContent />
      </div>
    </div>
  );
}
