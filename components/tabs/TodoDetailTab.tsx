'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTabsStore } from '@/lib/stores/tabs-store';

interface TodoDetailTabProps {
  todoId: string;
}

export function TodoDetailTab({ todoId }: TodoDetailTabProps) {
  const { closeTab, activeTabId, openTab } = useTabsStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, [todoId]);

  function handleBack() {
    if (activeTabId) {
      closeTab(activeTabId);
    }
    openTab({ type: 'todos', path: '/todos', title: 'Todos' }, true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Todo</h1>
        <Button variant="outline" onClick={handleBack}>
          Retour
        </Button>
      </div>

      <Card>
        <div className="p-6">
          <p className="text-gray-600">Détails du todo à venir (ID: {todoId})</p>
        </div>
      </Card>
    </div>
  );
}
