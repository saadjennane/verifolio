'use client';

import { useTabsStore } from '@/lib/stores/tabs-store';
import dynamic from 'next/dynamic';

// Dynamic imports pour code splitting
const DashboardTab = dynamic(() => import('@/components/tabs/DashboardTab').then(m => ({ default: m.DashboardTab })), {
  loading: () => <TabLoading />,
});

const ClientsListTab = dynamic(() => import('@/components/tabs/ClientsListTab').then(m => ({ default: m.ClientsListTab })), {
  loading: () => <TabLoading />,
});

const ClientDetailTab = dynamic(() => import('@/components/tabs/ClientDetailTab').then(m => ({ default: m.ClientDetailTab })), {
  loading: () => <TabLoading />,
});

const ClientFormTab = dynamic(() => import('@/components/tabs/ClientFormTab').then(m => ({ default: m.ClientFormTab })), {
  loading: () => <TabLoading />,
});

const ContactsListTab = dynamic(() => import('@/components/tabs/ContactsListTab').then(m => ({ default: m.ContactsListTab })), {
  loading: () => <TabLoading />,
});

const ContactDetailTab = dynamic(() => import('@/components/tabs/ContactDetailTab').then(m => ({ default: m.ContactDetailTab })), {
  loading: () => <TabLoading />,
});

const ContactFormTab = dynamic(() => import('@/components/tabs/ContactFormTab').then(m => ({ default: m.ContactFormTab })), {
  loading: () => <TabLoading />,
});

const QuotesListTab = dynamic(() => import('@/components/tabs/QuotesListTab').then(m => ({ default: m.QuotesListTab })), {
  loading: () => <TabLoading />,
});

const QuoteDetailTab = dynamic(() => import('@/components/tabs/QuoteDetailTab').then(m => ({ default: m.QuoteDetailTab })), {
  loading: () => <TabLoading />,
});

// Heavy form - disable SSR to reduce initial bundle
const QuoteFormTab = dynamic(() => import('@/components/tabs/QuoteFormTab').then(m => ({ default: m.QuoteFormTab })), {
  loading: () => <TabLoading />,
  ssr: false,
});

const InvoicesListTab = dynamic(() => import('@/components/tabs/InvoicesListTab').then(m => ({ default: m.InvoicesListTab })), {
  loading: () => <TabLoading />,
});

const InvoiceDetailTab = dynamic(() => import('@/components/tabs/InvoiceDetailTab').then(m => ({ default: m.InvoiceDetailTab })), {
  loading: () => <TabLoading />,
});

// Heavy form - disable SSR to reduce initial bundle
const InvoiceFormTab = dynamic(() => import('@/components/tabs/InvoiceFormTab').then(m => ({ default: m.InvoiceFormTab })), {
  loading: () => <TabLoading />,
  ssr: false,
});

const SettingsTab = dynamic(() => import('@/components/tabs/SettingsTab').then(m => ({ default: m.SettingsTab })), {
  loading: () => <TabLoading />,
});

const MissionsListTab = dynamic(() => import('@/components/tabs/MissionsListTab').then(m => ({ default: m.MissionsListTab })), {
  loading: () => <TabLoading />,
});

const MissionDetailTab = dynamic(() => import('@/components/tabs/MissionDetailTab').then(m => ({ default: m.MissionDetailTab })), {
  loading: () => <TabLoading />,
});

const MissionFormTab = dynamic(() => import('@/components/tabs/MissionFormTab').then(m => ({ default: m.MissionFormTab })), {
  loading: () => <TabLoading />,
});

const DealsListTab = dynamic(() => import('@/components/tabs/DealsListTab').then(m => ({ default: m.DealsListTab })), {
  loading: () => <TabLoading />,
});

const DealDetailTab = dynamic(() => import('@/components/tabs/DealDetailTab').then(m => ({ default: m.DealDetailTab })), {
  loading: () => <TabLoading />,
});

const DealFormTab = dynamic(() => import('@/components/tabs/DealFormTab').then(m => ({ default: m.DealFormTab })), {
  loading: () => <TabLoading />,
});

const ReviewsListTab = dynamic(() => import('@/components/tabs/ReviewsListTab').then(m => ({ default: m.ReviewsListTab })), {
  loading: () => <TabLoading />,
});

const ReviewRequestFormTab = dynamic(() => import('@/components/tabs/ReviewRequestFormTab').then(m => ({ default: m.ReviewRequestFormTab })), {
  loading: () => <TabLoading />,
});

const DocumentsListTab = dynamic(() => import('@/components/tabs/DocumentsListTab').then(m => ({ default: m.DocumentsListTab })), {
  loading: () => <TabLoading />,
});

const TodosListTab = dynamic(() => import('@/components/tabs/TodosListTab').then(m => ({ default: m.TodosListTab })), {
  loading: () => <TabLoading />,
});

