import { createClient } from '@supabase/supabase-js';

/** Read-only, anon-key client. All reads happen server-side (Server Components), gated by RLS select policies. */
export const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
