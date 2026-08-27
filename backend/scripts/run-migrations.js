/**
 * Run SQL migrations against Supabase Postgres.
 * Usage: node backend/scripts/run-migrations.js [file.sql]
 *
 * Requires DATABASE_URL or SUPABASE_DB_PASSWORD in .env
 * (Project ref from SUPABASE_URL: db.<ref>.supabase.co)
 */

require('../config/env');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

function getConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const password = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
  if (password && match) {
    const ref = match[1];
    return `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
  }

  return null;
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
  console.log(`  ✓ OK`);
}

async function main() {
  const conn = getConnectionString();
  if (!conn) {
    console.error(
      'Missing DATABASE_URL or SUPABASE_DB_PASSWORD.\n' +
        'Add one to .env:\n' +
        '  DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres\n' +
        '  — or —\n' +
        '  SUPABASE_DB_PASSWORD=your_db_password'
    );
    process.exit(1);
  }

  const arg = process.argv[2];
  const files = arg
    ? [path.isAbsolute(arg) ? arg : path.join(MIGRATIONS_DIR, arg)]
    : listMigrationFiles().map((f) => path.join(MIGRATIONS_DIR, f));

  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to database.');

  try {
    for (const file of files) {
      if (!fs.existsSync(file)) {
        throw new Error(`Migration not found: ${file}`);
      }
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
