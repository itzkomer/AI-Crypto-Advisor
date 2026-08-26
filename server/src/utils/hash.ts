import { createHash } from 'node:crypto';

/**
 * Short, stable content fingerprint used inside `itemIdentifier` values so a
 * feedback row points at the exact content the user rated.
 */
export const shortHash = (input: string, length = 10): string =>
  createHash('sha256').update(input).digest('hex').slice(0, length);
