import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SearchResult, EntityType } from '@/lib/search/types';

// Helper to safely extract client name from Supabase join result
function getClientName(client: unknown): string | null {
  if (!client) return null;
  // If it's an array (from join), get the first element
  if (Array.isArray(client)) {
    return (client[0] as { nom?: string })?.nom || null;
  }
  // If it's an object, get the nom directly
  return (client as { nom?: string })?.nom || null;
}

/**
 * GET /api/search
 * Universal search across all entities
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Execute all searches in parallel
    const [
      clients,
      contacts,
      deals,
      missions,
      quotes,
      invoices,
      proposals,
      briefs,
      notes,
      tasks,
    ] = await Promise.all([
      searchClients(supabase, query, user.id, limit),
      searchContacts(supabase, query, user.id, limit),
      searchDeals(supabase, query, user.id, limit),
      searchMissions(supabase, query, user.id, limit),
      searchQuotes(supabase, query, user.id, limit),
      searchInvoices(supabase, query, user.id, limit),
      searchProposals(supabase, query, user.id, limit),
      searchBriefs(supabase, query, user.id, limit),
      searchNotes(supabase, query, user.id, limit),
      searchTasks(supabase, query, user.id, limit),
    ]);

    const results = [
      { type: 'client' as EntityType, label: 'Clients', items: clients },
      { type: 'contact' as EntityType, label: 'Contacts', items: contacts },
      { type: 'deal' as EntityType, label: 'Deals', items: deals },
      { type: 'mission' as EntityType, label: 'Missions', items: missions },
      { type: 'quote' as EntityType, label: 'Devis', items: quotes },
      { type: 'invoice' as EntityType, label: 'Factures', items: invoices },
      { type: 'proposal' as EntityType, label: 'Propositions', items: proposals },
      { type: 'brief' as EntityType, label: 'Briefs', items: briefs },
      { type: 'note' as EntityType, label: 'Notes', items: notes },
      { type: 'task' as EntityType, label: 'Tâches', items: tasks },
    ].filter((g) => g.items.length > 0);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('GET /api/search error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Search functions for each entity type

async function searchClients(
  supabase: SupabaseClient,
  query: string,
  userId: string,
  limit: number
): Promise<SearchResult[]> {
  const { data } = await supabase
    .from('clients')
    .select('id, nom, email')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .or(`nom.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(limit);

  return (
    data?.map((c) => ({
      id: c.id,
      title: c.nom,
      subtitle: c.email,
      path: `/clients/${c.id}`,
      tabType: 'client' as const,
      entityType: 'client' as EntityType,
    })) || []
  );
}

async function searchContacts(
  supabase: SupabaseClient,
  query: string,
  userId: string,
  limit: number
): Promise<SearchResult[]> {
  const { data } = await supabase
    .from('contacts')
    .select('id, nom, prenom, email')
    .eq('user_id', userId)
    .or(`nom.ilike.%${query}%,prenom.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(limit);

  return (
    data?.map((c) => ({
      id: c.id,
      title: [c.prenom, c.nom].filter(Boolean).join(' ') || c.nom,
      subtitle: c.email,
      path: `/contacts/${c.id}`,
      tabType: 'contact' as const,
      entityType: 'contact' as EntityType,
    })) || []
  );
}

async function searchDeals(
  supabase: SupabaseClient,
  query: string,
  userId: string,
  limit: number
): Promise<SearchResult[]> {
  const { data } = await supabase
    .from('deals')
    .select('id, title, client:clients(nom)')
    .eq('user_id', userId)
    .or(`title.ilike.%${query}%`)
    .limit(limit);

  return (
    data?.map((d) => ({
      id: d.id,
      title: d.title,
      subtitle: getClientName(d.client),
      path: `/deals/${d.id}`,
      tabType: 'deal' as const,
      entityType: 'deal' as EntityType,
    })) || []
  );
}

async function searchMissions(
  supabase: SupabaseClient,
  query: string,
  userId: string,
  limit: number
): Promise<SearchResult[]> {
  const { data } = await supabase
    .from('missions')
    .select('id, title, client:clients(nom)')
    .eq('user_id', userId)
    .or(`title.ilike.%${query}%`)
    .limit(limit);

  return (
    data?.map((m) => ({
      id: m.id,
      title: m.title,
      subtitle: getClientName(m.client),
      path: `/missions/${m.id}`,
      tabType: 'mission' as const,
      entityType: 'mission' as EntityType,
    })) || []
  );
}

async function searchQuotes(
  supabase: SupabaseClient,
  query: string,
  userId: string,
  limit: number
): Promise<SearchResult[]> {
  const { data } = await supabase
    .from('quotes')
    .select('id, numero, total_ttc, client:clients(nom)')
    .eq('user_id', userId)
    .or(`numero.ilike.%${query}%`)
    .limit(limit);

  return (
    data?.map((q) => ({
      id: q.id,
      title: q.numero || 'Devis sans numéro',
      subtitle: getClientName(q.client),
      path: `/quotes/${q.id}`,
      tabType: 'quote' as const,
      entityType: 'quote' as EntityType,
    })) || []
  );
}

async function searchInvoices(
  supabase: SupabaseClient,
  query: string,
  userId: string,
  limit: number
): Promise<SearchResult[]> {
  const { data } = await supabase
    .from('invoices')
    .select('id, numero, total_ttc, client:clients(nom)')
    .eq('user_id', userId)
    .or(`numero.ilike.%${query}%`)
    .limit(limit);

  return (
    data?.map((i) => ({
      id: i.id,
      title: i.numero || 'Facture sans numéro',
      subtitle: getClientName(i.client),
      path: `/invoices/${i.id}`,
      tabType: 'invoice' as const,
      entityType: 'invoice' as EntityType,
    })) || []
  );
}

async function searchProposals(
  supabase: SupabaseClient,
  query: string,
  userId: string,
  limit: number
): Promise<SearchResult[]> {
  const { data } = await supabase
    .from('proposals')
    .select('id, title, client:clients(nom)')
    .eq('user_id', userId)
    .or(`title.ilike.%${query}%`)
    .limit(limit);

  return (
    data?.map((p) => ({
      id: p.id,
      title: p.title,
      subtitle: getClientName(p.client),
      path: `/proposals/${p.id}`,
      tabType: 'proposal' as const,
      entityType: 'proposal' as EntityType,
    })) || []
  );
}

async function searchBriefs(
  supabase: SupabaseClient,
  query: string,
  userId: string,
  limit: number
): Promise<SearchResult[]> {
  const { data } = await supabase
    .from('briefs')
    .select('id, title, client:clients(nom)')
    .eq('user_id', userId)
    .or(`title.ilike.%${query}%`)
    .limit(limit);

  return (
    data?.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: getClientName(b.client),
      path: `/briefs/${b.id}`,
      tabType: 'brief' as const,
      entityType: 'brief' as EntityType,
    })) || []
  );
}

async function searchNotes(
  supabase: SupabaseClient,
  query: string,
  userId: string,
  limit: number
): Promise<SearchResult[]> {
  const { data } = await supabase
    .from('notes')
    .select('id, title, content')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .limit(limit);

  return (
    data?.map((n) => ({
      id: n.id,
      title: n.title || 'Note sans titre',
      subtitle: n.content?.substring(0, 50) || null,
      path: `/notes/${n.id}`,
      tabType: 'note' as const,
      entityType: 'note' as EntityType,
    })) || []
  );
}

async function searchTasks(
  supabase: SupabaseClient,
  query: string,
  userId: string,
  limit: number
): Promise<SearchResult[]> {
  const { data } = await supabase
    .from('tasks')
    .select('id, title, status')
    .eq('user_id', userId)
    .neq('status', 'done')
    .or(`title.ilike.%${query}%`)
    .limit(limit);

  return (
    data?.map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: t.status === 'en_attente' ? 'En attente' : 'À faire',
      path: '/todos',
      tabType: 'todos' as const,
      entityType: 'task' as EntityType,
    })) || []
  );
}
