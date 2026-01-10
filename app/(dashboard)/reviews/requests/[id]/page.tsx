'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Copy, Send, CheckCircle, Clock, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface ReviewRequestDetail {
  request: {
    id: string;
    title: string;
    context_text: string | null;
    status: string;
    sent_at: string;
    last_reminded_at: string | null;
    public_token: string;
  };
  recipients: Array<{
    id: string;
    email: string;
    status: string;
    sent_at: string;
    responded_at: string | null;
  }>;
  reviews: Array<{
    id: string;
    reviewer_name: string | null;
    reviewer_email: string;
    rating_overall: number | null;
    comment: string;
    reliability_level: string;
    reliability_score: number;
    is_published: boolean;
    created_at: string;
  }>;
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' }> = {
  sent: { label: 'Envoyé', variant: 'default' },
  opened: { label: 'Ouvert', variant: 'secondary' },
  responded: { label: 'Répondu', variant: 'success' },
};

export default function ReviewRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<ReviewRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reminding, setReminding] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/reviews/requests/${id}`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching request:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemind() {
    try {
      setReminding(true);
      const res = await fetch(`/api/reviews/requests/${id}/remind`, {
        method: 'POST',
      });

      if (res.ok) {
        toast.success('Relance effectuée');
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erreur lors de la relance');
      }
    } catch (error) {
      console.error('Error reminding:', error);
      toast.error('Erreur lors de la relance');
    } finally {
      setReminding(false);
    }
  }

  function copyPublicLink() {
    const link = `${window.location.origin}/r/${data?.request.public_token}`;
    navigator.clipboard.writeText(link);
    toast.success('Lien copié');
  }

  function copyReminderMessage() {
    const link = `${window.location.origin}/r/${data?.request.public_token}`;
    const message = `Bonjour,

Je me permets de vous relancer concernant ma demande d'avis sur notre collaboration récente.

Votre retour est très important pour moi et ne vous prendra que quelques minutes.

Vous pouvez laisser votre avis en suivant ce lien :
${link}

Merci d'avance pour votre temps.

Cordialement`;

    navigator.clipboard.writeText(message);
    toast.success('Message copié');
  }

  async function togglePublishReview(reviewId: string, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/reviews/${reviewId}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !currentStatus }),
      });

      if (res.ok) {
        toast.success(
          !currentStatus ? 'Avis publié' : 'Avis dépublié'
        );
        fetchData();
      }
    } catch (error) {
      console.error('Error toggling publish:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/reviews')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Card className="p-6">
          <p className="text-muted-foreground">Chargement...</p>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/reviews')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Card className="p-6">
          <p className="text-muted-foreground">Demande introuvable</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.push('/reviews')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-3xl font-bold">{data.request.title}</h1>
          <p className="text-muted-foreground">
            Envoyée le {new Date(data.request.sent_at).toLocaleDateString('fr-FR')}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={copyPublicLink}>
            <Copy className="h-4 w-4 mr-2" />
            Copier le lien
          </Button>
          {data.request.status !== 'responded' && (
            <Button onClick={handleRemind} disabled={reminding}>
              <Send className="h-4 w-4 mr-2" />
              Relancer
            </Button>
          )}
        </div>
      </div>

      {/* Contexte mission */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Contexte de la mission</h2>
        {data.request.context_text ? (
          <p className="text-sm whitespace-pre-wrap">{data.request.context_text}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun contexte fourni</p>
        )}
      </Card>

      {/* Destinataires */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Destinataires</h2>
        <div className="space-y-2">
          {data.recipients.map((recipient) => {
            const statusInfo = STATUS_LABELS[recipient.status] || STATUS_LABELS.sent;
            return (
              <div
                key={recipient.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{recipient.email}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  {recipient.responded_at && (
                    <span className="text-sm text-muted-foreground">
                      {new Date(recipient.responded_at).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Relance */}
      {data.request.status !== 'responded' && (
        <Card className="p-6 bg-muted/50">
          <h2 className="text-lg font-semibold mb-4">Message de relance</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Copiez ce message pour relancer vos contacts par email ou autre canal.
          </p>
          <Button variant="outline" onClick={copyReminderMessage}>
            <Copy className="h-4 w-4 mr-2" />
            Copier le message de relance
          </Button>
          {data.request.last_reminded_at && (
            <p className="text-sm text-muted-foreground mt-4">
              Dernière relance le{' '}
              {new Date(data.request.last_reminded_at).toLocaleDateString('fr-FR')}
            </p>
          )}
        </Card>
      )}

      {/* Avis reçus */}
      {data.reviews.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Avis reçus</h2>
          <div className="space-y-4">
            {data.reviews.map((review) => (
              <div key={review.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">
                      {review.reviewer_name || 'Anonyme'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {review.reviewer_email}
                    </div>
                    {review.rating_overall && (
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={
                              i < review.rating_overall!
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        Fiabilité: {review.reliability_score}/100
                      </div>
                      <Badge variant="secondary">{review.reliability_level}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {review.is_published ? 'Publié' : 'Non publié'}
                      </span>
                      <Switch
                        checked={review.is_published}
                        onCheckedChange={() =>
                          togglePublishReview(review.id, review.is_published)
                        }
                      />
                    </div>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{review.comment}</p>
                <div className="text-xs text-muted-foreground">
                  Reçu le {new Date(review.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
