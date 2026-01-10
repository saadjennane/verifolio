/**
 * Tests for the Proposal Variables Engine
 *
 * Run with: npx tsx lib/proposals/variables.test.ts
 * Or integrate with Jest/Vitest when available
 */

import {
  renderTemplate,
  buildVariableMap,
  extractVariableKeys,
  buildContextFromProposal,
  renderProposalSections,
  type VariableContext,
} from './variables';

// ============================================================================
// Test Utilities
// ============================================================================

let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`✅ ${name}`);
  } catch (err) {
    failCount++;
    console.log(`❌ ${name}`);
    console.log(`   ${(err as Error).message}`);
  }
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: T) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toContain(expected: string) {
      if (typeof actual !== 'string' || !actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    },
  };
}

// ============================================================================
// Tests: renderTemplate
// ============================================================================

console.log('\n📦 renderTemplate tests:\n');

test('replaces single variable', () => {
  const result = renderTemplate('Hello {{name}}!', { name: 'World' });
  expect(result).toBe('Hello World!');
});

test('replaces multiple variables', () => {
  const result = renderTemplate('{{greeting}} {{name}}!', { greeting: 'Hello', name: 'World' });
  expect(result).toBe('Hello World!');
});

test('keeps unknown variables as-is', () => {
  const result = renderTemplate('Hello {{unknown}}!', {});
  expect(result).toBe('Hello {{unknown}}!');
});

test('handles empty value - keeps placeholder', () => {
  const result = renderTemplate('Hello {{name}}!', { name: '' });
  expect(result).toBe('Hello {{name}}!');
});

test('handles null/undefined input', () => {
  const result = renderTemplate('', { name: 'World' });
  expect(result).toBe('');
});

test('replaces same variable multiple times', () => {
  const result = renderTemplate('{{x}} + {{x}} = {{x}}{{x}}', { x: '1' });
  expect(result).toBe('1 + 1 = 11');
});

test('supports snake_case variables', () => {
  const result = renderTemplate('{{client_name}} from {{client_city}}', {
    client_name: 'Acme Corp',
    client_city: 'Paris',
  });
  expect(result).toBe('Acme Corp from Paris');
});

// ============================================================================
// Tests: buildVariableMap
// ============================================================================

console.log('\n📦 buildVariableMap tests:\n');

test('builds map from company data', () => {
  const context: VariableContext = {
    company: {
      name: 'My Company',
      email: 'contact@company.com',
      phone: '+33 1 23 45 67 89',
    },
  };
  const map = buildVariableMap(context);
  expect(map.company_name).toBe('My Company');
  expect(map.company_email).toBe('contact@company.com');
  expect(map.company_phone).toBe('+33 1 23 45 67 89');
});

test('builds map from client data', () => {
  const context: VariableContext = {
    client: {
      name: 'Client Corp',
      email: 'client@example.com',
      address: '123 Main St',
      city: 'Paris',
      postal_code: '75001',
      country: 'France',
    },
  };
  const map = buildVariableMap(context);
  expect(map.client_name).toBe('Client Corp');
  expect(map.client_full_address).toBe('123 Main St, 75001, Paris, France');
});

test('builds map from deal data', () => {
  const context: VariableContext = {
    deal: {
      title: 'Website Redesign',
      amount: 15000,
      currency: 'EUR',
    },
  };
  const map = buildVariableMap(context);
  expect(map.deal_title).toBe('Website Redesign');
  expect(map.deal_amount).toContain('15');
  expect(map.deal_amount).toContain('€');
});

test('builds map from contact data with full_name', () => {
  const context: VariableContext = {
    contact: {
      full_name: 'Jean Dupont',
      email: 'jean@example.com',
    },
  };
  const map = buildVariableMap(context);
  expect(map.contact_name).toBe('Jean Dupont');
  expect(map.contact_email).toBe('jean@example.com');
});

test('builds map from contact data with first/last name', () => {
  const context: VariableContext = {
    contact: {
      first_name: 'Jean',
      last_name: 'Dupont',
    },
  };
  const map = buildVariableMap(context);
  expect(map.contact_name).toBe('Jean Dupont');
  expect(map.contact_first_name).toBe('Jean');
  expect(map.contact_last_name).toBe('Dupont');
});

test('custom variables override other sources', () => {
  const context: VariableContext = {
    client: { name: 'Original Client' },
    custom: { client_name: 'Overridden Client' },
  };
  const map = buildVariableMap(context);
  expect(map.client_name).toBe('Overridden Client');
});

