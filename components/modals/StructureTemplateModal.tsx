'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button, Input, Textarea } from '@/components/ui';
import { PROPOSAL_PRESETS } from '@/lib/proposals/presets';
import {
  PAGE_CATALOG,
  PAGE_CATEGORIES,
  getPageById,
  getDefaultPages,
  PREDEFINED_STRUCTURES,
  type ProposalPageDefinition,
  type PageCategoryId,
  type PredefinedStructureId,
} from '@/lib/proposals/page-catalog';
import type { ProposalPresetId } from '@/lib/proposals/presets/types';

// ============================================================================
// Types
// ============================================================================

interface StructureTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (proposalId: string) => void;
  dealId?: string;
  clientId?: string;
}

type Step = 'identity' | 'structure' | 'design';
type StructureMode = 'choose' | 'manual' | 'ai';

// ============================================================================
// Step Indicator Component
// ============================================================================

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps: { id: Step; label: string; number: number }[] = [
    { id: 'identity', label: 'Identite', number: 1 },
    { id: 'structure', label: 'Structure', number: 2 },
    { id: 'design', label: 'Design', number: 3 },
  ];

  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center gap-2 px-1 mb-4">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = index < currentIndex;

        return (
          <div key={step.id} className="flex items-center gap-2">
            {index > 0 && (
              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : isCompleted
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                isActive ? 'bg-white/20' : isCompleted ? 'bg-primary/30' : 'bg-muted-foreground/20'
              }`}>
                {isCompleted ? '✓' : step.number}
              </span>
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Step 1: Identity
// ============================================================================

interface StepIdentityProps {
  templateName: string;
  setTemplateName: (name: string) => void;
  templateDescription: string;
  setTemplateDescription: (desc: string) => void;
  onNext: () => void;
}

function StepIdentity({
  templateName,
  setTemplateName,
  templateDescription,
  setTemplateDescription,
  onNext,
}: StepIdentityProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Nom de la template
          </label>
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Ex : Proposition spectacle entreprise"
            className="w-full"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description <span className="text-muted-foreground font-normal">(optionnel)</span>
          </label>
          <Textarea
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            placeholder="Ex : Pour mes prestations de mentalisme en seminaire"
            rows={2}
            className="w-full resize-none"
          />
        </div>
      </div>

      {/* Info box */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-muted-foreground">
            Cette template pourra etre reutilisee pour creer autant de propositions que vous le souhaitez.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={onNext} disabled={!templateName.trim()}>
          Continuer
        </Button>
      </DialogFooter>
    </div>
  );
}

// ============================================================================
// Step 2: Structure - Mode Selection
// ============================================================================

interface StepStructureModeProps {
  onSelectMode: (mode: StructureMode) => void;
  onBack: () => void;
}

function StepStructureMode({ onSelectMode, onBack }: StepStructureModeProps) {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Comment souhaitez-vous construire votre template ?
      </p>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onSelectMode('manual')}
          className="p-6 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-accent/50 transition-all text-left group"
        >
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h3 className="font-semibold text-foreground mb-1">Choisir mes pages</h3>
          <p className="text-sm text-muted-foreground">
            Selectionnez les pages que vous voulez inclure
          </p>
        </button>

        <button
          onClick={() => onSelectMode('ai')}
          className="p-6 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-accent/50 transition-all text-left group"
        >
          <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
            <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h3 className="font-semibold text-foreground mb-1">Me laisser guider</h3>
          <p className="text-sm text-muted-foreground">
            Decrivez votre besoin, l&apos;IA propose une structure
          </p>
        </button>
      </div>

      {/* Info box */}
      <div className="p-4 bg-muted/50 border border-border rounded-lg">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-muted-foreground">
            Vous pourrez ajouter, retirer ou reordonner les pages a tout moment dans l&apos;editeur.
          </p>
        </div>
      </div>

      <DialogFooter className="justify-start">
        <Button variant="secondary" onClick={onBack}>
          ← Retour
        </Button>
      </DialogFooter>
    </div>
  );
}

// ============================================================================
// Step 2: Structure - Manual Page Selection
// ============================================================================

interface StepStructureManualProps {
  selectedPageIds: string[];
  setSelectedPageIds: (ids: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

function StepStructureManual({
  selectedPageIds,
  setSelectedPageIds,
  onNext,
  onBack,
}: StepStructureManualProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const selectedPages = selectedPageIds
    .map(id => getPageById(id))
    .filter((p): p is ProposalPageDefinition => p !== undefined);

  const availablePages = PAGE_CATALOG.filter(p => !selectedPageIds.includes(p.id));

  const handleAddPage = (pageId: string) => {
    setSelectedPageIds([...selectedPageIds, pageId]);
  };

  const handleRemovePage = (pageId: string) => {
    const page = getPageById(pageId);
    if (page?.isLocked) return;
    setSelectedPageIds(selectedPageIds.filter(id => id !== pageId));
  };

  const handleDragStart = (index: number) => {
    const page = selectedPages[index];
    if (page?.isLocked) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || index === 0) return; // Can't drop on cover
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || index === 0) return;

    const newIds = [...selectedPageIds];
    const [draggedId] = newIds.splice(draggedIndex, 1);
    newIds.splice(index, 0, draggedId);
    setSelectedPageIds(newIds);

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const applyPredefinedStructure = (structureId: PredefinedStructureId) => {
    setSelectedPageIds(PREDEFINED_STRUCTURES[structureId].pageIds);
  };

  return (
    <div className="space-y-4">
      {/* Quick structure selection */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Structures predefinies
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PREDEFINED_STRUCTURES).map(([id, structure]) => (
            <button
              key={id}
              onClick={() => applyPredefinedStructure(id as PredefinedStructureId)}
              className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-full transition-colors"
            >
              {structure.name}
            </button>
          ))}
        </div>
      </div>

      {/* Selected pages */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Pages selectionnees ({selectedPages.length})
        </label>
        <div className="space-y-1 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
          {selectedPages.map((page, index) => (
            <div
              key={page.id}
              draggable={!page.isLocked}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                dragOverIndex === index ? 'bg-primary/10 border-2 border-primary border-dashed' : 'bg-muted/50 hover:bg-muted'
              } ${draggedIndex === index ? 'opacity-50' : ''}`}
            >
              <span className={`cursor-${page.isLocked ? 'default' : 'grab'} text-muted-foreground`}>
                {page.isLocked ? '🔒' : '≡'}
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">{page.name}</span>
              {!page.isLocked && (
                <button
                  onClick={() => handleRemovePage(page.id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors"
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

      {/* Available pages by category */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Ajouter des pages
        </label>
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {(Object.keys(PAGE_CATEGORIES) as PageCategoryId[]).map(categoryId => {
            const categoryPages = availablePages.filter(p => p.category === categoryId);
            if (categoryPages.length === 0) return null;

            return (
              <div key={categoryId}>
                <p className="text-xs text-muted-foreground mb-1.5">{PAGE_CATEGORIES[categoryId].label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {categoryPages.map(page => (
                    <button
                      key={page.id}
                      onClick={() => handleAddPage(page.id)}
                      className="px-2.5 py-1 text-sm bg-background border border-border hover:border-primary hover:bg-primary/5 rounded-md transition-colors"
                      title={page.description}
                    >
                      + {page.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="secondary" onClick={onBack}>
          ← Retour
        </Button>
        <Button onClick={onNext} disabled={selectedPageIds.length < 2}>
          Continuer vers le design
        </Button>
      </DialogFooter>
    </div>
  );
}

// ============================================================================
// Step 2: Structure - AI Mode
// ============================================================================

interface StepStructureAIProps {
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  selectedPageIds: string[];
  setSelectedPageIds: (ids: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

// Mapping from AI page names to catalog IDs
const PAGE_NAME_TO_ID: Record<string, string> = {
  'Couverture': 'cover',
  'Contexte / Compréhension du besoin': 'introduction',
  'Rappel du brief': 'brief',
  'Notre solution': 'solution',
  'Périmètre de la mission': 'scope',
  'Livrables': 'deliverables',
  'Planning': 'planning',
  'Budget / Tarifs': 'budget',
  'Méthodologie': 'methodology',
  'À propos': 'about',
  'Nos références': 'references',
  'Concept': 'concept',
  'Moodboard': 'moodboard',
  'Détails techniques': 'technical',
  'Prochaines étapes': 'next-steps',
  'Contact': 'contact',
  'Page libre': 'introduction', // Fallback to introduction for free page
};

interface AISuggestion {
  name: string;
  reason: string;
}

function StepStructureAI({
  aiPrompt,
  setAiPrompt,
  selectedPageIds,
  setSelectedPageIds,
  onNext,
  onBack,
}: StepStructureAIProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);

  const generateStructure = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/proposal-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la génération');
      }

      const data = await response.json();
      const pages: AISuggestion[] = data.data?.pages || [];

      // Store suggestions for display
      setSuggestions(pages);

      // Map AI page names to catalog IDs
      const suggestedIds: string[] = pages
        .map(page => PAGE_NAME_TO_ID[page.name])
        .filter((id): id is string => id !== undefined);

      // Ensure cover is always first
      if (!suggestedIds.includes('cover')) {
        suggestedIds.unshift('cover');
      }

      setSelectedPageIds(suggestedIds);
      setHasGenerated(true);
    } catch (err) {
      console.error('AI generation error:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsGenerating(false);
    }
  }, [aiPrompt, setSelectedPageIds]);

  const selectedPages = selectedPageIds
    .map(id => getPageById(id))
    .filter((p): p is ProposalPageDefinition => p !== undefined);

  if (!hasGenerated) {
    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Decrivez votre besoin en une phrase
          </label>
          <Textarea
            value={aiPrompt}
            onChange={(e) => {
              setAiPrompt(e.target.value);
              setError(null);
            }}
            placeholder="Ex : Proposition pour une prestation de mentalisme en entreprise avec budget et planning"
            rows={3}
            className="w-full resize-none"
            autoFocus
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}

        {/* Examples */}
        <div className="p-4 bg-muted/50 border border-border rounded-lg">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            💡 Exemples
          </p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>&bull; &quot;Proposition de refonte de site web pour PME&quot;</li>
            <li>&bull; &quot;Devis formation sur 3 jours avec livrables&quot;</li>
            <li>&bull; &quot;Accompagnement strategique sur 6 mois&quot;</li>
          </ul>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" onClick={onBack}>
            ← Retour
          </Button>
          <Button onClick={generateStructure} disabled={!aiPrompt.trim() || isGenerating}>
            {isGenerating ? (
              <>
                <span className="animate-spin mr-2">◐</span>
                Generation...
              </>
            ) : (
              <>✨ Generer une structure</>
            )}
          </Button>
        </DialogFooter>
      </div>
    );
  }

  // Helper to find AI suggestion for a page
  const getSuggestionForPage = (pageId: string): AISuggestion | undefined => {
    return suggestions.find(s => PAGE_NAME_TO_ID[s.name] === pageId);
  };

  // Show generated result
  return (
    <div className="space-y-4">
      <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
        <p className="text-sm text-muted-foreground">
          ✨ Structure suggeree basee sur : &quot;{aiPrompt}&quot;
        </p>
      </div>

      {/* Selected pages with AI reasons */}
      <div className="space-y-2 max-h-72 overflow-y-auto border border-border rounded-lg p-3">
        {selectedPages.map((page, index) => {
          const suggestion = getSuggestionForPage(page.id);
          return (
            <div
              key={page.id}
              className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="flex-1 text-sm font-medium text-foreground">{page.name}</span>
                {!page.isLocked && (
                  <button
                    onClick={() => setSelectedPageIds(selectedPageIds.filter(id => id !== page.id))}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    title="Retirer cette page"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {suggestion?.reason && (
                <p className="text-xs text-muted-foreground mt-1.5 ml-8 italic">
                  {suggestion.reason}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="p-3 bg-muted/50 border border-border rounded-lg">
        <p className="text-sm text-muted-foreground">
          ℹ️ Vous pouvez ajuster cette selection avant de continuer. Tout reste modifiable ensuite.
        </p>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="secondary" onClick={() => {
          setHasGenerated(false);
          setSuggestions([]);
        }}>
          ← Modifier ma demande
        </Button>
        <Button onClick={onNext} disabled={selectedPageIds.length < 2}>
          Continuer vers le design
        </Button>
      </DialogFooter>
    </div>
  );
}

// ============================================================================
// Step 3: Design - Style Preview Component
// ============================================================================

function StylePreview({ presetId }: { presetId: ProposalPresetId }) {
  switch (presetId) {
    case 'classic':
      return (
        <div className="w-full h-full bg-white flex flex-col p-2">
          {/* Header avec bordure bottom */}
          <div className="border-b-2 border-slate-800 pb-1.5 mb-2">
            <div className="h-2 bg-slate-800 rounded w-2/3" />
          </div>
          {/* Section avec numéro */}
          <div className="flex gap-1.5 mb-1.5">
            <div className="w-4 h-4 rounded-full bg-blue-500 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-1.5 bg-gray-300 rounded w-full" />
              <div className="h-1.5 bg-gray-200 rounded w-4/5" />
            </div>
          </div>
          {/* Section avec numéro */}
          <div className="flex gap-1.5">
            <div className="w-4 h-4 rounded-full bg-blue-500 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-1.5 bg-gray-300 rounded w-full" />
              <div className="h-1.5 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        </div>
      );

    case 'modern':
      return (
        <div className="w-full h-full bg-white flex flex-col">
          {/* Gradient band en haut */}
          <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-400" />
          <div className="p-2 flex-1 flex flex-col gap-1.5">
            <div className="h-2 bg-gray-800 rounded w-1/2" />
            {/* Card arrondie */}
            <div className="bg-blue-50 rounded-lg p-1.5 space-y-1">
              <div className="h-1.5 bg-gray-300 rounded w-full" />
              <div className="h-1.5 bg-gray-200 rounded w-4/5" />
            </div>
            {/* Card arrondie */}
            <div className="bg-gray-50 rounded-lg p-1.5 space-y-1 border border-gray-200">
              <div className="h-1.5 bg-gray-300 rounded w-full" />
            </div>
          </div>
        </div>
      );

    case 'minimal':
      return (
        <div className="w-full h-full bg-white flex flex-col items-center p-3">
          {/* Centré avec beaucoup d'espace */}
          <div className="h-1.5 bg-gray-300 rounded w-1/3 mb-1" />
          <div className="w-6 h-px bg-gray-400 my-1.5" />
          <div className="h-1 bg-gray-200 rounded w-1/4 mb-3" />
          {/* Contenu centré */}
          <div className="w-full space-y-1.5">
            <div className="h-1.5 bg-gray-200 rounded w-full" />
            <div className="h-1.5 bg-gray-200 rounded w-5/6 mx-auto" />
            <div className="h-1.5 bg-gray-200 rounded w-full" />
          </div>
        </div>
      );

    case 'elegant':
      return (
        <div className="w-full h-full bg-white flex flex-col p-2">
          {/* Header élégant */}
          <div className="text-center mb-1.5">
            <div className="h-2 bg-gray-700 rounded w-1/2 mx-auto" />
          </div>
          {/* Ligne décorative gradient */}
          <div className="h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mb-2" />
          {/* Section avec bordure gauche */}
          <div className="border-l-2 border-purple-400 pl-2 space-y-1 mb-2">
            <div className="h-1.5 bg-gray-300 rounded w-full" />
            <div className="h-1.5 bg-gray-200 rounded w-4/5" />
          </div>
          <div className="border-l-2 border-purple-400 pl-2 space-y-1">
            <div className="h-1.5 bg-gray-300 rounded w-full" />
            <div className="h-1.5 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      );

    case 'professional':
      return (
        <div className="w-full h-full bg-white flex flex-col">
          {/* Header sombre */}
          <div className="bg-emerald-700 p-1.5 flex justify-between items-center">
            <div className="h-1.5 bg-white/80 rounded w-1/3" />
            <div className="h-1.5 bg-white/60 rounded w-1/4" />
          </div>
          {/* Grille 2 colonnes */}
          <div className="p-2 flex-1 space-y-1.5">
            <div className="flex gap-1">
              <div className="flex-1 bg-gray-100 p-1 rounded-sm">
                <div className="h-1 bg-gray-300 rounded w-full" />
              </div>
              <div className="flex-1 bg-gray-100 p-1 rounded-sm">
                <div className="h-1 bg-gray-300 rounded w-full" />
              </div>
            </div>
            <div className="bg-gray-100 border-l-2 border-emerald-600 p-1">
              <div className="h-1.5 bg-gray-400 rounded w-2/3" />
            </div>
          </div>
          {/* Footer plein */}
          <div className="bg-emerald-700 h-2" />
        </div>
      );

    case 'creative':
      return (
        <div className="w-full h-full bg-white flex">
          {/* Sidebar verticale */}
          <div className="w-3 bg-gradient-to-b from-amber-500 to-orange-600 flex-shrink-0" />
          {/* Contenu principal */}
          <div className="flex-1 p-2 flex flex-col gap-1.5">
            <div className="h-2.5 bg-gray-800 rounded w-2/3" />
            <div className="border-l-2 border-amber-500 pl-1.5 space-y-1">
              <div className="h-1.5 bg-gray-300 rounded w-full" />
              <div className="h-1.5 bg-gray-200 rounded w-4/5" />
            </div>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded-lg bg-amber-100 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-1.5 bg-gray-300 rounded" />
              </div>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

// ============================================================================
// Step 3: Design
// ============================================================================

interface StepDesignProps {
  selectedPreset: ProposalPresetId;
  setSelectedPreset: (preset: ProposalPresetId) => void;
  onBack: () => void;
  onSubmit: () => void;
  isCreating: boolean;
}

function StepDesign({
  selectedPreset,
  setSelectedPreset,
  onBack,
  onSubmit,
  isCreating,
}: StepDesignProps) {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Choisissez un style visuel pour votre template.
      </p>

      {/* Design presets grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {PROPOSAL_PRESETS.map((preset) => {
          const isSelected = selectedPreset === preset.id;

          return (
            <button
              key={preset.id}
              onClick={() => setSelectedPreset(preset.id)}
              className={`relative p-3 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/50 bg-card'
              }`}
            >
              {/* Visual preview */}
              <div className="mb-2 aspect-[3/4] rounded overflow-hidden border border-border">
                <StylePreview presetId={preset.id} />
              </div>

              {/* Info */}
              <div>
                <h4 className="font-medium text-sm text-foreground">{preset.name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-1">{preset.description}</p>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Info box */}
      <div className="p-4 bg-muted/50 border border-border rounded-lg">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-muted-foreground">
            Le style peut etre modifie a tout moment sans affecter votre contenu.
          </p>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="secondary" onClick={onBack} disabled={isCreating}>
          ← Retour
        </Button>
        <Button onClick={onSubmit} disabled={isCreating}>
          {isCreating ? (
            <>
              <span className="animate-spin mr-2">◐</span>
              Creation...
            </>
          ) : (
            <>Creer la template ✓</>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ============================================================================
// Main Modal Component
// ============================================================================

export function StructureTemplateModal({
  isOpen,
  onClose,
  onCreated,
  dealId,
  clientId,
}: StructureTemplateModalProps) {
  // Step state
  const [step, setStep] = useState<Step>('identity');
  const [structureMode, setStructureMode] = useState<StructureMode>('choose');

  // Form state
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>(() =>
    getDefaultPages().map(p => p.id)
  );
  const [selectedPreset, setSelectedPreset] = useState<ProposalPresetId>('classic');
  const [aiPrompt, setAiPrompt] = useState('');

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('identity');
      setStructureMode('choose');
      setTemplateName('');
      setTemplateDescription('');
      setSelectedPageIds(getDefaultPages().map(p => p.id));
      setSelectedPreset('classic');
      setAiPrompt('');
      setError('');
    }
  }, [isOpen]);

  // Navigation
  const goToStructureMode = () => setStep('structure');
  const goToStructureManual = () => setStructureMode('manual');
  const goToStructureAI = () => setStructureMode('ai');
  const goToDesign = () => setStep('design');
  const goBackToIdentity = () => setStep('identity');
  const goBackToStructureMode = () => setStructureMode('choose');
  const goBackToStructure = () => setStep('structure');

  // Create template
  const handleCreate = async () => {
    setIsCreating(true);
    setError('');

    try {
      // Get selected pages with their content
      const pages = selectedPageIds
        .map((id, index) => {
          const page = getPageById(id);
          if (!page) return null;
          return {
            title: page.name,
            is_cover: page.isCover || false,
            sort_order: index,
            content: page.defaultContent,
          };
        })
        .filter(Boolean);

      // Debug: log pages being sent
      console.log('[Wizard] Creating with pages:', pages.length);
      pages.forEach((p, i) => {
        const pg = p as { title: string; content?: { type?: string; content?: unknown[] } };
        console.log(`[Wizard] Page ${i} "${pg.title}": content type=${pg.content?.type}, nodes=${pg.content?.content?.length || 0}`);
      });

      const res = await fetch('/api/proposals/from-wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: templateName,
          description: templateDescription,
          preset_id: selectedPreset,
          pages,
          deal_id: dealId,
          client_id: clientId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la creation');
        return;
      }

      onCreated(data.data.id);
      onClose();
    } catch {
      setError('Erreur de connexion');
    } finally {
      setIsCreating(false);
    }
  };

  // Get step title
  const getStepTitle = () => {
    switch (step) {
      case 'identity':
        return 'Donnez un nom a votre template';
      case 'structure':
        return structureMode === 'choose'
          ? 'Choisissez votre structure'
          : structureMode === 'manual'
            ? 'Selectionnez vos pages'
            : 'Decrivez votre besoin';
      case 'design':
        return 'Choisissez un style visuel';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isCreating && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
          <DialogDescription className="sr-only">
            Assistant de creation de template de proposition
          </DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={step} />

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-1 py-2 min-h-0">
          {step === 'identity' && (
            <StepIdentity
              templateName={templateName}
              setTemplateName={setTemplateName}
              templateDescription={templateDescription}
              setTemplateDescription={setTemplateDescription}
              onNext={goToStructureMode}
            />
          )}

          {step === 'structure' && structureMode === 'choose' && (
            <StepStructureMode
              onSelectMode={(mode) => {
                if (mode === 'manual') goToStructureManual();
                else if (mode === 'ai') goToStructureAI();
              }}
              onBack={goBackToIdentity}
            />
          )}

          {step === 'structure' && structureMode === 'manual' && (
            <StepStructureManual
              selectedPageIds={selectedPageIds}
              setSelectedPageIds={setSelectedPageIds}
              onNext={goToDesign}
              onBack={goBackToStructureMode}
            />
          )}

          {step === 'structure' && structureMode === 'ai' && (
            <StepStructureAI
              aiPrompt={aiPrompt}
              setAiPrompt={setAiPrompt}
              selectedPageIds={selectedPageIds}
              setSelectedPageIds={setSelectedPageIds}
              onNext={goToDesign}
              onBack={goBackToStructureMode}
            />
          )}

          {step === 'design' && (
            <StepDesign
              selectedPreset={selectedPreset}
              setSelectedPreset={setSelectedPreset}
              onBack={goBackToStructure}
              onSubmit={handleCreate}
              isCreating={isCreating}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
