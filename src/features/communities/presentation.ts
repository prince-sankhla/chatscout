import { unstable_cache } from "next/cache";
import type { Community } from "@/types/community";
import type { CommunityRow } from "@/types/database";
import { resolveRenderedCommunityPreview } from "@/features/community-monitor/rendered-resolver";
import { getPublishedCommunityImageUrl } from "@/lib/supabase/community-images";

const accents:Community["accent"][]=["violet","blue","pink","orange","teal"];
function accentForSlug(slug:string):Community["accent"]{const value=[...slug].reduce((total,character)=>total+character.charCodeAt(0),0);return accents[value%accents.length];}
function initialsForName(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).join("\n").toUpperCase();}
function membersLabel(memberCount:number|null){return memberCount===null?"Member count unavailable":`${memberCount.toLocaleString("en-IN")} members`;}
function listingAgeLabel(createdAt:string){const days=Math.max(0,Math.floor((Date.now()-new Date(createdAt).getTime())/86400000));if(days<1)return "Listed today";if(days<30)return `Listed ${days}d ago`;const months=Math.floor(days/30.44);if(months<12)return `Listed ${months}mo ago`;return `Listed ${Math.floor(months/12)}y ago`;}
function healthLabel(community:CommunityRow){if(community.health_status==="healthy")return "Active · checked recently";if(community.health_status==="needs_recheck")return "Needs recheck";if(community.health_status==="inactive"||community.verification_status==="broken")return "Inactive";if(community.join_enabled===false)return "Join temporarily unavailable";return "Active listing";}

async function resolveFallbackImage(inviteUrl:string){
  const cached=unstable_cache(
    async()=>resolveRenderedCommunityPreview(inviteUrl),
    ["community-image-fallback",inviteUrl],
    {revalidate:3600},
  );
  const preview=await cached();
  return preview.imageUrl;
}

export async function toCommunityPresentation(community:CommunityRow):Promise<Community>{
  const platform=community.platform??"instagram";
  const platformLabel=platform[0].toUpperCase()+platform.slice(1);
  const tags=[platformLabel,community.language,community.region].filter((tag):tag is string=>Boolean(tag));
  let imageUrl=await getPublishedCommunityImageUrl(community.image_path);

  // Existing Instagram listings may contain the tiny generic Meta/Instagram
  // placeholder. Re-resolve those invite pages instead of showing fake artwork.
  if(!imageUrl && platform==="instagram" && community.invite_url){
    try{imageUrl=await resolveFallbackImage(community.invite_url);}catch{imageUrl=null;}
  }

  return{
    slug:community.slug,
    name:community.name,
    category:platformLabel,
    location:community.region??"Location unavailable",
    membersLabel:membersLabel(community.member_count),
    description:community.description,
    accent:accentForSlug(community.slug),
    initials:initialsForName(community.name),
    tags,
    isDemo:false,
    imageUrl,
    listingAgeLabel:listingAgeLabel(community.created_at),
    healthLabel:healthLabel(community),
    verificationStatus:community.verification_status,
    platform,
  };
}
