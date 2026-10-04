import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type DiscoveryRow={id:string;source_type:string;source_url:string;discovered_at:string;normalized_url:string;discovered_name:string|null;discovered_category:string|null;discovered_language:string|null;discovered_region:string|null;discovered_country_code:string|null;discovered_country_name:string|null;extraction_status:string;health_status:string;community_id:string|null;metadata:Record<string,unknown>};

export async function getInstagramDiscoveryQueue(limit=100){
  const admin=createAdminSupabaseClient() as any;
  const{data,error}=await admin.from("discovery_sources").select("id,source_type,source_url,discovered_at,normalized_url,discovered_name,discovered_category,discovered_language,discovered_region,discovered_country_code,discovered_country_name,extraction_status,health_status,community_id,metadata").eq("platform","instagram").order("discovered_at",{ascending:false}).limit(Math.max(1,Math.min(limit,200)));
  if(error)throw error;return (data??[]) as DiscoveryRow[];
}
export async function getInstagramDiscoveryOverview(){
  const rows=await getInstagramDiscoveryQueue(500);
  return {discovered:rows.length,published:rows.filter(x=>x.extraction_status==="published").length,duplicates:rows.filter(x=>x.extraction_status==="duplicate").length,inactive:rows.filter(x=>x.health_status==="inactive").length,recheck:rows.filter(x=>x.health_status==="needs_recheck").length,failed:rows.filter(x=>x.extraction_status==="failed").length};
}