const ProposalDetailTab = dynamic(() => import('@/components/tabs/ProposalDetailTab').then(m => ({ default: m.ProposalDetailTab })), {
  loading: () => <TabLoading />,
});

const NewProposalTab = dynamic(() => import('@/components/tabs/NewProposalTab').then(m => ({ default: m.NewProposalTab })), {
  loading: () => <TabLoading />,
});

// Heavy editor - disable SSR to reduce initial bundle
const ProposalEditorTab = dynamic(() => import('@/components/tabs/ProposalEditorTab').then(m => ({ default: m.ProposalEditorTab })), {
  loading: () => <TabLoading />,
  ssr: false,
});

const ProposalTemplatesTab = dynamic(() => import('@/components/tabs/ProposalTemplatesTab').then(m => ({ default: m.ProposalTemplatesTab })), {
  loading: () => <TabLoading />,
});

const BriefDetailTab = dynamic(() => import('@/components/tabs/BriefDetailTab').then(m => ({ default: m.BriefDetailTab })), {
  loading: () => <TabLoading />,
});

const NewBriefTab = dynamic(() => import('@/components/tabs/NewBriefTab').then(m => ({ default: m.NewBriefTab })), {
  loading: () => <TabLoading />,
});

// Heavy editor - disable SSR to reduce initial bundle
const BriefTemplateEditorTab = dynamic(() => import('@/components/tabs/BriefTemplateEditorTab').then(m => ({ default: m.BriefTemplateEditorTab })), {
  loading: () => <TabLoading />,
  ssr: false,
});

const BriefTemplatesTab = dynamic(() => import('@/components/tabs/BriefTemplatesTab').then(m => ({ default: m.BriefTemplatesTab })), {
  loading: () => <TabLoading />,
});

const CompaniesListTab = dynamic(() => import('@/components/tabs/CompaniesListTab').then(m => ({ default: m.CompaniesListTab })), {
  loading: () => <TabLoading />,
});

const CompanyFormTab = dynamic(() => import('@/components/tabs/CompanyFormTab').then(m => ({ default: m.CompanyFormTab })), {
  loading: () => <TabLoading />,
});

const ReviewTemplateFormTab = dynamic(() => import('@/components/tabs/ReviewTemplateFormTab').then(m => ({ default: m.ReviewTemplateFormTab })), {
  loading: () => <TabLoading />,
});

const TreasuryTab = dynamic(() => import('@/components/tabs/TreasuryTab').then(m => ({ default: m.TreasuryTab })), {
  loading: () => <TabLoading />,
});

const SubscriptionsTab = dynamic(() => import('@/components/tabs/SubscriptionsTab').then(m => ({ default: m.SubscriptionsTab })), {
  loading: () => <TabLoading />,
});

const NotesListTab = dynamic(() => import('@/components/tabs/NotesListTab').then(m => ({ default: m.NotesListTab })), {
  loading: () => <TabLoading />,
});

// Heavy editor - disable SSR to reduce initial bundle
const NoteDetailTab = dynamic(() => import('@/components/tabs/NoteDetailTab').then(m => ({ default: m.NoteDetailTab })), {
  loading: () => <TabLoading />,
  ssr: false,
});

// Heavy editor - disable SSR to reduce initial bundle
const NewNoteTab = dynamic(() => import('@/components/tabs/NewNoteTab').then(m => ({ default: m.NewNoteTab })), {
  loading: () => <TabLoading />,
  ssr: false,
});

const CalendarTab = dynamic(() => import('@/components/tabs/CalendarTab').then(m => ({ default: m.CalendarTab })), {
  loading: () => <TabLoading />,
});

function TabLoading() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

function EmptyState() {
  const { openTab } = useTabsStore();

  const handleOpenDashboard = () => {
    openTab({ type: 'dashboard', path: '/', title: 'Dashboard' }, true);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500">
      <svg
        className="w-16 h-16 mb-4 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p className="text-lg mb-2">Aucun onglet ouvert</p>
      <p className="text-sm mb-4">
        Utilisez la barre latérale pour ouvrir des documents
      </p>
      <button
        onClick={handleOpenDashboard}
        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        Ouvrir le Dashboard
      </button>
    </div>
  );
}

