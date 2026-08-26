/**
 * Generates prisma/postgres/schema.prisma from prisma/schema.prisma.
 *
 * WHY THIS EXISTS
 * ---------------
 * Prisma's `datasource.provider` must be a static string - it cannot be read
 * from an env var. But this project wants two things at once:
 *
 *   - local dev on SQLite with zero infrastructure (`npm run dev` after a clone)
 *   - production on PostgreSQL with real, committed migrations
 *
 * Hand-maintaining two schema files guarantees drift. So `prisma/schema.prisma`
 * is the single source of truth (SQLite), and this script mechanically derives
 * the PostgreSQL copy from it. The derived file is committed so deploys never
 * have to run this.
 *
 * Run `npm run schema:sync` after ANY schema change, then regenerate the
 * migration (see `npm run schema:migration`).
 *
 * Usage:
 *   node scripts/sync-postgres-schema.mjs           # write the file
 *   node scripts/sync-postgres-schema.mjs --check    # verify it is up to date
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(here, '../prisma/schema.prisma');
const TARGET = resolve(here, '../prisma/postgres/schema.prisma');

const HEADER = `// ============================================================
// GENERATED FILE - DO NOT EDIT BY HAND.
//
// Derived from prisma/schema.prisma by scripts/sync-postgres-schema.mjs.
// Edit the source schema, then run: npm run schema:sync
//
// This is the schema used for PostgreSQL deployments. The models are
// byte-identical to the SQLite source; only the datasource provider differs.
// ============================================================

`;

const derive = (source) => {
  // Only touch the provider inside the `datasource` block. The `generator`
  // block also has a `provider` line ("prisma-client-js") which must not change.
  const datasourceBlock = /datasource\s+\w+\s*\{[\s\S]*?\n\}/;
  const match = source.match(datasourceBlock);

  if (!match) {
    throw new Error('Could not locate the datasource block in prisma/schema.prisma.');
  }

  const original = match[0];

  if (!/provider\s*=\s*"sqlite"/.test(original)) {
    throw new Error(
      'Expected the source datasource provider to be "sqlite". ' +
        'If the source schema is already PostgreSQL, this script is no longer needed.',
    );
  }

  const converted = original.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
  return HEADER + source.replace(original, converted);
};

const source = readFileSync(SOURCE, 'utf8');
const expected = derive(source);
const isCheckMode = process.argv.includes('--check');

if (isCheckMode) {
  const actual = existsSync(TARGET) ? readFileSync(TARGET, 'utf8') : '';
  if (actual !== expected) {
    console.error(
      '\nprisma/postgres/schema.prisma is out of date.\n' +
        'Run `npm run schema:sync` and commit the result.\n',
    );
    process.exit(1);
  }
  console.log('prisma/postgres/schema.prisma is up to date.');
  process.exit(0);
}

mkdirSync(dirname(TARGET), { recursive: true });
writeFileSync(TARGET, expected);
console.log(`Wrote ${TARGET}`);
