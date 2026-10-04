import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { resolveRenderedCommunityPreview } from "@/features/community-monitor/rendered-resolver";
import { extractInstagramDiscoveries } from "@/features/discovery/instagram-extractor";

const SOURCE_SEEDS=[
  {type:"reddit",url:"https://www.reddit.com/search/?q=%22ig.me%2Fj%2F%22&sort=new"},
  {type:"reddit",url:"https://www.reddit.com/r/InstagramFriends/search/?q=ig.me%2Fj&restrict_sr=1&sort=new"},
  {type:"reddit",url:"https://www.reddit.com/r/OnlineFriend/search/?q=ig.me%2Fj&restrict_sr=1&sort=new"},
  {type:"website",url:"https://pictame.com/en/discover/hashtag/instagram-groups-reels"},
  {type:"website",url:"https://www.chess.com/clubs/about/rohini-gang"},
  {type:"website",url:"https://www.royalroad.com/fiction/142260/cain-the-unwritten-soul/chapter/3113638/measured-recognition"},
  {type:"directory",url:"https://whatgroups.com/instagram-group-links/"},
  {type:"directory",url:"https://huggingface.co/spaces/frtarun/Instagroups"},
  {type:"google",url:"https://www.google.com/search?q=%22ig.me%2Fj%2F%22+%22instagram+gc%22"},
  {type:"bing",url:"https://www.bing.com/search?q=%22ig.me%2Fj%2F%22+%22instagram+group+chat%22"},
] as const;
type SourceType=(typeof SOURCE_SEEDS)[number]["type"];
function slugify(value:string){return value.toLowerCase().normalize("NFKD").replace(/[^\\p{Letter}\\p{Number}]+/gu,"-").replace(/^-+|-+$/g,"").slice(0,70)||"instagram-community";}
async function uniqueSlug(admin:any,base:string){let slug=slugify(base);const{data}=await admin.from("communities").select("slug").ilike("slug",`${slug}%`).limit(20);const used=new Set((data??[]).map((x:any)=>x.slug));if(!used.has(slug))return slug;for(let i=2;i<100;i++){const next=`${slug}-${i}`;if(!used.has(next))return next;}return `${slug}-${Date.now().toString(36)}`;}
function safeName(value:string|null,fallback:string){const v=(value??fallback).replace(/\\s+/g," ").trim().slice(0,140);return v||fallback;}
function safeDescription(value:string|null,source:string){const v=(value??"").replace(/\\s+/g," ").trim().slice(0,1000);return v.length>=30?v:`Instagram group chat discovered from ${source}. Join through the official Instagram invite link.`;}
async function fetchSource(url:string){const response=await fetch(url,{redirect:"follow",headers:{"user-agent":"ChatScoutBot/1.0 (+https://chatscout-ten.vercel.app/)",accept:"text/html,application/xhtml+xml"},cache:"no-store",signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.text();}
async function categoryId(admin:any,category:string|null){if(!category)return null;const map:Record<string,string>={"AI & ML":"AI","Cloud & DevOps":"Technology",College:"College Students",Music:"Music",Sports:"Sports",Friends:"Random & Friends",Anime:"Anime",Gaming:"Gaming",Coding:"Coding"};const name=map[category]??"General";const{data}=await admin.from("categories").select("id").eq("name",name).eq("is_active",true).limit(1);return data?.[0]?.id??null;}

async function ingestOne(admin:any,sourceUrl:string,sourceType:SourceType,d:any){
  const existing=await admin.from("discovery_sources").select("id,community_id,extraction_status").eq("normalized_url",d.normalizedUrl).maybeSingle();
  if(existing.data?.community_id)return {status:"existing",communityId:existing.data.community_id};
  const seed={source_type:sourceType,source_url:sourceUrl,raw_url:d.rawUrl,normalized_url:d.normalizedUrl,platform:"instagram",title:d.title,description:d.description,discovered_name:d.name,discovered_category:d.category,discovered_language:d.language,discovered_region:d.region,metadata:{extractor:"instagram-invite-v1"}};
  const{data:source,error:sourceError}=await admin.from("discovery_sources").upsert(seed,{onConflict:"normalized_url"}).select("id").single();
  if(sourceError)return {status:"failed",error:sourceError.message};
  const{data:dupe}=await admin.from("communities").select("id,slug,health_status").eq("status","published").ilike("invite_url",d.normalizedUrl).maybeSingle();
  if(dupe){await admin.from("discovery_sources").update({community_id:dupe.id,extraction_status:"duplicate",health_status:dupe.health_status??"unknown"}).eq("id",source.id);return {status:"duplicate",communityId:dupe.id};}
  const preview=await resolveRenderedCommunityPreview(d.normalizedUrl);
  const explicitInactive=preview.status==="inactive";
  const signal=preview.status==="healthy"&&Boolean(preview.name||preview.memberCount!==null||preview.imageUrl);
  const health=explicitInactive?"inactive":signal?"healthy":"needs_recheck";
  if(explicitInactive){await admin.from("discovery_sources").update({extraction_status:"rejected",health_status:"inactive",health_checked_at:new Date().toISOString(),health_error:"Explicit inactive/invalid invite evidence."}).eq("id",source.id);return {status:"inactive"};}
  const name=safeName(preview.name??d.name,`${d.category??"Instagram"} Group Chat`);
  const slug=await uniqueSlug(admin,name);
  const description=safeDescription(d.description??d.title,sourceUrl);
  const platformScope=d.region&&/^india$/i.test(d.region)?"india":"global";
  const insert={name,slug,platform:"instagram",invite_url:d.normalizedUrl,description,language:d.language,region:d.region,member_count:preview.memberCount??null,status:"published",join_enabled:signal,verification_status:"unverified",health_status:health,health_last_checked_at:new Date().toISOString(),health_failure_count:signal?0:1,auto_monitor_enabled:true,last_remote_name:preview.name??null,last_remote_member_count:preview.memberCount??null,last_health_error:signal?null:"Instagram invite could not be conclusively verified.",source_url:sourceUrl,platform_scope:platformScope,claim_status:"unclaimed",needs_manual_review:true,quality_version:0,quality_issues:[]};
  const{data:community,error}=await admin.from("communities").insert(insert).select("id").single();
  if(error){await admin.from("discovery_sources").update({extraction_status:"failed",health_status:health,health_error:error.message}).eq("id",source.id);return {status:"failed",error:error.message};}
  const cid=await categoryId(admin,d.category);if(cid)await admin.from("community_categories").insert({community_id:community.id,category_id:cid});
  await admin.rpc("refresh_directory_quality",{p_limit:1});
  const{data:quality}=await admin.from("communities").select("quality_score,quality_grade").eq("id",community.id).single();
  await admin.from("communities").update({needs_manual_review:quality?.quality_grade!=="good"}).eq("id",community.id);
  await admin.from("discovery_sources").update({community_id:community.id,extraction_status:"published",health_status:health,health_checked_at:new Date().toISOString(),metadata:{extractor:"instagram-invite-v1",quality_score:quality?.quality_score??null,quality_grade:quality?.quality_grade??null}}).eq("id",source.id);
  return {status:"published",communityId:community.id,quality:quality?.quality_grade??null};
}

export async function runInstagramDiscovery(limit=50){
  const admin=createAdminSupabaseClient() as any;let fetched=0,found=0,published=0,duplicates=0,inactive=0,failed=0;
  for(const seed of SOURCE_SEEDS.slice(0,8)){
    if(found>=limit)break;
    try{
      const html=await fetchSource(seed.url);const discoveries=extractInstagramDiscoveries(html);fetched++;
      for(const d of discoveries){if(found>=limit)break;found++;const result=await ingestOne(admin,seed.url,seed.type,d);if(result.status==="published")published++;else if(result.status==="duplicate"||result.status==="existing")duplicates++;else if(result.status==="inactive")inactive++;else if(result.status==="failed")failed++;}
      await admin.from("discovery_sources").upsert({source_type:seed.type,source_url:seed.url,raw_url:seed.url,normalized_url:seed.url.replace(/[?#].*$/g,"").replace(/\/$/,"").toLowerCase(),platform:"instagram",extraction_status:"processed",metadata:{last_scan_count:discoveries.length}}, {onConflict:"normalized_url"});
    }catch(error){await admin.from("discovery_sources").upsert({source_type:seed.type,source_url:seed.url,raw_url:seed.url,normalized_url:seed.url.replace(/[?#].*$/g,"").replace(/\/$/,"").toLowerCase(),platform:"instagram",extraction_status:"failed",health_status:"needs_recheck",health_error:error instanceof Error?error.message:"Source fetch failed",metadata:{last_scan_failed:true}}, {onConflict:"normalized_url"});failed++;}
  }
  return {fetchedSources:fetched,found,published,duplicates,inactive,failed};
}
