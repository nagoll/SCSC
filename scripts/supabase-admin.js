/**
 * Service-role Supabase client for scripts (seeding, the fetch/merge pipeline).
 * Bypasses RLS — never import this from src/.
 */
const { createClient } = require('@supabase/supabase-js');

function supabaseAdmin() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

module.exports = { supabaseAdmin };
