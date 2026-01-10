'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui';
import {
  buildContextFromProposal,
  buildVariableMap,
  renderTemplate,
} from '@/lib/proposals/variables';
import type { ProposalWithDetails, ProposalTheme } from '@/lib/types/proposals';

interface CompanyData {
  name?: string | null;
  logo_url?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  siret?: string | null;
  vat_number?: string | null;
}

interface ProposalViewRendererProps {
  proposal: ProposalWithDetails;
  company: CompanyData | null;
  showActions?: boolean;
}

export function ProposalViewRenderer({
  proposal,
  company,
  showActions = false,
}: ProposalViewRendererProps) {
  // Build variable map for interpolation
  const variableMap = useMemo(() => {
    const context = buildContextFromProposal({
      variables: proposal.variables?.map((v) => ({ key: v.key, value: v.value })) || [],
      deal: proposal.deal
        ? {
            title: proposal.deal.title,
            estimated_amount: (proposal.deal as { estimated_amount?: number }).estimated_amount,
            currency: (proposal.deal as { currency?: string }).currency,
            description: (proposal.deal as { description?: string }).description,
          }
        : undefined,
      client: proposal.client
        ? {
            nom: proposal.client.nom,
            email: proposal.client.email,
            telephone: (proposal.client as { telephone?: string }).telephone,
            adresse: (proposal.client as { adresse?: string }).adresse,
            ville: (proposal.client as { ville?: string }).ville,
            code_postal: (proposal.client as { code_postal?: string }).code_postal,
            pays: (proposal.client as { pays?: string }).pays,
          }
        : undefined,
      recipients: proposal.recipients?.map((r) => ({
        contact: r.contact
          ? {
              civilite: r.contact.civilite,
              prenom: r.contact.prenom,
              nom: r.contact.nom,
              email: r.contact.email,
              telephone: r.contact.telephone,
            }
          : undefined,
      })),
      company: company || undefined,
    });

    return buildVariableMap(context);
  }, [proposal, company]);

  // Get theme
  const theme: ProposalTheme = proposal.theme_override || proposal.template?.theme || {
    primaryColor: '#111111',
    accentColor: '#3B82F6',
    font: 'Inter',
  };

  // Get enabled sections sorted by position
  const sections = useMemo(() => {
    return (proposal.sections || [])
      .filter((s) => s.is_enabled)
      .sort((a, b) => a.position - b.position);
  }, [proposal.sections]);

  // Interpolate text with variables
  function interpolate(text: string): string {
    return renderTemplate(text, variableMap);
  }

  // Format date
  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Action bar (internal view only) */}
      {showActions && (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/proposals/${proposal.id}`}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </Link>
              <span className="text-sm text-gray-600">
                Aperçu de la proposition
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.print()}
              >
                Imprimer
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  window.open(`/api/pdf/proposal/${proposal.id}`, '_blank');
                }}
              >
                PDF
              </Button>
              <Link href={`/p/${proposal.public_token}`} target="_blank">
                <Button variant="secondary" size="sm">
                  Page publique
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Document container */}
      <div className="py-8 px-4 print:py-0 print:px-0">
        <div
          className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none"
          style={{ fontFamily: theme.font }}
        >
          {/* Header */}
          <header
            className="px-12 py-10 border-b-4"
            style={{ borderColor: theme.accentColor }}
          >
            <div className="flex items-start justify-between">
              {/* Company info */}
              <div className="flex items-center gap-4">
                {company?.logo_url && (
                  <Image
                    src={company.logo_url}
                    alt={company.name || 'Logo'}
                    width={64}
                    height={64}
                    className="h-16 w-auto object-contain"
                  />
                )}
                <div>
                  {company?.name && (
                    <p className="text-xl font-semibold text-gray-900">
                      {company.name}
                    </p>
                  )}
                  {company?.email && (
                    <p className="text-sm text-gray-500">{company.email}</p>
                  )}
                  {company?.phone && (
                    <p className="text-sm text-gray-500">{company.phone}</p>
                  )}
                </div>
              </div>

              {/* Status badge (print hidden) */}
              <div className="print:hidden">
                <StatusBadge status={proposal.status} />
              </div>
            </div>
          </header>

          {/* Title section */}
          <div className="px-12 py-8 bg-gray-50 border-b border-gray-200">
            <h1
              className="text-3xl font-bold mb-3"
              style={{ color: theme.primaryColor }}
            >
              {interpolate(proposal.title)}
            </h1>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div>
                <span className="text-gray-400">Pour : </span>
                <span className="font-medium text-gray-900">
                  {proposal.client?.nom}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Date : </span>
                <span>{formatDate(proposal.created_at)}</span>
              </div>
              {proposal.deal && (
                <div>
                  <span className="text-gray-400">Réf : </span>
                  <span>{proposal.deal.title}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sections */}
          <div className="px-12 py-10 space-y-10">
            {sections.map((section, idx) => (
              <section key={section.id} className="break-inside-avoid">
                <h2
                  className="text-xl font-semibold mb-4 pb-2 border-b"
                  style={{
                    color: theme.accentColor,
                    borderColor: `${theme.accentColor}30`,
                  }}
                >
                  {interpolate(section.title)}
                </h2>
                <div className="prose prose-gray max-w-none">
                  <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {interpolate(section.body)}
                  </div>
                </div>
              </section>
            ))}
          </div>

          {/* Footer */}
          <footer className="px-12 py-6 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div>
                {company?.name && <span>{company.name}</span>}
                {company?.siret && (
                  <span className="ml-4">SIRET : {company.siret}</span>
                )}
              </div>
              <div>
                Proposition émise le {formatDate(proposal.created_at)}
              </div>
            </div>
            {company?.address && (
              <p className="mt-2 text-xs text-gray-400">
                {[
                  company.address,
                  company.postal_code,
                  company.city,
                  company.country,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
          </footer>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print\\:hidden {
            display: none !important;
          }

          @page {
            margin: 15mm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    DRAFT: { label: 'Brouillon', bg: 'bg-gray-100', text: 'text-gray-700' },
    SENT: { label: 'Envoyée', bg: 'bg-blue-100', text: 'text-blue-700' },
    ACCEPTED: { label: 'Acceptée', bg: 'bg-green-100', text: 'text-green-700' },
    REFUSED: { label: 'Refusée', bg: 'bg-red-100', text: 'text-red-700' },
  };

  const { label, bg, text } = config[status] || config.DRAFT;

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
}
