"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const BUCKET = "campaign-proof";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIME_EXT:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","application/pdf":"pdf"};
function text(form:FormData,key:string){return String(form.get(key)??"").trim();}
async function currentUser(){const auth=await createServerAuthClient();const {data:{user}}=await auth.auth.getUser();return user;}

export async function startParticipation(form:FormData){
 const user=await currentUser();if(!user)redirect('/submit/login?error=auth');
 const db=createAdminSupabaseClient() as any;const id=text(form,'participationId');const {error}=await db.rpc('start_campaign_participation',{p_participation_id:id});if(error)throw new Error(error.message);
 revalidatePath(`/dashboard/rewards/${text(form,'campaignId')}`);revalidatePath('/dashboard/rewards');revalidatePath('/dashboard/notifications');void user;
}

export async function startDeliverable(form:FormData){
 const user=await currentUser();if(!user)redirect('/submit/login?error=auth');
 const db=createAdminSupabaseClient() as any;const participationId=text(form,'participationId'),deliverableId=text(form,'deliverableId');const {error}=await db.rpc('start_campaign_deliverable',{p_participation_id:participationId,p_deliverable_id:deliverableId});if(error)throw new Error(error.message);
 revalidatePath(`/dashboard/rewards/${text(form,'campaignId')}`);void user;
}

export async function submitDeliverable(form:FormData){
 const user=await currentUser();if(!user)redirect('/submit/login?error=auth');
 const participationId=text(form,'participationId'),deliverableId=text(form,'deliverableId'),campaignId=text(form,'campaignId'),submissionType=text(form,'submissionType');
 const content=text(form,'content');const metricRaw=text(form,'metricValue');const metricValue=metricRaw?Number(metricRaw):null;if(metricRaw&&(!Number.isFinite(metricValue)||Number(metricValue)<0))throw new Error('Metric value must be a non-negative number.');
 const fileEntry=form.get('proofFile');let filePath:string|null=null;const db=createAdminSupabaseClient() as any;
 if(fileEntry instanceof File && fileEntry.size>0){
   if(fileEntry.size>MAX_FILE_SIZE)throw new Error('Proof file must be 10 MB or smaller.');
   const extension=MIME_EXT[fileEntry.type];if(!extension)throw new Error('Unsupported proof file type. Use JPG, PNG, WebP or PDF.');
   const bytes=await fileEntry.arrayBuffer();const path=`${user.id}/${participationId}/${deliverableId}/${crypto.randomUUID()}.${extension}`;
   const {error:uploadError}=await db.storage.from(BUCKET).upload(path,bytes,{contentType:fileEntry.type,upsert:false});if(uploadError)throw new Error(uploadError.message);filePath=path;
 }
 try{
   const {error}=await db.rpc('submit_campaign_deliverable_record',{p_participation_id:participationId,p_deliverable_id:deliverableId,p_submission_type:submissionType,p_content:content||null,p_metric_value:metricValue,p_file_path:filePath});
   if(error)throw new Error(error.message);
 }catch(error){if(filePath)await db.storage.from(BUCKET).remove([filePath]);throw error;}
 revalidatePath(`/dashboard/rewards/${campaignId}`);revalidatePath('/dashboard/rewards');revalidatePath('/dashboard/notifications');
}
