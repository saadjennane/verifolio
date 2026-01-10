'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { BriefTemplateEditor } from '@/components/briefs/BriefTemplateEditor';
import type { BriefTemplateWithQuestions, BriefTemplateQuestion } from '@/lib/briefs/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BriefTemplateEditorPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [template, setTemplate] = useState<BriefTemplateWithQuestions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchTemplate() {
      try {
        const res = await fetch(`/api/briefs/templates/${id}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Template introuvable');
          return;
        }

        setTemplate(data.data);
      } catch {
        setError('Erreur de connexion');
      } finally {
        setIsLoading(false);
      }
    }

    fetchTemplate();
  }, [id]);

  const handleSave = async (updates: Partial<BriefTemplateWithQuestions>) => {
    if (!template) return;

    // Update template metadata (name, description)
    if (updates.name !== undefined || updates.description !== undefined) {
      const res = await fetch(`/api/briefs/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updates.name,
          description: updates.description,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update template');
      }
    }

    // Update questions if changed
    if (updates.questions) {
      await syncQuestions(template.questions || [], updates.questions);
    }

    // Update local state
    setTemplate((prev) =>
      prev
        ? {
            ...prev,
            ...updates,
          }
        : null
    );
  };

  // Sync questions: handle additions, updates, and deletions
  const syncQuestions = async (
    oldQuestions: BriefTemplateQuestion[],
    newQuestions: BriefTemplateQuestion[]
  ) => {
    const oldIds = new Set(oldQuestions.map((q) => q.id));
    const newIds = new Set(newQuestions.map((q) => q.id));

    // Find deleted questions (in old but not in new)
    const deletedIds = [...oldIds].filter((id) => !newIds.has(id));

    // Find added questions (temp- prefix means new)
    const addedQuestions = newQuestions.filter((q) => q.id.startsWith('temp-'));

    // Find updated questions (in both, but may have changed)
    const updatedQuestions = newQuestions.filter(
      (q) => !q.id.startsWith('temp-') && oldIds.has(q.id)
    );

    // Delete removed questions
    for (const questionId of deletedIds) {
      await fetch(`/api/briefs/templates/${id}/questions/${questionId}`, {
        method: 'DELETE',
      });
    }

    // Add new questions
    for (const question of addedQuestions) {
      const res = await fetch(`/api/briefs/templates/${id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: question.type,
          label: question.label,
          position: question.position,
          is_required: question.is_required,
          config: question.config,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update the question ID in local state
        setTemplate((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            questions: prev.questions.map((q) =>
              q.id === question.id ? { ...q, id: data.data.id } : q
            ),
          };
        });
      }
    }

    // Update existing questions
    for (const question of updatedQuestions) {
      const oldQuestion = oldQuestions.find((q) => q.id === question.id);
      if (!oldQuestion) continue;

      // Check if anything changed
      if (
        oldQuestion.type !== question.type ||
        oldQuestion.label !== question.label ||
        oldQuestion.position !== question.position ||
        oldQuestion.is_required !== question.is_required ||
        JSON.stringify(oldQuestion.config) !== JSON.stringify(question.config)
      ) {
        await fetch(`/api/briefs/templates/${id}/questions/${question.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: question.type,
            label: question.label,
            position: question.position,
            is_required: question.is_required,
            config: question.config,
          }),
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            {error || 'Template introuvable'}
          </h2>
          <button
            onClick={() => router.push('/settings')}
            className="text-blue-600 hover:text-blue-700"
          >
            Retour aux parametres
          </button>
        </div>
      </div>
    );
  }

  return <BriefTemplateEditor template={template} onSave={handleSave} />;
}
