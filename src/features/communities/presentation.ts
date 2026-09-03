import { unstable_cache } from "next/cache";
import type { Community } from "@/types/community";
import type { CommunityRow } from "@/types/database";
import { resolveRenderedCommunityPreview } from "@/features/community-monitor/rendered-resolver";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { COMMUNITY_IMAGE_BUCKET, getPublishedCommunityImageUrl } from "@/lib/supabase/community-images";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const accents:Community["accent"][]=["violet","blue","pink","orange","teal"];
const fallbackGradientByAccent:Record<Community["accent"],[string,string]>={
  violet:["#7c3aed","#c026d3"],
  blue:["#2563eb","#06b6d4"],
  pink:["#db2777","#f97316"],
  orange:["#ea580c","#eab308"],
  teal:["#0f766e","#14b8a6"],
};
function accentForSlug(slug:string):Community["accent"]{const value=[...slug].reduce((total,character)=>total+character.charCodeAt(0),0);return accents[value%accents.length];}
function initialsForName(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).join("\n").toUpperCase();}
function membersLabel(memberCount:number|null){return memberCount===null?"Member count unavailable":`${memberCount.toLocaleString("en-IN")} members`;}
function listingAgeLabel(createdAt:string){const days=Math.max(0,Math.floor((Date.now()-new Date(createdAt).getTime())/86400000));if(days<1)return "Listed today";if(days<30)return `Listed ${days}d ago`;const months=Math.floor(days/30.44);if(months<12)return `Listed ${months}mo ago`;return `Listed ${Math.floor(months/12)}y ago`;}
function healthLabel(community:CommunityRow){if(community.health_status==="healthy")return "Active · checked recently";if(community.health_status==="needs_recheck")return "Needs recheck";if(community.health_status==="inactive"||community.verification_status==="broken")return "Inactive";if(community.join_enabled===false)return "Join temporarily unavailable";return "Active listing";}

const getCommunityCategories=unstable_cache(
  async(communityId:string)=>{
    const supabase=createServerSupabaseClient();
    const {data,error}=await supabase.from("community_categories").select("category_id").eq("community_id",communityId);
    if(error||!data?.length)return [];
    const ids=[...new Set(data.map((item)=>item.category_id))];
    const {data:categories}=await supabase.from("categories").select("id,name,sort_order").in("id",ids).eq("is_active",true).order("sort_order",{ascending:true}).order("name",{ascending:true});
    return (categories??[]).map((category)=>category.name);
  },
  ["community-presentation-categories"],
  {revalidate:300},
);

async function resolveFallbackPreview(inviteUrl:string){
  const cached=unstable_cache(
    async()=>resolveRenderedCommunityPreview(inviteUrl),
    ["community-preview-fallback",inviteUrl],
    {revalidate:3600},
  );
  return cached();
}

function escapeXml(value:string){return value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;");}
function fallbackImageDataUrl(name:string,accent:Community["accent"]){
  const [from,to]=fallbackGradientByAccent[accent];
  const initials=escapeXml(initialsForName(name).replace("\n"," "));
  const label=escapeXml(name.slice(0,42));
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="36"/></filter></defs><rect width="960" height="640" fill="url(#g)"/><circle cx="170" cy="120" r="150" fill="#fff" fill-opacity=".13" filter="url(#b)"/><circle cx="820" cy="540" r="180" fill="#fff" fill-opacity=".10" filter="url(#b)"/><circle cx="480" cy="300" r="145" fill="#000" fill-opacity=".10"/><text x="480" y="315" text-anchor="middle" dominant-baseline="middle" font-family="Arial,Helvetica,sans-serif" font-size="108" font-weight="800" fill="#fff">${initials}</text><text x="480" y="565" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="28" font-weight="600" fill="#fff" fill-opacity=".9">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildPresentation(community:CommunityRow,categoryNames:string[],imageUrl:string|null,memberCountOverride:number|null=null):Community{
  const platform=community.platform??"instagram";
  const platformLabel=platform[0].toUpperCase()+platform.slice(1);
  const primaryCategory=categoryNames[0]??"Community";
  const accent=accentForSlug(community.slug);
  const tags=[...categoryNames,platformLabel,community.language,community.region].filter((tag):tag is string=>Boolean(tag));
  return{slug:community.slug,name:community.name,category:primaryCategory,location:community.region??"Location unavailable",membersLabel:membersLabel(community.member_count??memberCountOverride),description:community.description,accent,initials:initialsForName(community.name),tags,isDemo:false,imageUrl:imageUrl??fallbackImageDataUrl(community.name,accent),listingAgeLabel:listingAgeLabel(community.created_at),healthLabel:healthLabel(community),verificationStatus:community.verification_status,platform};
}

export async function toCommunityPresentation(community:CommunityRow):Promise<Community>{
  const categoryNames=await getCommunityCategories(community.id);
  let imageUrl=await getPublishedCommunityImageUrl(community.image_path);
  let memberCountOverride:number|null=null;
  if(!imageUrl||community.member_count===null){
    try{
      const preview=await resolveFallbackPreview(community.invite_url);
      imageUrl=imageUrl??preview.imageUrl;
      memberCountOverride=preview.memberCount;
    }catch{memberCountOverride=null;}
  }
  return buildPresentation(community,categoryNames,imageUrl,memberCountOverride);
}

/** Bulk presentation path for discovery grids. Avoids per-card category/storage requests. */
export async function toCommunityPresentations(communities:CommunityRow[]):Promise<Community[]>{
  if(!communities.length)return [];
  const supabase=createServerSupabaseClient();
  const ids=communities.map((community)=>community.id);
  const {data:links}=await supabase.from("community_categories").select("community_id,category_id").in("community_id",ids);
  const categoryIds=[...new Set((links??[]).map((link)=>link.category_id))];
  const {data:categories}=categoryIds.length
    ? await supabase.from("categories").select("id,name,sort_order").in("id",categoryIds).eq("is_active",true).order("sort_order",{ascending:true}).order("name",{ascending:true})
    : {data:[]};

  const categoryNamesByCommunity=new Map<string,string[]>();
  const categoryNameById=new Map((categories??[]).map((category)=>[category.id,category.name]));
  for(const link of links??[]){
    const name=categoryNameById.get(link.category_id);
    if(!name)continue;
    const names=categoryNamesByCommunity.get(link.community_id)??[];
    names.push(name);
    categoryNamesByCommunity.set(link.community_id,names);
  }

  const imagePaths=[...new Set(communities.map((community)=>community.image_path).filter((path):path is string=>Boolean(path)))];
  const imageMap=new Map<string,string>();
  if(imagePaths.length){
    const admin=createAdminSupabaseClient();
    const {data:signed}=await admin.storage.from(COMMUNITY_IMAGE_BUCKET).createSignedUrls(imagePaths,3600);
    for(const item of signed??[]){if(item.path&&item.signedUrl)imageMap.set(item.path,item.signedUrl);}
  }

  const presentations=await Promise.all(communities.map(async(community)=>{
    let imageUrl=imageMap.get(community.image_path??"")??null;
    let memberCountOverride:number|null=null;
    if(!imageUrl||community.member_count===null){
      try{
        const preview=await resolveFallbackPreview(community.invite_url);
        imageUrl=imageUrl??preview.imageUrl;
        memberCountOverride=preview.memberCount;
      }catch{memberCountOverride=null;}
    }
    return buildPresentation(community,categoryNamesByCommunity.get(community.id)??[],imageUrl,memberCountOverride);
  }));

  return presentations;
}
