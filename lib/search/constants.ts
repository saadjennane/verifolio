import {
  Users,
  Contact2,
  Handshake,
  Briefcase,
  FileText,
  Receipt,
  FileCheck,
  ClipboardList,
  StickyNote,
  CheckSquare,
} from 'lucide-react';
import type { EntityType } from './types';

export const ENTITY_CONFIG: Record<
  EntityType,
  {
    icon: typeof Users;
    label: string;
    color: string;
  }
> = {
  client: {
    icon: Users,
    label: 'Clients',
    color: 'text-blue-500',
  },
  contact: {
    icon: Contact2,
    label: 'Contacts',
    color: 'text-green-500',
  },
  deal: {
    icon: Handshake,
    label: 'Deals',
    color: 'text-purple-500',
  },
  mission: {
    icon: Briefcase,
    label: 'Missions',
    color: 'text-orange-500',
  },
  quote: {
    icon: FileText,
    label: 'Devis',
    color: 'text-cyan-500',
  },
  invoice: {
    icon: Receipt,
    label: 'Factures',
    color: 'text-emerald-500',
  },
  proposal: {
    icon: FileCheck,
    label: 'Propositions',
    color: 'text-indigo-500',
  },
  brief: {
    icon: ClipboardList,
    label: 'Briefs',
    color: 'text-pink-500',
  },
  note: {
    icon: StickyNote,
    label: 'Notes',
    color: 'text-yellow-500',
  },
  task: {
    icon: CheckSquare,
    label: 'Tâches',
    color: 'text-red-500',
  },
};
