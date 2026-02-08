'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Download, Loader2 } from 'lucide-react';
import type {
  ProposalPublicView as ProposalPublicViewType,
  ProposalStatus,
  ProposalComment,
} from '@/lib/types/proposals';
import { ProposalSection } from './ProposalSection';
import { ProposalActions } from './ProposalActions';

interface ProposalPublicViewProps {
  proposal: ProposalPublicViewType;
}

const STATUS_LABELS: Record<ProposalStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
  SENT: { label: 'En attente', color: 'bg-blue-100 text-blue-700' },
  ACCEPTED: { label: 'Acceptée', color: 'bg-green-100 text-green-700' },
  REFUSED: { label: 'Refusée', color: 'bg-red-100 text-red-700' },
};

export function ProposalPublicView({ proposal }: ProposalPublicViewProps) {
  const { status: initialStatus, title, client_name, token, theme, sections, company, comments: initialComments } = proposal;
  const [comments, setComments] = useState<ProposalComment[]>(initialComments);
  const [status, setStatus] = useState<ProposalStatus>(initialStatus);
  const [isDownloading, setIsDownloading] = useState(false);

  const accentColor = theme.accentColor || '#3B82F6';
  const statusInfo = STATUS_LABELS[status];

  const handleCommentAdded = (comment: ProposalComment) => {
    setComments((prev) => [...prev, comment]);
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/public/proposals/${token}/pdf`);
      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposition-${title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{
        '--accent-color': accentColor,
        fontFamily: theme.font || 'Inter',
      } as React.CSSProperties}
    >
      {/* Header */}
      <header
        className="bg-white border-b-2 py-6 px-4 sm:px-8"
        style={{ borderColor: accentColor }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {company?.logo_url && (
                <Image
                  src={company.logo_url}
                  alt={company.name || 'Logo'}
                  width={48}
                  height={48}
                  className="h-12 w-auto object-contain"
                />
              )}
              {company?.name && (
                <span className="text-lg font-semibold text-gray-900">
                  {company.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Télécharger PDF
              </button>
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}
              >
                {statusInfo.label}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
        {/* Title & Client */}
        <div className="mb-8">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: theme.primaryColor || '#111111' }}
          >
            {title}
          </h1>
          <p className="text-sm text-gray-500 uppercase tracking-wide">
            Pour {client_name}
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <ProposalSection
              key={section.id}
              section={section}
              accentColor={accentColor}
              token={token}
              comments={comments.filter((c) => c.section_id === section.id)}
              onCommentAdded={handleCommentAdded}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="mt-12">
          <ProposalActions
            token={token}
            status={status}
            accentColor={accentColor}
            onStatusChange={setStatus}
          />
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          {company?.name && (
            <p>Proposition émise par {company.name}</p>
          )}
        </footer>
      </div>
    </div>
  );
}
