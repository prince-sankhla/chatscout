import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/** Records only an aggregate join event; no IP address or personal data is stored. */
export async function recordJoinClick(communityId: string) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("analytics_events").insert({ event_name: "join_click", community_id: communityId });
  return !error;
}
