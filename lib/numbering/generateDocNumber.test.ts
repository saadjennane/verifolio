/**
 * Tests pour le système de numérotation
 * Exécuter avec: npx tsx lib/numbering/generateDocNumber.test.ts
 */

import { validatePattern, DEFAULT_PATTERNS, PATTERN_EXAMPLES } from './generateDocNumber';

// Couleurs pour le terminal
const green = '\x1b[32m';
const red = '\x1b[31m';
const reset = '\x1b[0m';

function test(name: string, fn: () => boolean) {
  try {
    const result = fn();
    if (result) {
      console.log(`${green}✓${reset} ${name}`);
    } else {
      console.log(`${red}✗${reset} ${name}`);
    }
  } catch (e) {
    console.log(`${red}✗${reset} ${name}: ${e}`);
  }
}

console.log('\n=== Tests de validation de patterns ===\n');

// Tests de patterns valides
test('Pattern FA-{SEQ:3}-{YY} est valide', () => {
  const result = validatePattern('FA-{SEQ:3}-{YY}');
  return result.valid && result.seqPadding === 3 && result.hasYear && !result.hasMonth;
});

test('Pattern FA/{SEQ:3}/{YY} est valide', () => {
  const result = validatePattern('FA/{SEQ:3}/{YY}');
  return result.valid && result.seqPadding === 3;
});

test('Pattern INV-{YYYY}-{MM}-{SEQ:4} est valide', () => {
  const result = validatePattern('INV-{YYYY}-{MM}-{SEQ:4}');
  return result.valid && result.seqPadding === 4 && result.hasYear && result.hasMonth;
});

test('Pattern F{YY}{MM}-{SEQ:3} est valide (reset mensuel)', () => {
  const result = validatePattern('F{YY}{MM}-{SEQ:3}');
  return result.valid && result.hasMonth;
});

test('Pattern {SEQ:1} seul est valide', () => {
  const result = validatePattern('{SEQ:1}');
  return result.valid && result.seqPadding === 1 && !result.hasYear;
});

// Tests de patterns invalides
test('Pattern sans SEQ est invalide', () => {
  const result = validatePattern('FA-{YY}');
  return !result.valid && result.error?.includes('SEQ');
});

test('Pattern avec 2 SEQ est invalide', () => {
  const result = validatePattern('FA-{SEQ:3}-{SEQ:2}');
  return !result.valid && result.error?.includes('un seul');
});

test('Pattern avec SEQ:0 est invalide', () => {
  const result = validatePattern('FA-{SEQ:0}');
  return !result.valid && result.error?.includes('entre 1 et 6');
});

test('Pattern avec SEQ:7 est invalide', () => {
  const result = validatePattern('FA-{SEQ:7}');
  return !result.valid && result.error?.includes('entre 1 et 6');
});

test('Pattern vide est invalide', () => {
  const result = validatePattern('');
  return !result.valid;
});

test('Pattern avec caractères spéciaux est invalide', () => {
  const result = validatePattern('FA@{SEQ:3}');
  return !result.valid && result.error?.includes('non autorisés');
});

// Tests des patterns par défaut
console.log('\n=== Patterns par défaut ===\n');

test('DEFAULT_PATTERNS.invoice est valide', () => {
  return validatePattern(DEFAULT_PATTERNS.invoice).valid;
});

test('DEFAULT_PATTERNS.quote est valide', () => {
  return validatePattern(DEFAULT_PATTERNS.quote).valid;
});

// Tests des exemples
console.log('\n=== Exemples de patterns ===\n');

PATTERN_EXAMPLES.forEach(({ pattern, example, description }) => {
  test(`${pattern} → ${example} (${description})`, () => {
    return validatePattern(pattern).valid;
  });
});

console.log('\n=== Tests terminés ===\n');
