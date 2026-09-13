import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ConvexError } from 'convex/values';

export function cn(...values: ClassValue[]) {
  return twMerge(clsx(values));
}
export function errorMessage(error: unknown) {
  return error instanceof ConvexError && typeof error.data === 'string'
    ? error.data
    : 'Something didn’t go through. Please try again.';
}