export function TabContent() {
  const { tabs, activeTabId, setActiveTab } = useTabsStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Si pas d'onglet actif, activer le Dashboard automatiquement
  if (!activeTab) {
    const dashboardTab = tabs.find((t) => t.id === 'dashboard');
    if (dashboardTab) {
      // Activer le dashboard au prochain tick pour éviter les updates pendant le rendu
      setTimeout(() => setActiveTab('dashboard'), 0);
      return <DashboardTab />;
    }
    // Fallback: si même le dashboard n'existe pas (ne devrait jamais arriver)
    return <EmptyState />;
  }

  switch (activeTab.type) {
    case 'dashboard':
      return <DashboardTab />;

    case 'companies': {
      const urlParams = new URLSearchParams(activeTab.path.split('?')[1] || '');
      const initialTab = urlParams.get('tab') as 'clients' | 'suppliers' | null;
      return <CompaniesListTab initialTab={initialTab || undefined} />;
    }

    case 'new-company':
      return <CompanyFormTab />;

    case 'edit-company':
      return <CompanyFormTab companyId={activeTab.entityId} />;

    case 'clients':
      return <ClientsListTab />;

    case 'client':
      return <ClientDetailTab clientId={activeTab.entityId!} />;

    case 'new-client':
      return <ClientFormTab />;

    case 'edit-client':
      return <ClientFormTab clientId={activeTab.entityId} />;

    case 'contacts':
      return <ContactsListTab />;

    case 'contact':
      return <ContactDetailTab contactId={activeTab.entityId!} />;

    case 'new-contact':
      return <ContactFormTab />;

    case 'edit-contact':
      return <ContactFormTab contactId={activeTab.entityId} />;

    case 'quotes':
      return <QuotesListTab />;

    case 'quote':
      return <QuoteDetailTab quoteId={activeTab.entityId!} />;

    case 'new-quote':
      return <QuoteFormTab />;

    case 'new-quote-for-deal':
      return <QuoteFormTab dealId={activeTab.entityId} />;

    case 'edit-quote':
      return <QuoteFormTab quoteId={activeTab.entityId} />;

    case 'invoices':
      return <InvoicesListTab />;

    case 'invoice':
      return <InvoiceDetailTab invoiceId={activeTab.entityId!} />;

    case 'new-invoice':
      return <InvoiceFormTab />;

    case 'new-invoice-for-mission':
      return <InvoiceFormTab missionId={activeTab.entityId} />;

    case 'edit-invoice':
      return <InvoiceFormTab invoiceId={activeTab.entityId} />;

    case 'settings':
      return <SettingsTab path={activeTab.path} />;

    case 'missions':
      return <MissionsListTab />;

    case 'mission':
      return <MissionDetailTab missionId={activeTab.entityId!} />;

    case 'new-mission':
      return <MissionFormTab />;

    case 'edit-mission':
      return <MissionFormTab missionId={activeTab.entityId} />;

    case 'deals':
      return <DealsListTab />;

    case 'deal':
      return <DealDetailTab dealId={activeTab.entityId!} />;

    case 'new-deal':
      return <DealFormTab />;

    case 'new-deal-for-proposal':
      return <DealFormTab returnToProposal={true} />;

    case 'edit-deal':
      return <DealFormTab dealId={activeTab.entityId} />;

    case 'reviews':
      return <ReviewsListTab />;

    case 'new-review-request':
      return <ReviewRequestFormTab />;

    case 'documents': {
      const urlParams = new URLSearchParams(activeTab.path.split('?')[1] || '');
      const initialTab = urlParams.get('tab') as 'quotes' | 'invoices' | 'proposals' | 'briefs' | null;
      return <DocumentsListTab initialTab={initialTab || undefined} />;
    }

    case 'todos':
      return <TodosListTab />;

    case 'proposal':
      return <ProposalDetailTab proposalId={activeTab.entityId!} />;

    case 'new-proposal': {
      // Extraire dealId du path si présent (/proposals/new?dealId=xxx)
      const urlParams = new URLSearchParams(activeTab.path.split('?')[1] || '');
      const dealIdFromUrl = urlParams.get('dealId') || undefined;
      return <NewProposalTab dealId={dealIdFromUrl} />;
    }

    case 'edit-proposal':
      return <ProposalEditorTab proposalId={activeTab.entityId!} />;

    case 'proposal-templates':
      return <ProposalTemplatesTab />;

    case 'briefs':
      return <DocumentsListTab />;

    case 'brief':
      return <BriefDetailTab briefId={activeTab.entityId!} />;

    case 'new-brief':
      return <NewBriefTab />;

    case 'edit-brief':
      return <BriefDetailTab briefId={activeTab.entityId!} />;

    case 'edit-brief-template':
      return <BriefTemplateEditorTab templateId={activeTab.entityId!} />;

    case 'brief-templates':
      return <BriefTemplatesTab />;

    case 'new-review-template':
      return <ReviewTemplateFormTab />;

    case 'edit-review-template':
      return <ReviewTemplateFormTab templateId={activeTab.entityId} />;

    case 'treasury':
      return <TreasuryTab />;

    case 'subscriptions':
      return <SubscriptionsTab />;

    case 'notes':
      return <NotesListTab />;

    case 'note':
      return <NoteDetailTab noteId={activeTab.entityId!} />;

    case 'new-note':
      return <NewNoteTab />;

    case 'edit-note':
      return <NoteDetailTab noteId={activeTab.entityId!} />;

    case 'calendar':
      return <CalendarTab />;

    default:
      return <EmptyState />;
  }
}
