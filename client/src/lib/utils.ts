import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns'

/**
 * Utility function to merge Tailwind classes
 * 
 * Why this exists:
 * - clsx: Conditionally joins classNames together (handles arrays, objects, strings)
 * - tailwind-merge: Merges Tailwind classes without conflicts (e.g., 'px-2 px-4' → 'px-4')
 * 
 * Usage:
 * cn('base-class', condition && 'conditional-class', ['array-class'])
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date utility
 * Using date-fns for consistent date formatting
 */
export function formatDate(date: Date | string): string {
  // const { format } = require('date-fns');
  return format(new Date(date), 'MMM d, yyyy h:mm a');
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Convert stored internal document name to user-facing name.
 * Internal format: <userId>_<sha256>_<originalFileName>
 */
export function getDisplayDocumentName(documentName: string): string {
  const parts = documentName.split('_');

  if (parts.length < 3) return documentName;

  const maybeUserId = parts[0];
  const maybeHash = parts[1];
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      maybeUserId
    );
  const isSha256 = /^[0-9a-f]{64}$/i.test(maybeHash);

  if (!isUuid || !isSha256) return documentName;

  return parts.slice(2).join('_');
}
