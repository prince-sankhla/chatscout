import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { resolveRenderedCommunityPreview } from "@/features/community-monitor/rendered-resolver";
import { extractInstagramDiscoveries } from "@/features/discovery/instagram-extractor";
import { COUNTRIES, detectCountry } from "@/lib/countries";

const REDDIT_SUBREDDITS = ["InstagramFriends","OnlineFriend","MakeNewFriendsHere","friendship","Needafriend","IndianTeenagers","TeenIndia","Delhi_teens","MSRITians","NHCEBengaluru","NiTNarula","India","college","anime","gaming","music","books","Travel","Cricket","soccer"] as const;
const SEARCH_QUERIES = [
  '"ig.me/j/" "instagram group chat"', '"ig.me/j/" "instagram gc"', '"ig.me/j/" college instagram',
  '"ig.me/j/" anime instagram gc', '"ig.me/j/" gaming instagram gc', '"ig.me/j/" India instagram gc',
  '"ig.me/j/" Jaipur instagram gc', '"ig.me/j/" Delhi instagram gc', '"ig.me/j/" fresher instagram gc',
  '"ig.me/j/" friends instagram gc', '"ig.me/j/" music instagram gc', '"ig.me/j/" cricket instagram gc',
] as const;
const SOURCE_SEEDS = [
  ...REDDIT_SUBREDDITS.map((subreddit) => ({type:"reddit" as const,url:`https://www.reddit.com/r/${subreddit}/search.json?q=ig.me%2Fj&restrict_sr=1&sort=new&t=year&limit=100`})),
  {type:"reddit" as const,url:"https://www.reddit.com/search.json?q=%22ig.me%2Fj%2F%22&sort=new&t=year&limit=100"},
  ...SEARCH_QUERIES.map((q) => ({type:"bing" as const,url:`https://www.bing.com/search?q=${encodeURIComponent(q)}&count=50`})),
  {type:"website" as const,url:"https://sop.utoronto.ca/group/u-of-t-rubiks-cube-club-utrcc/"},
  {type:"website" as const,url:"https://bookclubs.com/join-a-book-club/club/psst-psst"},
  {type:"website" as const,url:"https://www.meetup.com/tokyo-electronic-music-production-meetup-group/"},
  {type:"website" as const,url:"https://www.meetup.com/meet-bkk/"},
  {type:"website" as const,url:"https://www.meetup.com/chillpal/"},
  {type:"website" as const,url:"https://luma.com/4ccc6dj2"},
  {type:"website" as const,url:"https://joinagroupchat.com/instagram"},
  {type:"website" as const,url:"https://kendamadepot.com/apps/help-center"},
] as const;
type SourceType=(typeof SOURCE_SEEDS)[number]["type"];

function rotatingCountrySeeds(){
  const day=Math.floor(Date.now()/86400000);
  const batchSize=3;
  const start=(day*batchSize)%COUNTRIES.length;
  const batch=Array.from({length:batchSize},(_,offset)=>COUNTRIES[(start+offset)%COUNTRIES.length]);
  return batch.map((country)=>({type:"bing" as const,url:`https://www.bing.com/search?q=${encodeURIComponent('"ig.me/j/" "instagram group chat" "'+country.name+'"')}&count=50`}));
}

function slugify(value:string){return value.toLowerCase().normalize("NFKD").replace(/[^\p{Letter}\p{Number}]+/gu,"-").replace(/^-+|-+$/g,"").slice(0,70)||"instagram-community";}
async function uniqueSlug(admin:any,base:string){const slug=slugify(base);const{data}=await admin.from("communities").select("slug").ilike("slug",`${slug}%`).limit(100);const used=new Set((data??[]).map((x:any)=>x.slug));if(!used.has(slug))return slug;for(let i=2;i<1000;i++){const next=`${slug}-${i}`;if(!used.has(next))return next;}return `${slug}-${Date.now().toString(36)}`;}
function safeName(value:string|null,fallback:string){const v=(value??fallback).replace(/\s+/g," ").trim().slice(0,140);return v||fallback;}
function safeDescription(value:string|null,source:string){const v=(value??"").replace(/\s+/g," ").trim().slice(0,1000);return v.length>=30?v:`Instagram group chat discovered from ${source}. Join through the official Instagram invite link.`;}

