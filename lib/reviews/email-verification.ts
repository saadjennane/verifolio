/**
 * Email Verification Utilities
 *
 * Soft verification based on email domain type.
 * Professional emails (company domains) vs generic emails (gmail, yahoo, etc.)
 *
 * Note: This is informational only - no blocking or validation is performed.
 */

/**
 * List of generic/personal email domains
 * These are free email providers commonly used for personal accounts
 */
const GENERIC_EMAIL_DOMAINS = [
  // Google
  'gmail.com',
  'googlemail.com',

  // Yahoo
  'yahoo.com',
  'yahoo.fr',
  'ymail.com',

  // Microsoft
  'outlook.com',
  'hotmail.com',
  'hotmail.fr',
  'live.com',
  'msn.com',

  // Apple
  'icloud.com',
  'me.com',
  'mac.com',

  // Proton
  'protonmail.com',
  'proton.me',

  // Other
  'aol.com',

  // French ISPs
  'free.fr',
  'orange.fr',
  'sfr.fr',
  'laposte.net',

  // Other free providers
  'gmx.com',
  'gmx.fr',
  'mail.com',
  'zoho.com',
];

/**
 * Check if an email address uses a professional (company) domain
 *
 * @param email - The email address to check
 * @returns true if the email uses a company domain, false if it's a generic provider
 *
 * @example
 * isProfessionalEmail('john@acme.com')     // true
 * isProfessionalEmail('john@gmail.com')    // false
 * isProfessionalEmail('john@outlook.com')  // false
 */
export function isProfessionalEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const parts = email.toLowerCase().split('@');
  if (parts.length !== 2) {
    return false;
  }

  const domain = parts[1];
  if (!domain) {
    return false;
  }

  return !GENERIC_EMAIL_DOMAINS.includes(domain);
}

/**
 * Get the domain from an email address
 *
 * @param email - The email address
 * @returns The domain part of the email, or null if invalid
 */
export function getEmailDomain(email: string): string | null {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const parts = email.toLowerCase().split('@');
  if (parts.length !== 2) {
    return null;
  }

  return parts[1] || null;
}
