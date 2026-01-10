'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Badge, Input, Textarea } from '@/components/ui';
import { useTabsStore } from '@/lib/stores/tabs-store';
import {
  buildContextFromProposal,
  buildVariableMap,
  renderTemplate,
  extractVariableKeys,
} from '@/lib/proposals/variables';
import type {
  ProposalWithDetails,
  ProposalSection,
  ProposalStatus,
  ProposalTheme,
} from '@/lib/types/proposals';

const STATUS_LABELS: Record<ProposalStatus, { label: string; variant: 'gray' | 'blue' | 'green' | 'red' }> = {
  DRAFT: { label: 'Brouillon', variant: 'gray' },
  SENT: { label: 'Envoyée', variant: 'blue' },
  ACCEPTED: { label: 'Acceptée', variant: 'green' },
  REFUSED: { label: 'Refusée', variant: 'red' },
};

interface ProposalDetailTabProps {
  proposalId: string;
}

interface CompanyData {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  siret?: string | null;
  vat_number?: string | null;
}

export function ProposalDetailTab({ proposalId }: ProposalDetailTabProps) {
  const { openTab, closeTab, activeTabId } = useTabsStore();

  const [proposal, setProposal] = useState<ProposalWithDetails | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // View mode
  const [showPreview, setShowPreview] = useState(false);

  // Editing state
  const [title, setTitle] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [sectionEdits, setSectionEdits] = useState<Record<string, { title: string; body: string }>>({});
  const [variables, setVariables] = useState<{ key: string; value: string }[]>([]);
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarValue, setNewVarValue] = useState('');

  const loadProposal = useCallback(async () => {
    try {
      const [proposalRes, companyRes] = await Promise.all([
        fetch(`/api/proposals/${proposalId}`),
        fetch('/api/settings/company'),
      ]);

      if (!proposalRes.ok) throw new Error('Failed to load proposal');

      const proposalData = await proposalRes.json();
      setProposal(proposalData.data);
      setTitle(proposalData.data.title);
      setVariables(
        proposalData.data.variables?.map((v: { key: string; value: string }) => ({
          key: v.key,
          value: v.value,
        })) || []
      );

      // Select first section by default
      if (proposalData.data.sections?.length > 0 && !selectedSectionId) {
        setSelectedSectionId(proposalData.data.sections[0].id);
      }

      if (companyRes.ok) {
        const companyData = await companyRes.json();
        setCompany(companyData.data);
      }
    } catch (err) {
      console.error('Error loading proposal:', err);
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [proposalId, selectedSectionId]);

  useEffect(() => {
    loadProposal();
  }, [loadProposal]);

  // Build variable map
  const variableMap = useMemo(() => {
    if (!proposal) return {};

    const context = buildContextFromProposal({
      variables: variables,
      deal: proposal.deal ? {
        title: proposal.deal.title,
        estimated_amount: (proposal.deal as { estimated_amount?: number }).estimated_amount,
        currency: (proposal.deal as { currency?: string }).currency,
        description: (proposal.deal as { description?: string }).description,
      } : undefined,
      client: proposal.client ? {
        nom: proposal.client.nom,
        email: proposal.client.email,
        telephone: (proposal.client as { telephone?: string }).telephone,
        adresse: (proposal.client as { adresse?: string }).adresse,
        ville: (proposal.client as { ville?: string }).ville,
        code_postal: (proposal.client as { code_postal?: string }).code_postal,
        pays: (proposal.client as { pays?: string }).pays,
      } : undefined,
      recipients: proposal.recipients?.map((r) => ({
        contact: r.contact ? {
          civilite: r.contact.civilite,
          prenom: r.contact.prenom,
          nom: r.contact.nom,
          email: r.contact.email,
          telephone: r.contact.telephone,
        } : undefined,
      })),
      company: company || undefined,
    });

    return buildVariableMap(context);
  }, [proposal, company, variables]);

  // Detect all variables used in sections
  const detectedVariables = useMemo(() => {
    if (!proposal?.sections) return [];

    const allText = proposal.sections
      .map((s) => `${s.title} ${s.body}`)
      .join(' ');

    return extractVariableKeys(allText);
  }, [proposal?.sections]);

  // Variables not yet defined
  const missingVariables = useMemo(() => {
    const defined = new Set(variables.map((v) => v.key));
    const fromContext = new Set(Object.keys(variableMap));
    return detectedVariables.filter((k) => !defined.has(k) && !fromContext.has(k));
  }, [detectedVariables, variables, variableMap]);

  async function saveTitle() {
    if (!proposal || title === proposal.title) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      if (!res.ok) throw new Error('Failed to save');
      showSuccess('Titre sauvegardé');
      await loadProposal();
    } catch (err) {
      console.error('Error saving title:', err);
      setError('Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  async function saveSection(sectionId: string) {
    const edits = sectionEdits[sectionId];
    if (!edits) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edits),
      });

      if (!res.ok) throw new Error('Failed to save section');

      setSectionEdits((prev) => {
        const newEdits = { ...prev };
        delete newEdits[sectionId];
        return newEdits;
      });
      showSuccess('Section sauvegardée');
      await loadProposal();
    } catch (err) {
      console.error('Error saving section:', err);
      setError('Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  async function toggleSectionEnabled(sectionId: string, enabled: boolean) {
    setSaving(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: enabled }),
      });

      if (!res.ok) throw new Error('Failed to toggle section');
      await loadProposal();
    } catch (err) {
      console.error('Error toggling section:', err);
      setError('Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function moveSectionUp(sectionId: string) {
    if (!proposal?.sections) return;
    const idx = proposal.sections.findIndex((s) => s.id === sectionId);
    if (idx <= 0) return;

    setSaving(true);
    try {
      // Swap positions
      const currentSection = proposal.sections[idx];
      const prevSection = proposal.sections[idx - 1];

      await Promise.all([
        fetch(`/api/proposals/${proposalId}/sections/${currentSection.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: prevSection.position }),
        }),
        fetch(`/api/proposals/${proposalId}/sections/${prevSection.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: currentSection.position }),
        }),
      ]);

      await loadProposal();
    } catch (err) {
      console.error('Error moving section:', err);
      setError('Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function moveSectionDown(sectionId: string) {
    if (!proposal?.sections) return;
    const idx = proposal.sections.findIndex((s) => s.id === sectionId);
    if (idx < 0 || idx >= proposal.sections.length - 1) return;

    setSaving(true);
    try {
      const currentSection = proposal.sections[idx];
      const nextSection = proposal.sections[idx + 1];

      await Promise.all([
        fetch(`/api/proposals/${proposalId}/sections/${currentSection.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: nextSection.position }),
        }),
        fetch(`/api/proposals/${proposalId}/sections/${nextSection.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: currentSection.position }),
        }),
      ]);

      await loadProposal();
    } catch (err) {
      console.error('Error moving section:', err);
      setError('Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function saveVariables() {
    setSaving(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/variables`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables }),
      });

      if (!res.ok) throw new Error('Failed to save variables');
      showSuccess('Variables sauvegardées');
      await loadProposal();
    } catch (err) {
      console.error('Error saving variables:', err);
      setError('Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  function addVariable() {
    if (!newVarKey.trim()) return;
    const key = newVarKey.trim().replace(/\s+/g, '_').toLowerCase();
    if (variables.some((v) => v.key === key)) {
      setError('Cette variable existe déjà');
      return;
    }
    setVariables([...variables, { key, value: newVarValue }]);
    setNewVarKey('');
    setNewVarValue('');
  }

  function removeVariable(key: string) {
    setVariables(variables.filter((v) => v.key !== key));
  }

  async function sendProposal() {
    if (!confirm('Marquer cette proposition comme envoyée ?')) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT' }),
      });

      if (!res.ok) throw new Error('Failed to send');
      showSuccess('Proposition envoyée');
      await loadProposal();
    } catch (err) {
      console.error('Error sending proposal:', err);
      setError('Erreur');
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    if (activeTabId) {
      closeTab(activeTabId);
    }
    if (proposal?.deal_id) {
      openTab(
        {
          type: 'deal',
          path: `/deals/${proposal.deal_id}`,
          title: 'Deal',
          entityId: proposal.deal_id,
        },
        true
      );
    }
  }

  function copyPublicLink() {
    if (!proposal) return;
    const url = `${window.location.origin}/p/${proposal.public_token}`;
    navigator.clipboard.writeText(url);
    showSuccess('Lien copié !');
  }

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 2000);
  }

  function interpolate(text: string): string {
    return renderTemplate(text, variableMap);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="p-6">
        <p className="text-gray-500">{error || 'Proposition introuvable'}</p>
        <Button variant="secondary" className="mt-4" onClick={handleBack}>
          Retour
        </Button>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[proposal.status];
  const theme: ProposalTheme = proposal.theme_override || proposal.template?.theme || {
    primaryColor: '#111111',
    accentColor: '#3B82F6',
    font: 'Inter',
  };
  const isEditable = proposal.status === 'DRAFT';
  const selectedSection = proposal.sections?.find((s) => s.id === selectedSectionId);
  const currentEdits = selectedSectionId ? sectionEdits[selectedSectionId] : null;
  const hasUnsavedChanges = selectedSectionId && sectionEdits[selectedSectionId];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          {isEditable ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              className="text-lg font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
            />
          ) : (
            <h1 className="text-lg font-semibold text-gray-900">{proposal.title}</h1>
          )}

          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>

          <span className="text-sm text-gray-500">
            {proposal.client?.nom} - {proposal.deal?.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showPreview ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'Éditer' : 'Prévisualiser'}
          </Button>
          <Button variant="secondary" size="sm" onClick={copyPublicLink}>
            Copier le lien
          </Button>
          {isEditable && (
            <Button size="sm" onClick={sendProposal} loading={saving}>
              Envoyer
            </Button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mx-4 mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">×</button>
        </div>
      )}
      {success && (
        <div className="mx-4 mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Main Content */}
      {showPreview ? (
        <PreviewPane
          proposal={proposal}
          theme={theme}
          interpolate={interpolate}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column - Sections List */}
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
            <div className="p-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Sections
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {proposal.sections?.map((section, idx) => (
                <div
                  key={section.id}
                  className={`border-b border-gray-100 ${
                    selectedSectionId === section.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`p-3 cursor-pointer ${!section.is_enabled ? 'opacity-50' : ''}`}
                    onClick={() => setSelectedSectionId(section.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 truncate flex-1">
                        {section.title || 'Sans titre'}
                      </span>
                      {!section.is_enabled && (
                        <span className="text-xs text-gray-400 ml-1">(off)</span>
                      )}
                    </div>
                  </div>

                  {isEditable && selectedSectionId === section.id && (
                    <div className="px-3 pb-2 flex items-center gap-1">
                      <button
                        onClick={() => moveSectionUp(section.id)}
                        disabled={idx === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Monter"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveSectionDown(section.id)}
                        disabled={idx === proposal.sections!.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Descendre"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => toggleSectionEnabled(section.id, !section.is_enabled)}
                        className={`p-1 ${section.is_enabled ? 'text-green-500' : 'text-gray-400'} hover:text-gray-600`}
                        title={section.is_enabled ? 'Masquer' : 'Afficher'}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {section.is_enabled ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          )}
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Center - Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedSection ? (
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-3xl mx-auto space-y-4">
                  <Input
                    label="Titre de la section"
                    value={currentEdits?.title ?? selectedSection.title}
                    onChange={(e) =>
                      setSectionEdits((prev) => ({
                        ...prev,
                        [selectedSection.id]: {
                          title: e.target.value,
                          body: prev[selectedSection.id]?.body ?? selectedSection.body,
                        },
                      }))
                    }
                    disabled={!isEditable}
                  />

                  <Textarea
                    label="Contenu"
                    value={currentEdits?.body ?? selectedSection.body}
                    onChange={(e) =>
                      setSectionEdits((prev) => ({
                        ...prev,
                        [selectedSection.id]: {
                          title: prev[selectedSection.id]?.title ?? selectedSection.title,
                          body: e.target.value,
                        },
                      }))
                    }
                    disabled={!isEditable}
                    rows={12}
                    placeholder="Utilisez {{variable}} pour insérer des variables dynamiques..."
                  />

                  {/* Variable hints */}
                  <div className="text-xs text-gray-500">
                    Variables disponibles : {Object.keys(variableMap).slice(0, 5).map((k) => `{{${k}}}`).join(', ')}
                    {Object.keys(variableMap).length > 5 && '...'}
                  </div>

                  {isEditable && hasUnsavedChanges && (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSectionEdits((prev) => {
                            const newEdits = { ...prev };
                            delete newEdits[selectedSection.id];
                            return newEdits;
                          });
                        }}
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={() => saveSection(selectedSection.id)}
                        loading={saving}
                      >
                        Sauvegarder
                      </Button>
                    </div>
                  )}

                  {/* Preview of this section */}
                  <div className="mt-8 border-t pt-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Aperçu</h3>
                    <div
                      className="prose prose-sm max-w-none p-4 bg-white rounded-lg border"
                      style={{ fontFamily: theme.font }}
                    >
                      <h2 style={{ color: theme.accentColor }}>
                        {interpolate(currentEdits?.title ?? selectedSection.title)}
                      </h2>
                      <div className="whitespace-pre-wrap text-gray-700">
                        {interpolate(currentEdits?.body ?? selectedSection.body)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Sélectionnez une section à éditer
              </div>
            )}
          </div>

          {/* Right Column - Variables */}
          <div className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0">
            <div className="p-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Variables
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Detected variables warning */}
              {missingVariables.length > 0 && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                  <strong>Variables non définies :</strong>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {missingVariables.map((k) => (
                      <span key={k} className="bg-amber-100 px-1.5 py-0.5 rounded">
                        {`{{${k}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Context variables (from deal, client, etc.) */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 mb-2">Contexte (auto)</h3>
                <div className="space-y-1 text-xs">
                  {Object.entries(variableMap)
                    .filter(([k]) => !variables.some((v) => v.key === k))
                    .slice(0, 10)
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2 py-1">
                        <span className="text-gray-500 truncate">{`{{${k}}}`}</span>
                        <span className="text-gray-900 truncate max-w-[120px]" title={v}>
                          {v || '-'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Custom variables */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 mb-2">Variables personnalisées</h3>
                <div className="space-y-2">
                  {variables.map((v) => (
                    <div key={v.key} className="flex items-start gap-1">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-0.5">
                          {`{{${v.key}}}`}
                        </label>
                        <input
                          type="text"
                          value={v.value}
                          onChange={(e) => {
                            setVariables(
                              variables.map((x) =>
                                x.key === v.key ? { ...x, value: e.target.value } : x
                              )
                            );
                          }}
                          disabled={!isEditable}
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
                        />
                      </div>
                      {isEditable && (
                        <button
                          onClick={() => removeVariable(v.key)}
                          className="mt-5 p-1 text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add new variable */}
              {isEditable && (
                <div className="border-t pt-3">
                  <h3 className="text-xs font-medium text-gray-500 mb-2">Ajouter une variable</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newVarKey}
                      onChange={(e) => setNewVarKey(e.target.value)}
                      placeholder="nom_variable"
                      className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={newVarValue}
                      onChange={(e) => setNewVarValue(e.target.value)}
                      placeholder="Valeur"
                      className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <Button size="sm" variant="secondary" className="w-full" onClick={addVariable}>
                      + Ajouter
                    </Button>
                  </div>
                </div>
              )}

              {/* Save variables button */}
              {isEditable && variables.length > 0 && (
                <Button size="sm" className="w-full" onClick={saveVariables} loading={saving}>
                  Sauvegarder les variables
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Preview Pane Component
// ============================================================================

interface PreviewPaneProps {
  proposal: ProposalWithDetails;
  theme: ProposalTheme;
  interpolate: (text: string) => string;
}

function PreviewPane({ proposal, theme, interpolate }: PreviewPaneProps) {
  const enabledSections = proposal.sections?.filter((s) => s.is_enabled) || [];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-100 p-8">
      <div
        className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden"
        style={{ fontFamily: theme.font }}
      >
        {/* Header */}
        <div
          className="px-8 py-6 border-b-4"
          style={{ borderColor: theme.accentColor }}
        >
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: theme.primaryColor }}
          >
            {interpolate(proposal.title)}
          </h1>
          <p className="text-gray-500">
            Pour {proposal.client?.nom}
          </p>
        </div>

        {/* Sections */}
        <div className="px-8 py-6 space-y-8">
          {enabledSections.map((section) => (
            <div key={section.id}>
              <h2
                className="text-xl font-semibold mb-3"
                style={{ color: theme.accentColor }}
              >
                {interpolate(section.title)}
              </h2>
              <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {interpolate(section.body)}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t text-center text-sm text-gray-500">
          Proposition émise le {new Date(proposal.created_at).toLocaleDateString('fr-FR')}
        </div>
      </div>
    </div>
  );
}
