'use client';

import { useState, useEffect, useCallback } from 'react';
import { BriefEditor } from '@/components/briefs/BriefEditor';
import { BriefPreview } from '@/components/briefs/BriefPreview';
import { useTabsStore } from '@/lib/stores/tabs-store';
import type { BriefWithDetails, BriefQuestion } from '@/lib/briefs/types';

interface BriefDetailTabProps {
  briefId: string;
}

export function BriefDetailTab({ briefId }: BriefDetailTabProps) {
  const { updateTabTitle } = useTabsStore();
  const [brief, setBrief] = useState<BriefWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load brief
  useEffect(() => {
    async function loadBrief() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/briefs/${briefId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Erreur lors du chargement');
        }

        setBrief(data.data);
        updateTabTitle(briefId, data.data.title);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadBrief();
  }, [briefId, updateTabTitle]);

  // Save brief
  const handleSave = useCallback(
    async (updates: Partial<BriefWithDetails>) => {
      if (!brief) return;

      try {
        // Update title if changed
        if (updates.title && updates.title !== brief.title) {
          const res = await fetch(`/api/briefs/${briefId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: updates.title }),
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Erreur lors de la sauvegarde');
          }

          setBrief((prev) => (prev ? { ...prev, title: updates.title! } : null));
          updateTabTitle(briefId, updates.title);
        }

        // Update questions if changed
        if (updates.questions) {
          const res = await fetch(`/api/briefs/${briefId}/questions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questions: updates.questions }),
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Erreur lors de la sauvegarde des questions');
          }

          const data = await res.json();
          setBrief((prev) =>
            prev ? { ...prev, questions: data.data as BriefQuestion[] } : null
          );
        }
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [brief, briefId, updateTabTitle]
  );

  // Send brief
  const handleSend = useCallback(async () => {
    if (!brief) return;

    try {
      const res = await fetch(`/api/briefs/${briefId}/send`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'envoi");
      }

      const data = await res.json();
      setBrief((prev) =>
        prev
          ? {
              ...prev,
              status: 'SENT',
              public_token: data.data.public_token,
              sent_at: new Date().toISOString(),
            }
          : null
      );

      // Show public link
      const publicUrl = `${window.location.origin}/b/${data.data.public_token}`;
      alert(`Brief envoye!\n\nLien public: ${publicUrl}`);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [brief, briefId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-blue-600 hover:underline"
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">Brief non trouve</p>
      </div>
    );
  }

  // If RESPONDED, show preview with responses
  if (brief.status === 'RESPONDED') {
    return (
      <div className="h-full overflow-auto bg-gray-100 p-8">
        <BriefPreview brief={brief} showResponses={true} />
      </div>
    );
  }

  // Otherwise, show editor (editable if DRAFT, read-only if SENT)
  return (
    <BriefEditor
      brief={brief}
      onSave={handleSave}
      onSend={handleSend}
    />
  );
}
