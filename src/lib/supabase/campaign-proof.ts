import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const CAMPAIGN_PROOF_BUCKET = "campaign-proof";
export async function getCampaignProofSignedUrl(path:string|null){
  if(!path || path.length>500 || path.includes("..")) return null;
  const db=createAdminSupabaseClient();
  const {data,error}=await db.storage.from(CAMPAIGN_PROOF_BUCKET).createSignedUrl(path,15*60);
  return error?null:data.signedUrl;
}
