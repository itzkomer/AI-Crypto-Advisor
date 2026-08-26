/**
 * Helpers for the string-encoded JSON columns the schema uses to stay portable
 * between SQLite and PostgreSQL (see prisma/schema.prisma).
 */
import { z } from 'zod';

export const encodeList = (values: readonly string[]): string => JSON.stringify(values);

/**
 * Parses a JSON string column into a validated array, dropping unknown members.
 * Returns `fallback` when the column is corrupt rather than throwing - a bad row
 * should degrade one user's personalization, not 500 the dashboard.
 */
export const decodeList = <T extends string>(
  raw: string | null | undefined,
  allowed: readonly T[],
  fallback: T[] = [],
): T[] => {
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const allowedSet = new Set<string>(allowed);
    const result = parsed.filter((item): item is T => typeof item === 'string' && allowedSet.has(item));
    return result.length > 0 ? result : fallback;
  } catch {
    return fallback;
  }
};

/** Parses an arbitrary JSON column with a zod schema, returning null on failure. */
export const decodeJson = <T>(raw: string | null | undefined, schema: z.ZodType<T>): T | null => {
  if (!raw) return null;
  try {
    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};
