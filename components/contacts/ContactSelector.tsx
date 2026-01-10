'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Select } from '@/components/ui';
import type { Contact, ClientContact } from '@/lib/types/contacts';

interface ClientContactWithDetails extends ClientContact {
  contact: Contact;
}

interface ContactSelectorProps {
  clientId: string;
  context?: 'FACTURATION' | 'OPERATIONNEL' | 'DIRECTION';
  value?: string;
  onChange: (contactId: string | null, contact: Contact | null) => void;
  label?: string;
  disabled?: boolean;
}

export function ContactSelector({
  clientId,
  context,
  value,
  onChange,
  label = 'Contact',
  disabled = false,
}: ContactSelectorProps) {
  const [contacts, setContacts] = useState<ClientContactWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContacts() {
      if (!clientId) {
        setContacts([]);
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from('client_contacts')
        .select('*, contact:contacts(*)')
        .eq('client_id', clientId);

      if (data) {
        // Sort: context-matching first, then primary, then others
        const sorted = [...data].sort((a, b) => {
          const flagA = context ? getContextFlag(a as ClientContactWithDetails, context) : false;
          const flagB = context ? getContextFlag(b as ClientContactWithDetails, context) : false;
          if (flagA !== flagB) return flagB ? 1 : -1;
          if (a.is_primary !== b.is_primary) return b.is_primary ? 1 : -1;
          return 0;
        });
        setContacts(sorted as ClientContactWithDetails[]);
      }
      setLoading(false);
    }

    fetchContacts();
  }, [clientId, context]);

  function getContextFlag(cc: ClientContactWithDetails, ctx: string): boolean {
    switch (ctx) {
      case 'FACTURATION':
        return cc.handles_billing;
      case 'OPERATIONNEL':
        return cc.handles_ops;
      case 'DIRECTION':
        return cc.handles_management;
      default:
        return false;
    }
  }

  function getContactLabel(cc: ClientContactWithDetails): string {
    const parts = [cc.contact.nom];
    if (cc.role) {
      parts.push(`(${cc.role})`);
    }
    const flags: string[] = [];
    if (cc.is_primary) flags.push('Principal');
    if (context === 'FACTURATION' && cc.handles_billing) flags.push('Facturation');
    if (context === 'OPERATIONNEL' && cc.handles_ops) flags.push('Operations');
    if (context === 'DIRECTION' && cc.handles_management) flags.push('Direction');
    if (flags.length > 0) {
      parts.push(`[${flags.join(', ')}]`);
    }
    return parts.join(' ');
  }

  const options = [
    { value: '', label: 'Aucun contact' },
    ...contacts.map((cc) => ({
      value: cc.contact_id,
      label: getContactLabel(cc),
    })),
  ];

  return (
    <Select
      label={label}
      value={value || ''}
      onChange={(e) => {
        const id = e.target.value || null;
        const contact = contacts.find((c) => c.contact_id === id)?.contact || null;
        onChange(id, contact);
      }}
      options={options}
      disabled={disabled || loading}
    />
  );
}
