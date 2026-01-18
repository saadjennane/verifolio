import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Système de numérotation automatique pour Verifolio
 *
 * Tokens supportés:
 * - {YYYY} : Année sur 4 chiffres (2025)
 * - {YY}   : Année sur 2 chiffres (25)
 * - {MM}   : Mois sur 2 chiffres (01-12)
 * - {DD}   : Jour sur 2 chiffres (01-31)
 * - {SEQ:n}: Séquence avec padding de n chiffres (n: 1-6)
 *
 * Exemples de patterns:
 * - FA-{SEQ:3}-{YY}  => FA-001-25
 * - FA/{SEQ:3}/{YY}  => FA/001/25
 * - INV-{YYYY}-{MM}-{SEQ:4} => INV-2025-01-0001
 */

type DocType = 'invoice' | 'quote';

interface GenerateDocNumberParams {
  supabase: SupabaseClient;
  userId: string;
  docType: DocType;
  pattern: string;
  date?: Date;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  seqPadding?: number;
  hasSEQ: boolean;
  hasYear: boolean;
  hasMonth: boolean;
}

// Regex pour les tokens valides
const TOKEN_REGEX = /\{(YYYY|YY|MM|DD|SEQ:\d+)\}/g;
const SEQ_REGEX = /\{SEQ:(\d+)\}/;

/**
 * Valide un pattern de numérotation
 */
export function validatePattern(pattern: string): ValidationResult {
  if (!pattern || pattern.trim() === '') {
    return { valid: false, error: 'Le pattern ne peut pas être vide', hasSEQ: false, hasYear: false, hasMonth: false };
  }

  // Trouver tous les tokens
  const tokens = pattern.match(TOKEN_REGEX) || [];

  // Vérifier qu'il y a au moins un token SEQ
  const seqMatches = pattern.match(/\{SEQ:\d+\}/g) || [];
  if (seqMatches.length === 0) {
    return { valid: false, error: 'Le pattern doit contenir un token {SEQ:n}', hasSEQ: false, hasYear: false, hasMonth: false };
  }
  if (seqMatches.length > 1) {
    return { valid: false, error: 'Le pattern ne peut contenir qu\'un seul token {SEQ:n}', hasSEQ: true, hasYear: false, hasMonth: false };
  }

  // Extraire le padding du SEQ
  const seqMatch = pattern.match(SEQ_REGEX);
  const seqPadding = seqMatch ? parseInt(seqMatch[1], 10) : 0;

  if (seqPadding < 1 || seqPadding > 6) {
    return { valid: false, error: 'Le padding SEQ doit être entre 1 et 6', hasSEQ: true, hasYear: false, hasMonth: false };
  }

  // Vérifier les caractères invalides (hors tokens)
  const withoutTokens = pattern.replace(TOKEN_REGEX, '');
  const invalidChars = withoutTokens.match(/[^a-zA-Z0-9\-/_.\s]/g);
  if (invalidChars) {
    return {
      valid: false,
      error: `Caractères non autorisés: ${[...new Set(invalidChars)].join(', ')}`,
      hasSEQ: true,
      hasYear: false,
      hasMonth: false,
    };
  }

  // Vérifier les tokens présents
  const hasYear = /\{YYYY\}|\{YY\}/.test(pattern);
  const hasMonth = /\{MM\}/.test(pattern);

  return {
    valid: true,
    seqPadding,
    hasSEQ: true,
    hasYear,
    hasMonth,
  };
}

/**
 * Calcule la clé de période selon les tokens présents
 */
function computePeriodKey(pattern: string, date: Date): string {
  const hasYear = /\{YYYY\}|\{YY\}/.test(pattern);
  const hasMonth = /\{MM\}/.test(pattern);

  if (!hasYear) {
    return 'global';
  }

  const year = date.getFullYear().toString();

  if (hasMonth) {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  return year;
}

/**
 * Substitue les tokens dans le pattern
 */
function substituteTokens(pattern: string, date: Date, seqValue: number, seqPadding: number): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return pattern
    .replace(/\{YYYY\}/g, year.toString())
    .replace(/\{YY\}/g, (year % 100).toString().padStart(2, '0'))
    .replace(/\{MM\}/g, month.toString().padStart(2, '0'))
    .replace(/\{DD\}/g, day.toString().padStart(2, '0'))
    .replace(/\{SEQ:\d+\}/g, seqValue.toString().padStart(seqPadding, '0'));
}

/**
 * Cherche un numéro de document réutilisable (brouillon supprimé dans la corbeille)
 * Retourne le numéro le plus petit disponible, ou null si aucun
 */
