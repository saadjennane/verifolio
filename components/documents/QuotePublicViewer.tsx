'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { DocumentPreview } from './DocumentPreview';
import type { QuoteWithClientAndItems, Company } from '@/lib/supabase/types';

interface QuotePublicViewerProps {
  quote: QuoteWithClientAndItems;
  company: Company | null;
  token: string;
}

export function QuotePublicViewer({ quote, company, token }: QuotePublicViewerProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/public/pdf?type=quote&token=${token}`);
      if (!response.ok) throw new Error('Erreur téléchargement');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quote.numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Devis {quote.numero}
            </h1>
            <p className="text-sm text-gray-500">
              {company?.nom || 'Document'}
            </p>
          </div>
          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            variant="outline"
            className="gap-2"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Télécharger PDF
          </Button>
        </div>
      </header>

      {/* Contenu */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <DocumentPreview
          type="quote"
          document={quote}
          company={company}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <p className="text-center text-sm text-gray-500">
          Document généré via{' '}
          <a
            href="https://verifolio.pro"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Verifolio
          </a>
        </p>
      </footer>
    </div>
  );
}
