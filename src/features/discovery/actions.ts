"use server";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/supabase/auth";
import { runInstagramDiscovery } from "@/features/discovery/instagram-ingestion";

export async function runInstagramDiscoveryNow(formData:FormData){
  await requireAdminUser();
  try{const limit=Math.max(1,Math.min(Number(formData.get("limit")??100)||100,120));const result=await runInstagramDiscovery(limit);redirect(`/admin/discovery?status=done&published=${result.published}&found=${result.found}`);}
  catch{redirect("/admin/discovery?status=failed");}
}