async function findReusableNumber(
  supabase: SupabaseClient,
  userId: string,
  docType: DocType,
  pattern: string,
  date: Date,
  seqPadding: number
): Promise<string | null> {
  const tableName = docType === 'quote' ? 'quotes' : 'invoices';

  // Chercher les documents brouillons supprimés (dans la corbeille)
  const { data: deletedDrafts, error } = await supabase
    .from(tableName)
    .select('numero')
    .eq('user_id', userId)
    .eq('status', 'brouillon')
    .not('deleted_at', 'is', null)
    .order('numero', { ascending: true });

  if (error || !deletedDrafts || deletedDrafts.length === 0) {
    return null;
  }

  // Générer le préfixe du pattern actuel (sans le numéro de séquence)
  // Par exemple pour "DEV-{SEQ:3}-{YY}" avec date 2026, le préfixe serait "DEV-" et le suffixe "-26"
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Créer un pattern de test avec un placeholder pour la séquence
  const testPattern = pattern
    .replace(/\{YYYY\}/g, year.toString())
    .replace(/\{YY\}/g, (year % 100).toString().padStart(2, '0'))
    .replace(/\{MM\}/g, month.toString().padStart(2, '0'))
    .replace(/\{DD\}/g, day.toString().padStart(2, '0'));

  // Extraire préfixe et suffixe autour de {SEQ:n}
  const seqMatch = testPattern.match(/^(.*?)\{SEQ:\d+\}(.*)$/);
  if (!seqMatch) return null;

  const prefix = seqMatch[1];
  const suffix = seqMatch[2];

  // Filtrer les numéros qui correspondent au pattern actuel
  const matchingNumbers = deletedDrafts
    .map(d => d.numero)
    .filter(n => n.startsWith(prefix) && n.endsWith(suffix))
    .map(n => {
      // Extraire le numéro de séquence
      const seqStr = n.slice(prefix.length, n.length - suffix.length || undefined);
      const seqNum = parseInt(seqStr, 10);
      return { numero: n, seq: seqNum };
    })
    .filter(item => !isNaN(item.seq))
    .sort((a, b) => a.seq - b.seq);

  if (matchingNumbers.length === 0) {
    return null;
  }

  // Vérifier que ce numéro n'est pas déjà utilisé par un document actif
  const reusableNumero = matchingNumbers[0].numero;
  const { data: existingActive } = await supabase
    .from(tableName)
    .select('id')
    .eq('user_id', userId)
    .eq('numero', reusableNumero)
    .is('deleted_at', null)
    .single();

  if (existingActive) {
    // Ce numéro est déjà utilisé par un document actif
    return null;
  }

  return reusableNumero;
}

/**
 * Génère un numéro de document unique basé sur un pattern
 * Réutilise les numéros de brouillons supprimés si disponibles
 */
export async function generateDocNumber({
  supabase,
  userId,
  docType,
  pattern,
  date = new Date(),
}: GenerateDocNumberParams): Promise<string> {
  // Valider le pattern
  const validation = validatePattern(pattern);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // D'abord, chercher s'il y a un numéro réutilisable (brouillon supprimé)
  const reusableNumber = await findReusableNumber(
    supabase,
    userId,
    docType,
    pattern,
    date,
    validation.seqPadding!
  );

  if (reusableNumber) {
    return reusableNumber;
  }

  // Calculer la clé de période
  const periodKey = computePeriodKey(pattern, date);

  // Appeler la fonction RPC pour obtenir la prochaine valeur de séquence
  const { data, error } = await supabase.rpc('next_sequence', {
    p_user_id: userId,
    p_doc_type: docType,
    p_period_key: periodKey,
    p_prefix_key: '',
  });

  if (error) {
    console.error('Error calling next_sequence RPC:', error);
    throw new Error(`Erreur lors de la génération du numéro: ${error.message}`);
  }

  const seqValue = data as number;

  // Substituer les tokens
  const documentNumber = substituteTokens(pattern, date, seqValue, validation.seqPadding!);

  return documentNumber;
}

/**
 * Prévisualise un numéro sans l'incrémenter (pour affichage)
 */
export async function previewDocNumber({
  supabase,
  userId,
  docType,
  pattern,
  date = new Date(),
}: GenerateDocNumberParams): Promise<string> {
  // Valider le pattern
  const validation = validatePattern(pattern);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Calculer la clé de période
  const periodKey = computePeriodKey(pattern, date);

  // Récupérer la dernière valeur sans incrémenter
  const { data, error } = await supabase
    .from('number_sequences')
    .select('last_value')
    .eq('user_id', userId)
    .eq('doc_type', docType)
    .eq('period_key', periodKey)
    .eq('prefix_key', '')
    .single();

  const currentValue = error || !data ? 0 : data.last_value;
  const nextValue = currentValue + 1;

  // Substituer les tokens
  return substituteTokens(pattern, date, nextValue, validation.seqPadding!);
}

/**
 * Patterns par défaut
 */
export const DEFAULT_PATTERNS = {
  invoice: 'FA-{SEQ:3}-{YY}',
  quote: 'DEV-{SEQ:3}-{YY}',
};

/**
 * Exemples de patterns pour l'UI
 */
export const PATTERN_EXAMPLES = [
  { pattern: 'FA-{SEQ:3}-{YY}', example: 'FA-001-25', description: 'Simple avec année' },
  { pattern: 'FA/{SEQ:3}/{YY}', example: 'FA/001/25', description: 'Avec slashes' },
  { pattern: 'INV-{YYYY}-{SEQ:4}', example: 'INV-2025-0001', description: 'Année complète' },
  { pattern: 'F{YY}{MM}-{SEQ:3}', example: 'F2501-001', description: 'Reset mensuel' },
  { pattern: '{YY}-{MM}-{DD}-{SEQ:2}', example: '25-01-15-01', description: 'Date complète' },
];
