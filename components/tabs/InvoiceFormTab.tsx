'use client';

import { DocumentEditor } from '@/components/documents/DocumentEditor';

interface InvoiceFormTabProps {
  invoiceId?: string;
  missionId?: string;  // Obligatoire pour création - une facture DOIT être liée à une mission
}

export function InvoiceFormTab({ invoiceId, missionId }: InvoiceFormTabProps) {
  return (
    <DocumentEditor
      type="invoice"
      documentId={invoiceId}
      missionId={missionId}
    />
  );
}
