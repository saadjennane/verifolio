export type TabType =
  | 'dashboard'
  | 'companies'
  | 'new-company'
  | 'edit-company'
  | 'clients'
  | 'client'
  | 'new-client'
  | 'edit-client'
  | 'contacts'
  | 'contact'
  | 'new-contact'
  | 'edit-contact'
  | 'deals'
  | 'deal'
  | 'new-deal'
  | 'new-deal-for-proposal'
  | 'edit-deal'
  | 'missions'
  | 'mission'
  | 'new-mission'
  | 'edit-mission'
  | 'reviews'
  | 'review'
  | 'review-request'
  | 'new-review-request'
  | 'documents'
  | 'quotes'
  | 'quote'
  | 'new-quote'
  | 'new-quote-for-deal'
  | 'edit-quote'
  | 'invoices'
  | 'invoice'
  | 'new-invoice'
  | 'new-invoice-for-mission'
  | 'edit-invoice'
  | 'delivery-notes'
  | 'delivery-note'
  | 'new-delivery-note'
  | 'new-delivery-note-for-mission'
  | 'proposals'
  | 'proposal'
  | 'new-proposal'
  | 'edit-proposal'
  | 'proposal-templates'
  | 'briefs'
  | 'brief'
  | 'new-brief'
  | 'edit-brief'
  | 'brief-templates'
  | 'edit-brief-template'
  | 'todos'
  | 'todo'
  | 'new-todo'
  | 'settings'
  | 'new-review-template'
  | 'edit-review-template'
  // Suppliers & Expenses
  | 'suppliers'
  | 'supplier'
  | 'new-supplier'
  | 'edit-supplier'
  | 'supplier-consultations'
  | 'supplier-consultation'
  | 'new-supplier-consultation'
  | 'supplier-quotes'
  | 'supplier-quote'
  | 'new-supplier-quote'
  | 'supplier-invoices'
  | 'supplier-invoice'
  | 'new-supplier-invoice'
  | 'supplier-delivery-notes'
  | 'supplier-delivery-note'
  | 'new-supplier-delivery-note'
  | 'purchase-orders'
  | 'purchase-order'
  | 'new-purchase-order'
  | 'expenses'
  | 'expense'
  | 'new-expense';

/**
 * Source de l'ouverture d'un onglet
 * - sidebar: clic depuis la barre de navigation
 * - user: clic à l'intérieur d'un onglet ou action directe
 * - llm: ouverture par l'assistant IA
 */
export type TabOpenedBy = 'sidebar' | 'user' | 'llm';

export interface Tab {
  id: string;
  type: TabType;
  path: string;
  title: string;
  /**
   * Onglet temporaire (true) ou figé/pinned (false)
   * Un onglet temporaire peut être remplacé ou fermé automatiquement
   */
  isTemporary: boolean;
  entityId?: string;
  /**
   * Contenu non sauvegardé - empêche la fermeture automatique
   */
  isDirty?: boolean;
  /**
   * Onglet épinglé (Dashboard) - ne peut jamais être fermé
   */
  pinned?: boolean;
  /**
   * Source de l'ouverture de l'onglet
   */
  openedBy?: TabOpenedBy;
  /**
   * Timestamp du dernier accès (pour cleanup des plus anciens)
   */
  lastAccessedAt?: number;
}

export interface TabConfig {
  type: TabType;
  path: string;
  title: string;
  entityId?: string;
  /**
   * Source de l'ouverture (optionnel, défaut: 'user')
   */
  openedBy?: TabOpenedBy;
}

