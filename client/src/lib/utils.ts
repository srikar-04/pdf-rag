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
