import { unstable_cache } from "next/cache";
import type { Community } from "@/types/community";
import type { CommunityRow } from "@/types/database";
import { resolveRenderedCommunityPreview } from "@/features/community-monitor/rendered-resolver";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { COMMUNITY_IMAGE_BUCKET, getPublishedCommunityImageUrl } from "@/lib/supabase/community-images";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const accents:Community["accent"][]=["violet","blue","pink","orange","teal"];
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

async function resolveFallbackImage(inviteUrl:string){
  const cached=unstable_cache(
    async()=>resolveRenderedCommunityPreview(inviteUrl),
    ["community-image-fallback",inviteUrl],
    {revalidate:3600},
  );
  const preview=await cached();
  return preview.imageUrl;
}

function buildPresentation(community:CommunityRow,categoryNames:string[],imageUrl:string|null):Community{
  const platform=community.platform??"instagram";
  const platformLabel=platform[0].toUpperCase()+platform.slice(1);
  const primaryCategory=categoryNames[0]??"Community";
  const tags=[...categoryNames,platformLabel,community.language,community.region].filter((tag):tag is string=>Boolean(tag));
  return{slug:community.slug,name:community.name,category:primaryCategory,location:community.region??"Location unavailable",membersLabel:membersLabel(community.member_count),description:community.description,accent:accentForSlug(community.slug),initials:initialsForName(community.name),tags,isDemo:false,imageUrl,listingAgeLabel:listingAgeLabel(community.created_at),healthLabel:healthLabel(community),verificationStatus:community.verification_status,platform};
}

export async function toCommunityPresentation(community:CommunityRow):Promise<Community>{
  const categoryNames=await getCommunityCategories(community.id);
  let imageUrl=await getPublishedCommunityImageUrl(community.image_path);
  if(!imageUrl&&community.platform==="instagram"&&community.invite_url){
    try{imageUrl=await resolveFallbackImage(community.invite_url);}catch{imageUrl=null;}
  }
  return buildPresentation(community,categoryNames,imageUrl);
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

  return communities.map((community)=>buildPresentation(community,categoryNamesByCommunity.get(community.id)??[],imageMap.get(community.image_path??"")??null));
}
