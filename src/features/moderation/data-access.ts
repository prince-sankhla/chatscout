import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

export type PendingSubmission = Database["public"]["Tables"]["submissions"]["Row"];

export async function getPendingSubmissions() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  return error ? null : data;
}
