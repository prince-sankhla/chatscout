import { detectCountry } from "@/lib/countries";
export type InstagramDiscovery = {
  rawUrl:string;
  normalizedUrl:string;
  title:string|null;
  description:string|null;
  name:string|null;
  category:string|null;
  language:string|null;
  region:string|null;
  countryCode:string|null;
  countryName:string|null;
};

const JOIN_RE=/https?:\/\/(?:www\.)?ig\.me\/(?:j|channel)\/[A-Za-z0-9_-]+(?:\/)?/gi;
const BLOCKED_RE=/(?:nude|nsfw|onlyfans|escort|porn|sex|sexy|dating|adult\s+only)/i;
const CATEGORY_RULES:Array<[string,RegExp]>=([
  ["Gaming",/(gaming|valorant|minecraft|bgmi|free fire|playstation|xbox|esports)/i],
  ["Anime",/(anime|manga|manhwa|otaku)/i],
  ["Coding",/(coding|programming|developer|javascript|typescript|python|react|next\.js|software)/i],
  ["AI & ML",/(artificial intelligence|machine learning|deep learning|generative ai|llm|openai)/i],
  ["Cloud & DevOps",/(aws|azure|google cloud|gcp|docker|kubernetes|terraform|devops|cloud computing)/i],
  ["College",/(college|university|freshers|freshmen|campus|students|nit|iit|engineering college)/i],
  ["Music",/(music|rave|festival|dj|concert)/i],
  ["Sports",/(cricket|football|soccer|basketball|chess|sports)/i],
  ["Friends",/(friends|friendship|make new friends|random gc|group chat)/i],
] as Array<[string,RegExp]>);

function clean(value:string|null|undefined,max=500){return value?value.replace(/\\s+/g," ").trim().slice(0,max)||null:null;}
function decodeHtml(s:string){return s.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");}
function meta(html:string,name:string){const re=new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`,`i`);const m=html.match(re);return clean(decodeHtml(m?.[1]??m?.[2]??""),1000);}
function pageTitle(html:string){return clean(decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]??""),300);}
function context(html:string,index:number){return clean(decodeHtml(html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").slice(Math.max(0,index-900),index+900)),1200);}
function classify(text:string){for(const [name,re] of CATEGORY_RULES)if(re.test(text))return name;return "Friends";}
function detectLanguage(text:string){if(/[\u0900-\u097F]/.test(text))return "Hindi";if(/[\u0980-\u09FF]/.test(text))return "Bengali";if(/[\u0A80-\u0AFF]/.test(text))return "Gujarati";if(/[\u0A00-\u0A7F]/.test(text))return "Punjabi";return /\b(the|and|for|with|join|students|community|group)\b/i.test(text)?"English":null;}
function inferRegion(text:string){const regions=["India","Jaipur","Delhi","Mumbai","Bengaluru","Bangalore","Kolkata","Chennai","Hyderabad","Pune","United States","UK","Canada","Australia"];return regions.find(x=>new RegExp(`\\b${x.replace(" ","\\s+")}\\b`,"i").test(text))??null;}

export function normalizeInstagramInvite(raw:string){const u=raw.trim().replace(/[),.;!?]+$/g,"");const m=u.match(/^https?:\/\/(?:www\.)?ig\.me\/(j|channel)\/([A-Za-z0-9_-]+)\/?$/i);if(!m)return null;return `https://ig.me/${m[1].toLowerCase()}/${m[2]}`;}

export function extractInstagramDiscoveries(html:string):InstagramDiscovery[]{
  const out=new Map<string,InstagramDiscovery>();
  for(const match of html.matchAll(JOIN_RE)){
    const normalized=normalizeInstagramInvite(match[0]);if(!normalized||out.has(normalized))continue;
    const idx=match.index??0;const ctx=context(html,idx);const title=pageTitle(html);const description=meta(html,"description");const combined=[title,description,ctx].filter(Boolean).join(" ");
    if(BLOCKED_RE.test(combined))continue;
    const name=clean(ctx.split(/[.!?\\n]/).map(x=>x.trim()).find(x=>x.length>=8&&x.length<=120)??title??"");
    const country=detectCountry(combined);
    out.set(normalized,{rawUrl:match[0],normalizedUrl:normalized,title,description,name,category:classify(combined),language:detectLanguage(combined),region:inferRegion(combined),countryCode:country?.code??null,countryName:country?.name??null});
  }
  return [...out.values()];
}