async function fetchSource(url:string){
  const isRedditJson=url.includes("reddit.com/")&&url.includes(".json");
  const response=await fetch(url,{redirect:"follow",headers:{"user-agent":"ChatScoutBot/1.2 (+https://chatscout-ten.vercel.app/)",accept:isRedditJson?"application/json":"text/html,application/xhtml+xml"},cache:"no-store",signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const text=await response.text();
  if(!isRedditJson)return text;
  try{const payload=JSON.parse(text);const posts=payload?.data?.children??[];return posts.map((item:any)=>{const d=item?.data??{};return `<article><h2>${d.title??""}</h2><p>${d.selftext??""}</p><a href="https://www.reddit.com${d.permalink??""}">source</a></article>`;}).join("\n");}catch{throw new Error("Invalid Reddit JSON response");}
}
async function categoryId(admin:any,category:string|null){if(!category)return null;const map:Record<string,string>={"AI & ML":"AI","Cloud & DevOps":"Technology",College:"College Students",Music:"Music",Sports:"Sports",Friends:"Random & Friends",Anime:"Anime",Gaming:"Gaming",Coding:"Coding"};const name=map[category]??"General";const{data}=await admin.from("categories").select("id").eq("name",name).eq("is_active",true).limit(1);return data?.[0]?.id??null;}

async function ingestOne(admin:any,sourceUrl:string,sourceType:SourceType,d:any){
  const existing=await admin.from("discovery_sources").select("id,community_id").eq("normalized_url",d.normalizedUrl).maybeSingle();
  if(existing.data?.community_id)return{status:"existing",communityId:existing.data.community_id};
  const country=detectCountry([sourceUrl,d.title,d.description,d.name,d.region].filter(Boolean).join(" ")) ?? (d.countryCode ? {code:d.countryCode,name:d.countryName??d.countryCode}:null);
  const seed={source_type:sourceType,source_url:sourceUrl,raw_url:d.rawUrl,normalized_url:d.normalizedUrl,platform:"instagram",title:d.title,description:d.description,discovered_name:d.name,discovered_category:d.category,discovered_language:d.language,discovered_region:d.region,discovered_country_code:country?.code??null,discovered_country_name:country?.name??null,metadata:{extractor:"instagram-invite-v3"}};
  const{data:source,error:sourceError}=await admin.from("discovery_sources").upsert(seed,{onConflict:"normalized_url"}).select("id").single();
  if(sourceError)return{status:"failed",error:sourceError.message};
  const{data:dupe}=await admin.from("communities").select("id,health_status").eq("status","published").ilike("invite_url",d.normalizedUrl).maybeSingle();
  if(dupe){await admin.from("discovery_sources").update({community_id:dupe.id,extraction_status:"duplicate",health_status:dupe.health_status??"unknown"}).eq("id",source.id);return{status:"duplicate",communityId:dupe.id};}
  const preview=await resolveRenderedCommunityPreview(d.normalizedUrl);
  const explicitInactive=preview.status==="inactive";
  const signal=preview.status==="healthy"&&Boolean(preview.name||preview.memberCount!==null||preview.imageUrl);
  const health=explicitInactive?"inactive":signal?"healthy":"needs_recheck";
  if(explicitInactive){await admin.from("discovery_sources").update({extraction_status:"rejected",health_status:"inactive",health_checked_at:new Date().toISOString(),health_error:"Explicit inactive/invalid invite evidence."}).eq("id",source.id);return{status:"inactive"};}
  const name=safeName(preview.name??d.name,`${d.category??"Instagram"} Group Chat`);
  const slug=await uniqueSlug(admin,name);
  const description=safeDescription(d.description??d.title,sourceUrl);
  const insert={name,slug,platform:"instagram",invite_url:d.normalizedUrl,description,language:d.language,region:d.region,country_code:country?.code??null,country_name:country?.name??null,member_count:preview.memberCount??null,status:"published",join_enabled:signal,verification_status:"unverified",health_status:health,health_last_checked_at:new Date().toISOString(),health_failure_count:signal?0:1,auto_monitor_enabled:true,standalone_inventory:true,last_remote_name:preview.name??null,last_remote_member_count:preview.memberCount??null,last_health_error:signal?null:"Instagram invite could not be conclusively verified.",source_url:sourceUrl,platform_scope:country?.code==="IN"?"india":"global",claim_status:"unclaimed",needs_manual_review:true,quality_version:0,quality_issues:[]};
  const{data:community,error}=await admin.from("communities").insert(insert).select("id").single();
  if(error){await admin.from("discovery_sources").update({extraction_status:"failed",health_status:health,health_error:error.message}).eq("id",source.id);return{status:"failed",error:error.message};}
  const cid=await categoryId(admin,d.category);if(cid)await admin.from("community_categories").insert({community_id:community.id,category_id:cid});
  await admin.rpc("refresh_directory_quality",{p_limit:1});
  const{data:quality}=await admin.from("communities").select("quality_score,quality_grade").eq("id",community.id).single();
  await admin.from("communities").update({needs_manual_review:quality?.quality_grade!=="good"}).eq("id",community.id);
  await admin.from("discovery_sources").update({community_id:community.id,extraction_status:"published",health_status:health,health_checked_at:new Date().toISOString(),metadata:{extractor:"instagram-invite-v3",quality_score:quality?.quality_score??null,quality_grade:quality?.quality_grade??null,country_code:country?.code??null}}).eq("id",source.id);
  return{status:"published",communityId:community.id,quality:quality?.quality_grade??null};
}

export async function runInstagramDiscovery(limit=100){
  const admin=createAdminSupabaseClient() as any;let fetched=0,found=0,published=0,duplicates=0,inactive=0,failed=0;
  const seeds=[...rotatingCountrySeeds(), ...SOURCE_SEEDS];
  for(const seed of seeds){if(found>=limit)break;try{const html=await fetchSource(seed.url);const discoveries=extractInstagramDiscoveries(html);fetched++;for(const d of discoveries){if(found>=limit)break;found++;const result=await ingestOne(admin,seed.url,seed.type,d);if(result.status==="published")published++;else if(result.status==="duplicate"||result.status==="existing")duplicates++;else if(result.status==="inactive")inactive++;else if(result.status==="failed")failed++;}await admin.from("discovery_sources").upsert({source_type:seed.type,source_url:seed.url,raw_url:seed.url,normalized_url:seed.url.replace(/[?#].*$/g,"").replace(/\/$/g,"").toLowerCase(),platform:"instagram",extraction_status:"processed",metadata:{last_scan_count:discoveries.length}},{onConflict:"normalized_url"});}catch(error){await admin.from("discovery_sources").upsert({source_type:seed.type,source_url:seed.url,raw_url:seed.url,normalized_url:seed.url.replace(/[?#].*$/g,"").replace(/\/$/g,"").toLowerCase(),platform:"instagram",extraction_status:"failed",health_status:"needs_recheck",health_error:error instanceof Error?error.message:"Source fetch failed",metadata:{last_scan_failed:true}},{onConflict:"normalized_url"});failed++;}}
  return{fetchedSources:fetched,found,published,duplicates,inactive,failed};
}
