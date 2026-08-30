import "server-only";
import { createServerSupabaseClient } from "./server";

export type SupabaseConnectionTestResult =
  | { ok: true; activeCategoryFound: boolean }
  | { ok: false; code: "SUPABASE_READ_FAILED" };

/** A harmless RLS-protected read; an empty result is a successful connection. */
export async function testSupabaseReadConnection(): Promise<SupabaseConnectionTestResult> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("categories").select("id").eq("is_active", true).limit(1);
  if (error) return { ok: false, code: "SUPABASE_READ_FAILED" };
  return { ok: true, activeCategoryFound: data.length > 0 };
}
