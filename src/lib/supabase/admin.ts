import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabasePublicConfig, getSupabaseSecretKey } from "./config";

/** Trusted server-only client. Never import this module into a component. */
export function createAdminSupabaseClient() {
  const { url } = getSupabasePublicConfig();
  return createClient<Database>(url, getSupabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
