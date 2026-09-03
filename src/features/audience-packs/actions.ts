"use server";

import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function setAudiencePackOptOut(formData: FormData) {
  const auth = await createServerAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/submit/login?error=auth");
  const communityId = String(formData.get("communityId") ?? "").trim();
  const packId = String(formData.get("packId") ?? "").trim();
  const optedOut = String(formData.get("optedOut") ?? "true") === "true";
  const slug = String(formData.get("slug") ?? "").trim();
  if (!communityId || !packId || !slug) redirect("/");
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc("set_audience_pack_opt_out", {
    p_pack_id: packId,
    p_community_id: communityId,
    p_opted_out: optedOut,
  });
  redirect(`/community/${encodeURIComponent(slug)}/edit?audience=${error ? "error" : "saved"}`);
}
