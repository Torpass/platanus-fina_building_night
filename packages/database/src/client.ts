import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabase: SupabaseClient = createSupabaseClient(
  supabaseUrl,
  supabaseServiceRoleKey
);

export function createClient(): SupabaseClient {
  return createSupabaseClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}
