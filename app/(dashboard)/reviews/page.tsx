'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import RequestsTab from './RequestsTab';
import ReviewsTab from './ReviewsTab';

export default function ReviewsPage() {
  const [activeTab, setActiveTab] = useState('requests');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Avis clients</h1>
          <p className="text-muted-foreground">
            Gérez vos demandes d'avis et témoignages clients
          </p>
        </div>
        <Button onClick={() => window.location.href = '/reviews/requests/new'}>
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
