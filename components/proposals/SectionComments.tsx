'use client';

import { useState } from 'react';
import type { ProposalComment } from '@/lib/types/proposals';

interface SectionCommentsProps {
  sectionId: string;
  sectionTitle: string;
  comments: ProposalComment[];
  token: string;
  accentColor: string;
  onCommentAdded: (comment: ProposalComment) => void;
}

export function SectionComments({
  sectionId,
  sectionTitle,
  comments,
  token,
  accentColor,
  onCommentAdded,
}: SectionCommentsProps) {
  const [isOpen, setIsOpen] = useState(comments.length > 0);
  const [authorName, setAuthorName] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const sectionComments = comments.filter((c) => c.section_id === sectionId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/public/proposals/${token}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          authorName: authorName.trim() || null,
          body: body.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'envoi');
        return;
      }

      onCommentAdded(data.data);
      setBody('');
      setAuthorName('');
    } catch {
      setError('Erreur de connexion');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          Commentaires
          {sectionComments.length > 0 && (
            <span className="ml-1 text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">
              {sectionComments.length}
            </span>
          )}
        </span>
      </button>

      {isOpen && (
        <div className="mt-3 pl-4 border-l-2 border-gray-200">
          {/* Existing comments */}
          {sectionComments.length > 0 && (
            <div className="space-y-3 mb-4">
              {sectionComments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        comment.author_type === 'client'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {comment.author_type === 'client' ? 'Client' : 'Équipe'}
                    </span>
                    {comment.author_name && (
                      <span className="text-sm font-medium text-gray-700">
                        {comment.author_name}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(comment.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {comment.body}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Add comment form */}
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="text"
              placeholder="Votre nom (optionnel)"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
              maxLength={100}
            />
            <textarea
              placeholder="Ajouter un commentaire..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
              rows={2}
              maxLength={2000}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!body.trim() || isSubmitting}
                className="px-4 py-1.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: accentColor }}
              >
                {isSubmitting ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
