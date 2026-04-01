// Prebuild script: Auto-swap Prisma schema for the correct database provider
// - SQLite for local development (file:./db/custom.db)
// - PostgreSQL for Railway production (postgres://...)

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const dbUrl = process.env.DATABASE_URL || '';
const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
const pgSchemaPath = join(process.cwd(), 'prisma', 'schema.postgresql.prisma');

console.log(`[prebuild] DATABASE_URL detected: ${dbUrl.substring(0, 30)}...`);

if (dbUrl.includes('postgres') || dbUrl.includes('postgresql')) {
  if (existsSync(pgSchemaPath)) {
    console.log('[prebuild] Swapping to PostgreSQL schema for production...');
    const pgSchema = readFileSync(pgSchemaPath, 'utf-8');
    writeFileSync(schemaPath, pgSchema, 'utf-8');
    console.log('[prebuild] PostgreSQL schema applied successfully.');
  } else {
    console.log('[prebuild] WARNING: schema.postgresql.prisma not found. Using current schema.');
  }
} else {
  console.log('[prebuild] Using SQLite schema for local development.');
}
