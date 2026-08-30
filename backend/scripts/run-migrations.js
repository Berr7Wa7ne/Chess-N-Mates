/**
 * Run SQL migrations against Supabase Postgres.
 * Usage: node backend/scripts/run-migrations.js [file.sql]
 *
 * Requires DATABASE_URL or SUPABASE_DB_PASSWORD in .env
 */

require('../config/env');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

function getConnectionCandidates() {
  if (process.env.DATABASE_URL) {
    return [{ connectionString: process.env.DATABASE_URL, family: 0, label: 'DATABASE_URL' }];
  }

  const password = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
  if (!password || !match) return [];

  const ref = match[1];
  const encoded = encodeURIComponent(password);
  const regions = [
    'eu-west-1',
    'eu-west-2',
    'eu-west-3',
    'eu-central-1',
    'eu-north-1',
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'ap-southeast-1',
    'ap-northeast-1',
    'ap-south-1',
    'sa-east-1',
    'ca-central-1',
  ];

  const candidates = [
    {
      connectionString: `postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres`,
      family: 0,
      label: `db.${ref}.supabase.co`,
    },
  ];

  for (const region of regions) {
    for (const prefix of ['aws-0', 'aws-1']) {
      candidates.push({
        connectionString: `postgresql://postgres.${ref}:${encoded}@${prefix}-${region}.pooler.supabase.com:5432/postgres`,
        family: 4,
        label: `pooler ${prefix}-${region}:5432`,
      });
      candidates.push({
        connectionString: `postgresql://postgres.${ref}:${encoded}@${prefix}-${region}.pooler.supabase.com:6543/postgres`,
        family: 4,
        label: `pooler ${prefix}-${region}:6543`,
      });
    }
  }

  return candidates;
}

function listMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && !f.startsWith('_'))
    .sort();
}

async function runFile(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`\n→ Running ${path.basename(filePath)}`);
  await client.query(sql);
  console.log('  ✓ OK');
}

async function connectWithFallback(candidates) {
  let lastError = null;
  for (const conn of candidates) {
    const client = new Client({
      connectionString: conn.connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 12000,
      ...(conn.family ? { family: conn.family } : {}),
    });
    try {
      await client.connect();
      console.log(`Connected via ${conn.label}`);
      return client;
    } catch (err) {
      lastError = err;
      console.warn(`  ${conn.label}: ${(err.message || String(err)).split('\n')[0]}`);
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  throw lastError || new Error('No database connection candidates succeeded');
}

async function main() {
  const candidates = getConnectionCandidates();
  if (candidates.length === 0) {
    console.error(
      'Missing DATABASE_URL or SUPABASE_DB_PASSWORD.\n' +
        'Add SUPABASE_DB_PASSWORD to .env (Dashboard → Settings → Database).'
    );
    process.exit(1);
  }

  const arg = process.argv[2];
  const files = arg
    ? [path.isAbsolute(arg) ? arg : path.join(MIGRATIONS_DIR, arg)]
    : listMigrationFiles().map((f) => path.join(MIGRATIONS_DIR, f));

  const client = await connectWithFallback(candidates);

  try {
    for (const file of files) {
      if (!fs.existsSync(file)) throw new Error(`Migration not found: ${file}`);
      await runFile(client, file);
    }
    console.log('\nAll migrations completed.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
