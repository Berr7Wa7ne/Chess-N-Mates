/**
 * Run migration via Supabase Management API (uses CLI access token).
 * Usage: node backend/scripts/run-migration-api.js add_chess_com_auto_compute.sql
 */

require('../config/env');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJECT_REF = (process.env.SUPABASE_URL || '').match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];

function findAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;

  const candidates = [
    path.join(os.homedir(), '.supabase', 'access-token'),
    path.join(os.homedir(), '.config', 'supabase', 'access-token'),
    path.join(process.env.APPDATA || '', 'supabase', 'access-token'),
    path.join(process.env.LOCALAPPDATA || '', 'supabase', 'access-token'),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const token = fs.readFileSync(p, 'utf8').trim();
        if (token) return token;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

async function main() {
  const file = process.argv[2] || 'add_chess_com_auto_compute.sql';
  const filePath = path.join(__dirname, '..', 'migrations', file);
  const sql = fs.readFileSync(filePath, 'utf8');
  const token = findAccessToken();

  if (!PROJECT_REF) {
    throw new Error('Could not parse project ref from SUPABASE_URL');
  }
  if (!token) {
    throw new Error(
      'No Supabase access token. Run: npx supabase login\nOr set SUPABASE_ACCESS_TOKEN in .env'
    );
  }

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${body}`);
  }

  console.log(`Migration applied: ${file}`);
  if (body && body !== '[]') console.log(body);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