export const TAB_ICONS: Record<TabType, string> = {
  dashboard: 'home',
  companies: 'building',
  'new-company': 'plus',
  'edit-company': 'edit',
  clients: 'users',
  client: 'user',
  'new-client': 'user-plus',
  'edit-client': 'edit',
  contacts: 'contact',
  contact: 'contact',
  'new-contact': 'contact-plus',
  'edit-contact': 'edit',
  deals: 'dollar-sign',
  deal: 'dollar-sign',
  'new-deal': 'plus',
  'new-deal-for-proposal': 'plus',
  'edit-deal': 'edit',
  missions: 'briefcase',
  mission: 'briefcase',
  'new-mission': 'plus',
  'edit-mission': 'edit',
  reviews: 'star',
  review: 'star',
  'review-request': 'mail',
  'new-review-request': 'plus',
  documents: 'folder',
  quotes: 'file-text',
  quote: 'file-text',
  'new-quote': 'file-plus',
  'new-quote-for-deal': 'file-plus',
  'edit-quote': 'edit',
  invoices: 'file-invoice',
  invoice: 'file-invoice',
  'new-invoice': 'file-plus',
  'new-invoice-for-mission': 'file-plus',
  'edit-invoice': 'edit',
  proposals: 'file-check',
  proposal: 'file-check',
  'new-proposal': 'file-plus',
  'edit-proposal': 'edit',
  'proposal-templates': 'file-check',
  briefs: 'clipboard',
  brief: 'clipboard',
  'new-brief': 'clipboard-plus',
  'edit-brief': 'edit',
  'brief-templates': 'clipboard',
  'edit-brief-template': 'edit',
  todos: 'check-square',
  todo: 'square',
  'new-todo': 'plus',
  settings: 'settings',
  'new-review-template': 'plus',
  'edit-review-template': 'edit',
  // Suppliers & Expenses
  suppliers: 'truck',
  supplier: 'truck',
  'new-supplier': 'plus',
  'edit-supplier': 'edit',
  'supplier-consultations': 'layers',
  'supplier-consultation': 'layers',
  'new-supplier-consultation': 'plus',
  'supplier-quotes': 'file-text',
  'supplier-quote': 'file-text',
  'new-supplier-quote': 'file-plus',
  'supplier-invoices': 'file-invoice',
  'supplier-invoice': 'file-invoice',
  'new-supplier-invoice': 'file-plus',
  expenses: 'credit-card',
  expense: 'credit-card',
  'new-expense': 'plus',
  // Client Delivery Notes
  'delivery-notes': 'package',
  'delivery-note': 'package',
  'new-delivery-note': 'package-plus',
  'new-delivery-note-for-mission': 'package-plus',
  // Supplier Delivery Notes
  'supplier-delivery-notes': 'package-check',
  'supplier-delivery-note': 'package-check',
  'new-supplier-delivery-note': 'package-plus',
  // Purchase Orders
  'purchase-orders': 'shopping-cart',
  'purchase-order': 'shopping-cart',
  'new-purchase-order': 'plus',
};

