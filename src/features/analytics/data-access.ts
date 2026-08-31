import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/** Records only aggregate activity; no IP address or personal data is stored. */
export async function recordCommunityView(communityId: string) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("analytics_events").insert({ event_name: "community_view", community_id: communityId });
  return !error;
}

export async function recordJoinClick(communityId: string) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("analytics_events").insert({ event_name: "join_click", community_id: communityId });
  return !error;
}
