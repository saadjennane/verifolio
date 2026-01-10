'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/Button';
import { useTabsStore } from '@/lib/stores/tabs-store';
import RequestsTab from '@/app/(dashboard)/reviews/RequestsTab';
import ReviewsTab from '@/app/(dashboard)/reviews/ReviewsTab';

export function ReviewsListTab() {
  const { openTab } = useTabsStore();
  const [activeTab, setActiveTab] = useState('requests');

  function handleNewRequest() {
    openTab({
      type: 'new-review-request',
      path: '/reviews/requests/new',
      title: 'Nouvelle demande d\'avis',
    });
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Avis clients</h1>
          <p className="text-gray-500 text-sm">
            Gérez vos demandes d'avis et témoignages clients
          </p>
        </div>
        <Button onClick={handleNewRequest}>
          Nouvelle demande
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests">Demandes</TabsTrigger>
          <TabsTrigger value="reviews">Avis reçus</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-6">
          <RequestsTab />
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <ReviewsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
