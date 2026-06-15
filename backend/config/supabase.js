const { createClient } = require('@supabase/supabase-js');
require('./env');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key in environment variables');
}

// Public client (anon key) — RLS enforced, for user-facing queries
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client (service_role key) — bypasses RLS, for trusted backend operations only
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;

module.exports = { supabase, supabaseAdmin };