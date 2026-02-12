'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { CompanySettings } from '@/components/settings/CompanySettings';
import { EmailSettings } from '@/components/settings/EmailSettings';
import { ActivitiesSettings } from '@/components/settings/ActivitiesSettings';
import { CustomFieldsSettings } from '@/components/settings/CustomFieldsSettings';
import { TemplateSettings } from '@/components/settings/TemplateSettings';
import { BriefTemplatesSettings } from '@/components/settings/BriefTemplatesSettings';
import { ReviewTemplatesSettings } from '@/components/settings/ReviewTemplatesSettings';
import { ProposalTemplatesSettings } from '@/components/settings/ProposalTemplatesSettings';
import { VerifolioSettings } from '@/components/settings/VerifolioSettings';
import { NavigationSettings } from '@/components/settings/NavigationSettings';
import { TrashSettings } from '@/components/settings/TrashSettings';
import { FontsSettings } from '@/components/settings/FontsSettings';
import { ChatStylesSettings } from '@/components/settings/ChatStylesSettings';
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings';

// Section types
type SectionType = 'profile' | 'entreprise' | 'email' | 'templates' | 'verifolio' | 'integrations' | 'navigation' | 'trash' | 'fonts' | 'chat-styles';
type EntrepriseTab = 'infos' | 'activities' | 'fields';
type TemplatesTab = 'documents' | 'proposals' | 'briefs' | 'reviews';

interface SettingsTabProps {
  path?: string;
}

