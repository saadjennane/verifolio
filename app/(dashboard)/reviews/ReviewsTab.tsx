'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/switch';
import { Star } from 'lucide-react';

interface Review {
  id: string;
  reviewer_name: string | null;
  reviewer_email: string;
  reviewer_company: string | null;
  rating_overall: number | null;
  comment: string;
  reliability_level: 'low' | 'medium' | 'high';
  is_published: boolean;
  created_at: string;
  client_id: string;
}

const RELIABILITY_LABELS: Record<string, { label: string; variant: 'destructive' | 'secondary' | 'default' }> = {
  low: { label: 'Faible', variant: 'destructive' },
  medium: { label: 'Moyenne', variant: 'secondary' },
  high: { label: 'Élevée', variant: 'default' },
};

export default function ReviewsTab() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [clients, setClients] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Filtres
  const [filterPublished, setFilterPublished] = useState<string>('all');
  const [filterMinRating, setFilterMinRating] = useState<string>('all');

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    try {
      setLoading(true);

      const res = await fetch('/api/reviews');
      const data = await res.json();

      if (data.reviews) {
        setReviews(data.reviews);

        // Récupérer les clients
        const resClients = await fetch('/api/clients');
        const dataClients = await resClients.json();
        if (dataClients.clients) {
          const clientsMap: Record<string, any> = {};
          for (const client of dataClients.clients) {
            clientsMap[client.id] = client;
          }
          setClients(clientsMap);
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  }

  async function togglePublish(reviewId: string, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/reviews/${reviewId}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !currentStatus }),
      });

      if (res.ok) {
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId ? { ...r, is_published: !currentStatus } : r
          )
        );
      }
    } catch (error) {
      console.error('Error toggling publish:', error);
    }
  }

  // Filtrage
  const filteredReviews = reviews.filter((review) => {
    // Filtre published
    if (filterPublished === 'published' && !review.is_published) return false;
    if (filterPublished === 'unpublished' && review.is_published) return false;

    // Filtre note minimale
    if (filterMinRating !== 'all') {
      const minRating = parseInt(filterMinRating, 10);
      if (!review.rating_overall || review.rating_overall < minRating) return false;
    }

    return true;
  });

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Chargement...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Statut</label>
            <select
              value={filterPublished}
              onChange={(e) => setFilterPublished(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous</option>
              <option value="published">Publiés</option>
              <option value="unpublished">Non publiés</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Note minimale</label>
            <select
              value={filterMinRating}
              onChange={(e) => setFilterMinRating(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toutes</option>
              <option value="4">≥ 4 étoiles</option>
              <option value="5">5 étoiles</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Liste */}
      {filteredReviews.length === 0 ? (
        <Card className="p-6">
          <p className="text-muted-foreground">Aucun avis trouvé.</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reviewer</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Fiabilité</TableHead>
                <TableHead>Commentaire</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Publié</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.map((review) => {
                const client = clients[review.client_id];
                const reliabilityInfo = RELIABILITY_LABELS[review.reliability_level];

                return (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {review.reviewer_name || 'Anonyme'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {review.reviewer_email}
                        </div>
                        {review.reviewer_company && (
                          <div className="text-sm text-muted-foreground">
                            {review.reviewer_company}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{client?.nom || '-'}</TableCell>
                    <TableCell>
                      {review.rating_overall ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{review.rating_overall}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={reliabilityInfo.variant}>
                        {reliabilityInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate text-sm">{review.comment}</p>
                    </TableCell>
                    <TableCell>
                      {new Date(review.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={review.is_published}
                        onCheckedChange={() => togglePublish(review.id, review.is_published)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
