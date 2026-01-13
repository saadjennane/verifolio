'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import {
  buildContextFromProposal,
  buildVariableMap,
  renderTemplate,
} from '@/lib/proposals/variables';
import { renderProposal, DEFAULT_PROPOSAL_THEME, DEFAULT_PROPOSAL_VISUAL_OPTIONS } from '@/lib/proposals/presets';
import type { ProposalRenderContext, ProposalTheme as PresetTheme, ProposalVisualOptions } from '@/lib/proposals/presets/types';
import type { ProposalWithDetails, ProposalTheme, ProposalPresetId } from '@/lib/types/proposals';

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

  // Interpolate text with variables
  function interpolate(text: string): string {
    return renderTemplate(text, variableMap);
  }

  // Get preset ID (proposal override > template > default)
  const presetId: ProposalPresetId = proposal.preset_id || proposal.template?.preset_id || 'classic';

  // Get theme (convert from proposals theme to preset theme)
  const proposalTheme: ProposalTheme = proposal.theme_override || proposal.template?.theme || {
    primaryColor: '#111111',
    accentColor: '#3B82F6',
    font: 'Inter',
  };

  const theme: PresetTheme = {
    primaryColor: proposalTheme.primaryColor,
    accentColor: proposalTheme.accentColor,
    fontFamily: proposalTheme.font === 'Inter' ? 'sans' :
                proposalTheme.font === 'Georgia' ? 'serif' :
                proposalTheme.font === 'Courier' ? 'mono' : 'sans',
  };

  // Get visual options (merge template defaults with proposal overrides)
  const templateOptions: ProposalVisualOptions = {
    showLogo: proposal.template?.show_logo ?? DEFAULT_PROPOSAL_VISUAL_OPTIONS.showLogo,
    showLogoOnAllPages: DEFAULT_PROPOSAL_VISUAL_OPTIONS.showLogoOnAllPages,
    coverImageUrl: proposal.template?.cover_image_url || undefined,
    showTableOfContents: proposal.template?.show_table_of_contents ?? DEFAULT_PROPOSAL_VISUAL_OPTIONS.showTableOfContents,
    showSectionNumbers: proposal.template?.show_section_numbers ?? DEFAULT_PROPOSAL_VISUAL_OPTIONS.showSectionNumbers,
    showPageNumbers: proposal.template?.show_page_numbers ?? DEFAULT_PROPOSAL_VISUAL_OPTIONS.showPageNumbers,
    footerText: proposal.template?.footer_text || undefined,
    watermark: DEFAULT_PROPOSAL_VISUAL_OPTIONS.watermark,
  };

  const visualOptions: ProposalVisualOptions = {
    ...templateOptions,
    ...(proposal.visual_options_override || {}),
  };

  // Get enabled sections sorted by position
  const sections = useMemo(() => {
    return (proposal.sections || [])
      .filter((s) => s.is_enabled)
      .sort((a, b) => a.position - b.position);
  }, [proposal.sections]);

  // Build render context for the preset
  const renderContext: ProposalRenderContext = useMemo(() => ({
    title: interpolate(proposal.title),
    sections: sections.map(s => ({
      id: s.id,
      title: interpolate(s.title),
      body: interpolate(s.body),
      position: s.position,
      is_enabled: s.is_enabled,
    })),
    company: company ? {
      name: company.name || '',
      logoUrl: company.logo_url || undefined,
      email: company.email || undefined,
      phone: company.phone || undefined,
      address: [company.address, company.postal_code, company.city].filter(Boolean).join(', ') || undefined,
    } : {
      name: 'Mon Entreprise',
    },
    client: proposal.client ? {
      name: proposal.client.nom,
      contactName: undefined,
      email: proposal.client.email || undefined,
      address: undefined,
    } : undefined,
  }), [proposal, company, sections, interpolate]);

  // Render the proposal HTML using the preset
  const htmlContent = useMemo(() => {
    return renderProposal(presetId, renderContext, theme, visualOptions);
  }, [presetId, renderContext, theme, visualOptions]);

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
              <StatusBadge status={proposal.status} />
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

      {/* Document container - rendered via iframe for proper CSS isolation */}
      <div className="py-8 px-4 print:py-0 print:px-0">
        <div className="max-w-4xl mx-auto">
          <iframe
            srcDoc={htmlContent}
            className="w-full bg-white shadow-lg print:shadow-none"
            style={{ minHeight: '1123px', border: 'none' }}
            title="Aperçu de la proposition"
          />
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