export function SettingsTab({ path }: SettingsTabProps) {
  // Parse query params and path from path prop
  const { params, pathSection } = useMemo(() => {
    if (!path) return { params: new URLSearchParams(), pathSection: null };

    // Check if path contains /settings/fonts or /settings/chat-styles
    const fontsMatch = path.match(/\/settings\/fonts/);
    if (fontsMatch) {
      return { params: new URLSearchParams(), pathSection: 'fonts' as SectionType };
    }

    const chatStylesMatch = path.match(/\/settings\/chat-styles/);
    if (chatStylesMatch) {
      return { params: new URLSearchParams(), pathSection: 'chat-styles' as SectionType };
    }

    const queryIndex = path.indexOf('?');
    if (queryIndex === -1) return { params: new URLSearchParams(), pathSection: null };
    return { params: new URLSearchParams(path.slice(queryIndex + 1)), pathSection: null };
  }, [path]);

  const initialSection = pathSection || (params.get('section') as SectionType) || 'profile';
  const initialTab = params.get('tab') || '';

  const [activeSection, setActiveSection] = useState<SectionType>(initialSection);
  const [entrepriseTab, setEntrepriseTab] = useState<EntrepriseTab>(
    (initialTab as EntrepriseTab) || 'infos'
  );
  const [templatesTab, setTemplatesTab] = useState<TemplatesTab>(
    (initialTab as TemplatesTab) || 'documents'
  );
  const [isTemplateEditing, setIsTemplateEditing] = useState(false);

  // Update state when path changes
  useEffect(() => {
    const section = pathSection || (params.get('section') as SectionType) || 'profile';
    const tab = params.get('tab') || '';

    setActiveSection(section);

    if (section === 'entreprise' && tab) {
      setEntrepriseTab(tab as EntrepriseTab);
    }
    if (section === 'templates' && tab) {
      setTemplatesTab(tab as TemplatesTab);
    }
  }, [params, pathSection]);

  // Get title based on section
  const getSectionTitle = () => {
    switch (activeSection) {
      case 'profile':
        return { title: 'Mon profil', subtitle: 'Gérez vos informations personnelles' };
      case 'entreprise':
        return { title: 'Entreprise', subtitle: 'Configurez les informations de votre entreprise' };
      case 'email':
        return { title: 'Emails', subtitle: 'Configurez l\'envoi des emails' };
      case 'templates':
        return { title: 'Templates', subtitle: 'Gérez vos modèles de documents' };
      case 'verifolio':
        return { title: 'Mon Verifolio', subtitle: 'Configurez votre portfolio public' };
      case 'integrations':
        return { title: 'Intégrations', subtitle: 'Connectez des services externes' };
      case 'navigation':
        return { title: 'Navigation', subtitle: 'Personnalisez la navigation de l\'application' };
      case 'trash':
        return { title: 'Corbeille', subtitle: 'Gérez les éléments supprimés' };
      case 'fonts':
        return { title: 'Polices', subtitle: 'Comparez et choisissez la police de l\'application' };
      case 'chat-styles':
        return { title: 'Styles Chat', subtitle: 'Comparez et choisissez le style d\'interface du chat' };
      default:
        return { title: 'Paramètres', subtitle: 'Configurez votre compte' };
    }
  };

  const { title, subtitle } = getSectionTitle();

  // Check if we need full width (for template settings)
  const needsFullWidth =
    activeSection === 'templates' && templatesTab === 'documents';

  // Hide header and tabs when editing a template
  const showHeaderAndTabs = !(activeSection === 'templates' && templatesTab === 'documents' && isTemplateEditing);

  return (
    <div className="h-full overflow-auto p-6">
      <div className={needsFullWidth ? 'max-w-full' : 'max-w-4xl mx-auto'}>
        {/* Header - hidden when editing template */}
        {showHeaderAndTabs && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-muted-foreground mt-1">{subtitle}</p>
          </div>
        )}

        {/* Sub-tabs for grouped sections */}
        {activeSection === 'entreprise' && (
          <div className="border-b border-border mb-6">
            <nav className="flex gap-6">
              <button
                onClick={() => setEntrepriseTab('infos')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  entrepriseTab === 'infos'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Infos
              </button>
              <button
                onClick={() => setEntrepriseTab('activities')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  entrepriseTab === 'activities'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Mes activités
              </button>
              <button
                onClick={() => setEntrepriseTab('fields')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  entrepriseTab === 'fields'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Champs personnalisés
              </button>
            </nav>
          </div>
        )}

        {activeSection === 'templates' && showHeaderAndTabs && (
          <div className="border-b border-border mb-6">
            <nav className="flex gap-6">
              <button
                onClick={() => setTemplatesTab('documents')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  templatesTab === 'documents'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Factures / Devis
              </button>
              <button
                onClick={() => setTemplatesTab('proposals')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  templatesTab === 'proposals'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Propositions
              </button>
              <button
                onClick={() => setTemplatesTab('briefs')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  templatesTab === 'briefs'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Briefs
              </button>
              <button
                onClick={() => setTemplatesTab('reviews')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  templatesTab === 'reviews'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Reviews
              </button>
            </nav>
          </div>
        )}

        {/* Content */}
        {activeSection === 'profile' && <ProfileSettings />}
        {activeSection === 'email' && <EmailSettings />}

        {activeSection === 'entreprise' && (
          <>
            {entrepriseTab === 'infos' && <CompanySettings />}
            {entrepriseTab === 'activities' && <ActivitiesSettings />}
            {entrepriseTab === 'fields' && <CustomFieldsSettings />}
          </>
        )}

        {activeSection === 'templates' && (
          <>
            {templatesTab === 'documents' && <TemplateSettings onEditModeChange={setIsTemplateEditing} />}
            {templatesTab === 'proposals' && <ProposalTemplatesSettings />}
            {templatesTab === 'briefs' && <BriefTemplatesSettings />}
            {templatesTab === 'reviews' && <ReviewTemplatesSettings />}
          </>
        )}

        {activeSection === 'verifolio' && <VerifolioSettings />}
        {activeSection === 'integrations' && <IntegrationsSettings />}
        {activeSection === 'navigation' && <NavigationSettings />}
        {activeSection === 'trash' && <TrashSettings />}
        {activeSection === 'fonts' && <FontsSettings />}
        {activeSection === 'chat-styles' && <ChatStylesSettings />}
      </div>
    </div>
  );
}