test('ignores null/undefined/empty custom values', () => {
  const context: VariableContext = {
    client: { name: 'Client' },
    custom: { client_name: '', other_var: null as unknown as string },
  };
  const map = buildVariableMap(context);
  expect(map.client_name).toBe('Client');
});

// ============================================================================
// Tests: extractVariableKeys
// ============================================================================

console.log('\n📦 extractVariableKeys tests:\n');

test('extracts single variable', () => {
  const keys = extractVariableKeys('Hello {{name}}!');
  expect(keys).toEqual(['name']);
});

test('extracts multiple unique variables', () => {
  const keys = extractVariableKeys('{{a}} {{b}} {{c}}');
  expect(keys).toEqual(['a', 'b', 'c']);
});

test('deduplicates repeated variables', () => {
  const keys = extractVariableKeys('{{x}} + {{x}} = {{result}}');
  expect(keys).toEqual(['x', 'result']);
});

test('returns empty array for no variables', () => {
  const keys = extractVariableKeys('No variables here');
  expect(keys).toEqual([]);
});

test('returns empty array for empty string', () => {
  const keys = extractVariableKeys('');
  expect(keys).toEqual([]);
});

// ============================================================================
// Tests: buildContextFromProposal
// ============================================================================

console.log('\n📦 buildContextFromProposal tests:\n');

test('builds context from full proposal', () => {
  const proposal = {
    variables: [
      { key: 'custom_var', value: 'Custom Value' },
    ],
    deal: {
      title: 'Big Project',
      estimated_amount: 50000,
      currency: 'EUR',
    },
    client: {
      nom: 'Acme Corp',
      email: 'contact@acme.com',
    },
    recipients: [
      {
        contact: {
          prenom: 'John',
          nom: 'Doe',
          email: 'john@acme.com',
        },
      },
    ],
    company: {
      name: 'My Agency',
    },
  };

  const context = buildContextFromProposal(proposal);

  expect(context.custom?.custom_var).toBe('Custom Value');
  expect(context.deal?.title).toBe('Big Project');
  expect(context.deal?.amount).toBe(50000);
  expect(context.client?.name).toBe('Acme Corp');
  expect(context.contact?.first_name).toBe('John');
  expect(context.contact?.last_name).toBe('Doe');
  expect(context.company?.name).toBe('My Agency');
});

test('handles proposal with no recipients', () => {
  const proposal = {
    deal: { title: 'Project' },
    client: { nom: 'Client' },
    recipients: [],
  };

  const context = buildContextFromProposal(proposal);
  expect(context.contact).toBe(undefined);
});

test('handles proposal with null fields', () => {
  const proposal = {
    deal: null,
    client: null,
    recipients: undefined,
    company: null,
  };

  const context = buildContextFromProposal(proposal);
  expect(context.deal).toBe(undefined);
  expect(context.client).toBe(undefined);
  expect(context.contact).toBe(undefined);
  expect(context.company).toBe(undefined);
});

// ============================================================================
// Tests: renderProposalSections
// ============================================================================

console.log('\n📦 renderProposalSections tests:\n');

test('renders variables in section title and body', () => {
  const sections = [
    {
      id: '1',
      title: 'Proposition pour {{client_name}}',
      body: 'Montant: {{deal_amount}}',
      position: 0,
      is_enabled: true,
    },
  ];

  const context: VariableContext = {
    client: { name: 'Acme' },
    deal: { amount: 1000, currency: 'EUR' },
  };

  const rendered = renderProposalSections(sections, context);

  expect(rendered[0].title).toBe('Proposition pour Acme');
  expect(rendered[0].body).toContain('1');
});

test('preserves other section properties', () => {
  const sections = [
    {
      id: 'abc',
      title: 'Title',
      body: 'Body',
      position: 5,
      is_enabled: false,
    },
  ];

  const rendered = renderProposalSections(sections, {});

  expect(rendered[0].id).toBe('abc');
  expect(rendered[0].position).toBe(5);
  expect(rendered[0].is_enabled).toBe(false);
});

// ============================================================================
// Test Summary
// ============================================================================

console.log('\n' + '='.repeat(50));
console.log(`\n📊 Test Results: ${passCount}/${testCount} passed`);
if (failCount > 0) {
  console.log(`   ❌ ${failCount} failed`);
  process.exit(1);
} else {
  console.log('   ✅ All tests passed!');
}
