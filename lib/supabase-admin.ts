import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseAdminUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE;

export const supabaseAdminConfig = {
  url: supabaseAdminUrl,
  serviceRole: supabaseAdminKey,
};

export const supabaseAdmin: SupabaseClient | null =
  supabaseAdminUrl && supabaseAdminKey
    ? createClient(supabaseAdminUrl, supabaseAdminKey, {
        auth: {
          persistSession: false,
        },
      })
    : null;
