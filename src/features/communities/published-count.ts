import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getPublishedCommunityCount(): Promise<number> {
  const supabase = createServerSupabaseClient();
  const { count } = await supabase
    .from("communities")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");
  return count ?? 0;
}
