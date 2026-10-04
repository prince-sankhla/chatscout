"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/auth";
import type { AdminAuditAction } from "@/types/database";
function idsValue(formData:FormData){return[...new Set(String(formData.get("communityIds")??"").split(",").map(v=>v.trim()).filter(v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)))].slice(0,100);}
async function audit(adminUserId:string,action:AdminAuditAction,communityId:string|null,note:string){await createAdminSupabaseClient().from("admin_audit_log").insert({action,admin_user_id:adminUserId,community_id:communityId,note});}
function revalidate(){revalidatePath("/admin");revalidatePath("/admin/quality");}
export async function runQualityBatch(formData:FormData){const user=await requireAdminUser();const raw=Number(formData.get("limit")??1000);const limit=Number.isFinite(raw)?Math.max(1,Math.min(Math.floor(raw),2000)):1000;const{data,error}=await createAdminSupabaseClient().rpc("refresh_directory_quality",{p_limit:limit});if(error)redirect("/admin/quality?status=failed");await audit(user.id,"quality_scanned",null,"Quality pipeline processed "+String(Number(data??0))+" listing(s).");revalidate();redirect("/admin/quality?status=scanned");}
export async function bulkReviewQuality(formData:FormData){const user=await requireAdminUser();const ids=idsValue(formData);if(!ids.length)redirect("/admin/quality?status=none-selected");const note=String(formData.get("reviewNote")??"").trim().slice(0,2000);const now=new Date().toISOString();const{error}=await createAdminSupabaseClient().from("communities").update({quality_reviewed_at:now,quality_reviewed_by:user.id,quality_review_note:note||null}).eq("status","published").in("id",ids);if(error)redirect("/admin/quality?status=failed");await Promise.all(ids.map(id=>audit(user.id,"quality_reviewed",id,note||"Quality issue reviewed by admin.")));revalidate();redirect("/admin/quality?status=reviewed");}