export function pathToTabConfig(pathname: string): TabConfig | null {
  // Dashboard
  if (pathname === '/' || pathname === '/dashboard') {
    return { type: 'dashboard', path: '/', title: 'Dashboard' };
  }

  // Companies (unified clients/suppliers view)
  if (pathname === '/companies' || pathname.startsWith('/companies?')) {
    return { type: 'companies', path: '/companies', title: 'Entreprises' };
  }
  if (pathname === '/companies/new') {
    return { type: 'new-company', path: '/companies/new', title: 'Nouveau' };
  }
  const companyEditMatch = pathname.match(/^\/companies\/([^/]+)\/edit$/);
  if (companyEditMatch) {
    return {
      type: 'edit-company',
      path: pathname,
      title: 'Modifier',
      entityId: companyEditMatch[1],
    };
  }

  // Clients
  if (pathname === '/clients') {
    return { type: 'clients', path: '/clients', title: 'Clients' };
  }
  if (pathname === '/clients/new') {
    return { type: 'new-client', path: '/clients/new', title: 'Nouveau client' };
  }
  const clientEditMatch = pathname.match(/^\/clients\/([^/]+)\/edit$/);
  if (clientEditMatch) {
    return {
      type: 'edit-client',
      path: pathname,
      title: 'Modifier client',
      entityId: clientEditMatch[1],
    };
  }
  const clientMatch = pathname.match(/^\/clients\/([^/]+)$/);
  if (clientMatch) {
    return {
      type: 'client',
      path: pathname,
      title: 'Client',
      entityId: clientMatch[1],
    };
  }

  // Contacts
  if (pathname === '/contacts') {
    return { type: 'contacts', path: '/contacts', title: 'Contacts' };
  }
  if (pathname === '/contacts/new') {
    return { type: 'new-contact', path: '/contacts/new', title: 'Nouveau contact' };
  }
  const contactEditMatch = pathname.match(/^\/contacts\/([^/]+)\/edit$/);
  if (contactEditMatch) {
    return {
      type: 'edit-contact',
      path: pathname,
      title: 'Modifier contact',
      entityId: contactEditMatch[1],
    };
  }
  const contactMatch = pathname.match(/^\/contacts\/([^/]+)$/);
  if (contactMatch) {
    return {
      type: 'contact',
      path: pathname,
      title: 'Contact',
      entityId: contactMatch[1],
    };
  }

  // Quotes
  if (pathname === '/quotes') {
    return { type: 'quotes', path: '/quotes', title: 'Devis' };
  }
  if (pathname === '/quotes/new') {
    return { type: 'new-quote', path: '/quotes/new', title: 'Nouveau devis' };
  }
  const quoteEditMatch = pathname.match(/^\/quotes\/([^/]+)\/edit$/);
  if (quoteEditMatch) {
    return {
      type: 'edit-quote',
      path: pathname,
      title: 'Modifier devis',
      entityId: quoteEditMatch[1],
    };
  }
  const quoteMatch = pathname.match(/^\/quotes\/([^/]+)$/);
  if (quoteMatch) {
    return {
      type: 'quote',
      path: pathname,
      title: 'Devis',
      entityId: quoteMatch[1],
    };
  }

  // Invoices
  if (pathname === '/invoices') {
    return { type: 'invoices', path: '/invoices', title: 'Factures' };
  }
  if (pathname === '/invoices/new') {
    return { type: 'new-invoice', path: '/invoices/new', title: 'Nouvelle facture' };
  }
  const invoiceEditMatch = pathname.match(/^\/invoices\/([^/]+)\/edit$/);
  if (invoiceEditMatch) {
    return {
      type: 'edit-invoice',
      path: pathname,
      title: 'Modifier facture',
      entityId: invoiceEditMatch[1],
    };
  }
  const invoiceMatch = pathname.match(/^\/invoices\/([^/]+)$/);
  if (invoiceMatch) {
    return {
      type: 'invoice',
      path: pathname,
      title: 'Facture',
      entityId: invoiceMatch[1],
    };
  }

  // Deals
  if (pathname === '/deals') {
    return { type: 'deals', path: '/deals', title: 'Deals' };
  }

  // Missions
  if (pathname === '/missions') {
    return { type: 'missions', path: '/missions', title: 'Missions' };
  }

  // Reviews
  if (pathname === '/reviews') {
    return { type: 'reviews', path: '/reviews', title: 'Reviews' };
  }

  // Documents (hub)
  if (pathname === '/documents') {
    return { type: 'documents', path: '/documents', title: 'Documents' };
  }

  // Proposals
  if (pathname === '/proposals') {
    return { type: 'proposals', path: '/proposals', title: 'Propositions' };
  }
  if (pathname === '/proposals/new') {
    return { type: 'new-proposal', path: '/proposals/new', title: 'Nouvelle proposition' };
  }
  // Proposal templates
  if (pathname === '/proposals/templates') {
    return { type: 'proposal-templates', path: '/proposals/templates', title: 'Templates propositions' };
  }
  const proposalEditMatch = pathname.match(/^\/proposals\/([^/]+)\/edit$/);
  if (proposalEditMatch) {
    return {
      type: 'edit-proposal',
      path: pathname,
      title: 'Éditer proposition',
      entityId: proposalEditMatch[1],
    };
  }
  const proposalMatch = pathname.match(/^\/proposals\/([^/]+)$/);
  if (proposalMatch) {
    return {
      type: 'proposal',
      path: pathname,
      title: 'Proposition',
      entityId: proposalMatch[1],
    };
  }

  // Briefs
  if (pathname === '/briefs') {
    return { type: 'briefs', path: '/briefs', title: 'Briefs' };
  }
  if (pathname === '/briefs/new') {
    return { type: 'new-brief', path: '/briefs/new', title: 'Nouveau brief' };
  }
  // Brief templates list
  if (pathname === '/briefs/templates') {
    return { type: 'brief-templates', path: '/briefs/templates', title: 'Templates briefs' };
  }
  // Brief template editor
  const briefTemplateEditMatch = pathname.match(/^\/briefs\/templates\/([^/]+)$/);
  if (briefTemplateEditMatch) {
    return {
      type: 'edit-brief-template',
      path: pathname,
      title: 'Editer template',
      entityId: briefTemplateEditMatch[1],
    };
  }
  const briefEditMatch = pathname.match(/^\/briefs\/([^/]+)\/edit$/);
  if (briefEditMatch) {
    return {
      type: 'edit-brief',
      path: pathname,
      title: 'Editer brief',
      entityId: briefEditMatch[1],
    };
  }
  const briefMatch = pathname.match(/^\/briefs\/([^/]+)$/);
  if (briefMatch) {
    return {
      type: 'brief',
      path: pathname,
      title: 'Brief',
      entityId: briefMatch[1],
    };
  }

  // Todos
  if (pathname === '/todos') {
    return { type: 'todos', path: '/todos', title: 'Todos' };
  }

  // Settings
  if (pathname === '/settings') {
    return { type: 'settings', path: '/settings', title: 'Paramètres' };
  }

  // Suppliers
  if (pathname === '/suppliers') {
    return { type: 'suppliers', path: '/suppliers', title: 'Fournisseurs' };
  }
  if (pathname === '/suppliers/new') {
    return { type: 'new-supplier', path: '/suppliers/new', title: 'Nouveau fournisseur' };
  }
  const supplierEditMatch = pathname.match(/^\/suppliers\/([^/]+)\/edit$/);
  if (supplierEditMatch) {
    return {
      type: 'edit-supplier',
      path: pathname,
      title: 'Modifier fournisseur',
      entityId: supplierEditMatch[1],
    };
  }
  // Supplier consultations
  if (pathname === '/suppliers/consultations') {
    return { type: 'supplier-consultations', path: '/suppliers/consultations', title: 'Consultations' };
  }
  if (pathname === '/suppliers/consultations/new') {
    return { type: 'new-supplier-consultation', path: '/suppliers/consultations/new', title: 'Nouvelle consultation' };
  }
  const consultationMatch = pathname.match(/^\/suppliers\/consultations\/([^/]+)$/);
  if (consultationMatch) {
    return {
      type: 'supplier-consultation',
      path: pathname,
      title: 'Consultation',
      entityId: consultationMatch[1],
    };
  }
  // Supplier quotes
  if (pathname === '/suppliers/quotes') {
    return { type: 'supplier-quotes', path: '/suppliers/quotes', title: 'Devis fournisseurs' };
  }
  if (pathname === '/suppliers/quotes/new') {
    return { type: 'new-supplier-quote', path: '/suppliers/quotes/new', title: 'Nouveau devis fournisseur' };
  }
  const supplierQuoteMatch = pathname.match(/^\/suppliers\/quotes\/([^/]+)$/);
  if (supplierQuoteMatch) {
    return {
      type: 'supplier-quote',
      path: pathname,
      title: 'Devis fournisseur',
      entityId: supplierQuoteMatch[1],
    };
  }
  // Supplier invoices
  if (pathname === '/suppliers/invoices') {
    return { type: 'supplier-invoices', path: '/suppliers/invoices', title: 'Factures fournisseurs' };
  }
  if (pathname === '/suppliers/invoices/new') {
    return { type: 'new-supplier-invoice', path: '/suppliers/invoices/new', title: 'Nouvelle facture fournisseur' };
  }
  const supplierInvoiceMatch = pathname.match(/^\/suppliers\/invoices\/([^/]+)$/);
  if (supplierInvoiceMatch) {
    return {
      type: 'supplier-invoice',
      path: pathname,
      title: 'Facture fournisseur',
      entityId: supplierInvoiceMatch[1],
    };
  }
  // Supplier detail (must come after nested routes)
  const supplierMatch = pathname.match(/^\/suppliers\/([^/]+)$/);
  if (supplierMatch && !['consultations', 'quotes', 'invoices', 'new'].includes(supplierMatch[1])) {
    return {
      type: 'supplier',
      path: pathname,
      title: 'Fournisseur',
      entityId: supplierMatch[1],
    };
  }

  // Expenses
  if (pathname === '/expenses') {
    return { type: 'expenses', path: '/expenses', title: 'Dépenses' };
  }
  if (pathname === '/expenses/new') {
    return { type: 'new-expense', path: '/expenses/new', title: 'Nouvelle dépense' };
  }
  const expenseMatch = pathname.match(/^\/expenses\/([^/]+)$/);
  if (expenseMatch && expenseMatch[1] !== 'new') {
    return {
      type: 'expense',
      path: pathname,
      title: 'Dépense',
      entityId: expenseMatch[1],
    };
  }

  return null;
}
