import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

interface OverdueInvoice {
  id: string;
  number: string;
  clientName: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
}

interface PendingDeal {
  id: string;
  title: string;
  clientName: string;
  stage: string;
  lastActivityDate: string | null;
}

interface Action {
  id: string;
  type: 'relance' | 'suivi' | 'action';
  label: string;
  entityType: 'invoice' | 'quote' | 'deal';
  entityId: string;
}

interface DashboardReport {
  revenue: number;
  unpaid: number;
  overdueCount: number;
  overdueInvoices: OverdueInvoice[];
  pendingDeals: PendingDeal[];
  actions: Action[];
  currency: string;
}

/**
 * GET /api/dashboard/report
 * Returns daily report data for dashboard
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    // Fetch all data in parallel
    const [
      revenueRes,
      unpaidRes,
      overdueRes,
      pendingQuotesRes,
      pendingDealsRes,
      currencyRes,
    ] = await Promise.all([
      // Revenue: sum of paid invoices this month
      supabase
        .from('invoices')
        .select('total_ttc')
        .eq('user_id', userId)
        .eq('status', 'payee')
        .gte('date_emission', startOfMonth),

      // Unpaid: sum of unpaid invoices
      supabase
        .from('invoices')
        .select('total_ttc')
        .eq('user_id', userId)
        .neq('status', 'payee'),

      // Overdue invoices: due_date < today AND not paid
      supabase
        .from('invoices')
        .select('id, numero, total_ttc, date_echeance, clients(nom)')
        .eq('user_id', userId)
        .neq('status', 'payee')
        .lt('date_echeance', todayStr)
        .order('date_echeance', { ascending: true })
        .limit(5),

      // Pending quotes: sent but not responded > 5 days
      supabase
        .from('quotes')
        .select('id, numero, total_ttc, date_envoi, clients(nom)')
        .eq('user_id', userId)
        .eq('status', 'envoyee')
        .not('date_envoi', 'is', null)
        .order('date_envoi', { ascending: true })
        .limit(3),

      // Pending deals: nouveau or en_discussion
      supabase
        .from('deals')
        .select('id, title, stage, updated_at, clients(nom)')
        .eq('user_id', userId)
        .in('stage', ['nouveau', 'en_discussion', 'proposition'])
        .order('updated_at', { ascending: true })
        .limit(3),

      // Currency
      fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/settings/currency`,
        {
          headers: { cookie: '' },
        }
      )
        .then((r) => r.json())
        .catch(() => ({ data: { currency: 'EUR' } })),
    ]);

    // Calculate revenue
    const revenue =
      revenueRes.data?.reduce(
        (sum, inv) => sum + Number(inv.total_ttc || 0),
        0
      ) || 0;

    // Calculate unpaid
    const unpaid =
      unpaidRes.data?.reduce(
        (sum, inv) => sum + Number(inv.total_ttc || 0),
        0
      ) || 0;

    // Format overdue invoices
    const overdueInvoices: OverdueInvoice[] = (overdueRes.data || []).map(
      (inv: any) => {
        const dueDate = new Date(inv.date_echeance);
        const daysOverdue = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          id: inv.id,
          number: inv.numero,
          clientName: inv.clients?.nom || 'Client inconnu',
          amount: Number(inv.total_ttc || 0),
          dueDate: inv.date_echeance,
          daysOverdue,
        };
      }
    );

    // Format pending deals
    const pendingDeals: PendingDeal[] = (pendingDealsRes.data || []).map(
      (deal: any) => ({
        id: deal.id,
        title: deal.title,
        clientName: deal.clients?.nom || 'Client inconnu',
        stage: deal.stage,
        lastActivityDate: deal.updated_at,
      })
    );

    // Generate actions based on data
    const actions: Action[] = [];

    // Add invoice reminders (overdue > 7 days)
    for (const inv of overdueInvoices) {
      if (inv.daysOverdue >= 7 && actions.length < 3) {
        actions.push({
          id: `relance-${inv.id}`,
          type: 'relance',
          label: `Relancer ${inv.clientName} pour facture ${inv.number}`,
          entityType: 'invoice',
          entityId: inv.id,
        });
      }
    }

    // Add quote follow-ups (sent > 5 days)
    const fiveDaysAgo = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
    for (const quote of pendingQuotesRes.data || []) {
      if (actions.length >= 3) break;
      const sentDate = new Date(quote.date_envoi);
      if (sentDate < fiveDaysAgo) {
        actions.push({
          id: `suivi-quote-${quote.id}`,
          type: 'suivi',
          label: `Suivre devis ${quote.numero} avec ${(quote as any).clients?.nom || 'client'}`,
          entityType: 'quote',
          entityId: quote.id,
        });
      }
    }

    // Add deal follow-ups (no activity > 10 days)
    const tenDaysAgo = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000);
    for (const deal of pendingDeals) {
      if (actions.length >= 3) break;
      if (deal.lastActivityDate) {
        const lastActivity = new Date(deal.lastActivityDate);
        if (lastActivity < tenDaysAgo) {
          actions.push({
            id: `suivi-deal-${deal.id}`,
            type: 'suivi',
            label: `Relancer deal "${deal.title}"`,
            entityType: 'deal',
            entityId: deal.id,
          });
        }
      }
    }

    const report: DashboardReport = {
      revenue,
      unpaid,
      overdueCount: overdueInvoices.length,
      overdueInvoices: overdueInvoices.slice(0, 3),
      pendingDeals,
      actions,
      currency: currencyRes.data?.currency || 'EUR',
    };

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('GET /api/dashboard/report error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du rapport' },
      { status: 500 }
    );
  }
}
