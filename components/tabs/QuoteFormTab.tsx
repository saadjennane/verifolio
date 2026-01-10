'use client';

import { DocumentEditor } from '@/components/documents/DocumentEditor';

interface QuoteFormTabProps {
  quoteId?: string;
  dealId?: string;  // Obligatoire pour création - un devis DOIT être lié à un deal
}

export function QuoteFormTab({ quoteId, dealId }: QuoteFormTabProps) {
  return (
    <DocumentEditor
      type="quote"
      documentId={quoteId}
      dealId={dealId}
    />
  );
}
