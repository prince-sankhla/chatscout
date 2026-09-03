import "server-only";

const TIMEOUT_MS = 25_000;
const INSTAGRAM_GENERIC_HOST = "static.cdninstagram.com";
const WHATSAPP_HOSTS = new Set(["chat.whatsapp.com", "www.chat.whatsapp.com"]);

type Preview = { name: string | null; memberCount: number | null; imageUrl: string | null; finalUrl: string | null };
const EMPTY: Preview = { name: null, memberCount: null, imageUrl: null, finalUrl: null };

function decode(value: string) { return value.replace(/\\u0026/g,"&").replace(/\\u0022/g,'"').replace(/\\\//g,"/").replace(/\\n/g,"\n").replace(/\\u003c/g,"<").replace(/\\u003e/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#(\d+);/g,(_,c:string)=>String.fromCodePoint(Number(c))).replace(/&#x([0-9a-f]+);/gi,(_,c:string)=>String.fromCodePoint(Number.parseInt(c,16))); }
function plainText(html: string) { return decode(html).replace(/<script[\s\S]*?<\/script>/gi,"\n").replace(/<style[\s\S]*?<\/style>/gi,"\n").replace(/<noscript[\s\S]*?<\/noscript>/gi,"\n").replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]+>/g," ").replace(/[ \t]+/g," ").replace(/\n[ \t]+/g,"\n").replace(/\n{3,}/g,"\n\n").trim(); }
function cleanName(value: string | null | undefined) { const name=plainText(value??"").replace(/^#{1,6}\s+/ ,"").replace(/^Image\s*\d+\s*:\s*/i,"").replace(/^[>*`\-•·|:\s]+/,"").replace(/\s*[-|•]\s*(?:instagram|group chat).*$/i,"").trim(); if(!name||name.length>120)return null; if(/^(?:you(?:'|&apos;)?re|you are) invited to join a group chat on instagram$/i.test(name))return null; if(/^(?:instagram|group chat|use the instagram app|join instagram|community name)$/i.test(name))return null; const normalized=name.replace(/[^a-z0-9 ]/gi,"").trim().toLowerCase(); if(/^(?:directgroup|directgrouplink|direct group link)$/.test(normalized))return null; if(/^canvastoblobbundle$/.test(normalized))return null; if(/^(?:instagram|instagram group|instagram group chat|instagram direct|group chat on instagram)$/.test(normalized))return null; if(/^(?:image|image url|generic image|instagram logo|instagram icon|app icon|favicon)$/.test(normalized))return null; if(/\b(?:canvas|blob|bundle)\b/.test(normalized)&&/bundle/.test(normalized))return null; if(/^\d[\d,.\s]*\s+members?$/i.test(name))return null; return name; }
function extractMembers(value: string) { const text=decode(value).replace(/\u00a0/g," "); const patterns=[/["']number_of_members_text["']\s*[:=]\s*["'](\d[\d,.\s]*)\s+(?:members?|participants?|people)["']/i,/\b(\d[\d,.\s]*)\s+(?:members?|participants?|people)\b/i,/\b(?:members?|participants?|people)\s*[:·-]\s*(\d[\d,.\s]*)\b/i,/["'](?:member[_-]?count|memberCount|participants?|size|groupSize)["']\s*[:=]\s*["']?(\d[\d,.\s]*)/i,/\b(?:group\s+has|with|of)\s+(\d[\d,.\s]*)\s+(?:members?|participants?|people)\b/i]; for(const p of patterns){const m=text.match(p);if(!m)continue;const n=Number(m[1].replace(/[^0-9]/g,""));if(Number.isSafeInteger(n)&&n>=0&&n<=5000000)return n;} return null; }
function extractQuotedField(text:string,field:string){const escaped=field.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const re=new RegExp(`"${escaped}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`,`i`);const m=text.match(re);if(!m)return null;try{return JSON.parse(`"${m[1]}"`) as string;}catch{return decode(m[1]);}}
function extractStructuredProps(raw:string){const title=cleanName(extractQuotedField(raw,"title"));const membersText=extractQuotedField(raw,"number_of_members_text");const imageUrl=extractQuotedField(raw,"group_image_uri");return{title,memberCount:extractMembers(membersText??"")??extractMembers(raw),imageUrl:imageUrl?decode(imageUrl):null};}
function extractName(html:string,memberCount:number|null,title:string|null,imageAlt:string|null){const structured=extractStructuredProps(html);if(structured.title)return structured.title;const heading=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m=>cleanName(m[1])).find((v):v is string=>Boolean(v));if(heading)return heading;const text=plainText(html).replace(/\s+/g," ");if(memberCount!==null){const nearby=text.match(/(.{2,120}?)\s+\d[\d,.\s]*\s+(?:members?|participants?)/i)?.[1];const candidate=cleanName(nearby);if(candidate)return candidate;}return cleanName(imageAlt)??cleanName(title);}
function isUsableImage(value:string|null){
  if(!value)return false;
  if(/^data:image\/(?:png|jpe?g|webp|avif|svg\+xml);base64,/i.test(value))return true;
  try{
    const u=new URL(value);
    if(!/^https?:$/i.test(u.protocol))return false;
    const host=u.hostname.toLowerCase();
    if(host===INSTAGRAM_GENERIC_HOST)return false;
    if(/\/(?:rsrc\.php|shared\/static)\//i.test(u.pathname))return false;
    if(/(?:instagram-logo|instagram-icon|meta-logo|app-icon|favicon|threads-logo|avatar-placeholder|sprite)/i.test(u.pathname))return false;
    if(/\/(?:assets\/content|assets\/.*splash)/i.test(u.pathname)&&host.includes("discordapp.com"))return false;
    if(host.includes("discordapp.com")&&/\/icons\/\d+\//i.test(u.pathname))return true;
    if(host.includes("telesco.pe"))return true;
    return /\.(?:jpe?g|png|webp|avif)(?:[?#].*)?$/i.test(value)||/(?:scontent|fbcdn|cdninstagram|lookaside\.fbsbx|fbsbx)/i.test(`${host}${u.pathname}`);
  }catch{return false;}
}
function absolute(value:string|null|undefined,base:string){if(!value)return null;try{return new URL(decode(value),base).toString();}catch{return null;}}
function candidateImageUrlsFromHtml(html:string,base:string){
  const candidates:string[]=[];
  for(const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["'][^>]+content=["']([^"']+)["']/gi))candidates.push(m[1]);
  for(const m of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["']/gi))candidates.push(m[1]);
  for(const m of html.matchAll(/<link\b[^>]+(?:rel=["'][^"']*preload[^"']*["'][^>]+as=["']image["']|as=["']image["'][^>]+rel=["'][^"']*preload[^"']*["'])[^>]+href=["']([^"']+)["']/gi))candidates.push(m[1]);
  for(const m of html.matchAll(/https?:\\?\\?\/\\?\/[^"'<>\s\\]+/g))candidates.push(m[0].replaceAll("\\/","/"));
  for(const m of html.matchAll(/data:image\/(?:png|jpe?g|webp|avif|svg\+xml);base64,[A-Za-z0-9+/=]+/gi))candidates.push(m[0]);
  return candidates.map((candidate)=>candidate.replace(/\\u0026/g,"&")).map((candidate)=>absolute(candidate,base)??candidate).filter((candidate,index,array)=>array.indexOf(candidate)===index);
}
function firstUsableImageFromHtml(html:string,base:string){
  for(const candidate of candidateImageUrlsFromHtml(html,base)){
    if(isUsableImage(candidate))return candidate;
  }
  for(const m of html.matchAll(/<img\b([^>]+)>/gi)){
    const attrs=m[1];
    const src=attrs.match(/(?:src|data-src|data-original|data-lazy-src)=["']([^"']+)["']/i)?.[1]??null;
    const alt=attrs.match(/alt=["']([^"']*)["']/i)?.[1]??"";
    const url=absolute(src,base);
    if(url&&isUsableImage(url)&&!/instagram\s+(?:logo|icon)|favicon|app\s+icon/i.test(alt))return url;
  }
  return null;
}
async function request(url:string,headers:HeadersInit={}){const c=new AbortController();const t=setTimeout(()=>c.abort(),TIMEOUT_MS);try{return await fetch(url,{redirect:"follow",cache:"no-store",signal:c.signal,headers:{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36","Accept-Language":"en-US,en;q=0.9",...headers}});}finally{clearTimeout(t);}}
function isWhatsAppInviteUrl(url:string){try{const u=new URL(url);return WHATSAPP_HOSTS.has(u.hostname.toLowerCase())&&/^\/[A-Za-z0-9_-]+\/?$/.test(u.pathname);}catch{return false;}}
async function fetchWhatsAppDirect(url:string):Promise<Preview>{const r=await request(url,{Accept:"text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",Referer:"https://www.whatsapp.com/"});if(!r.ok)return EMPTY;const html=await r.text();const structured=extractStructuredProps(html);const desc=[...html.matchAll(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/gi)].map(m=>decode(m[1])).join(" ");const memberCount=structured.memberCount??extractMembers(desc)??extractMembers(html);const name=structured.title??extractName(html,memberCount,null,null);const image=[absolute(structured.imageUrl,r.url||url),firstUsableImageFromHtml(html,r.url||url)].find((v):v is string=>isUsableImage(v))??null;return{name,memberCount,imageUrl:image,finalUrl:r.url||url};}
async function fetchJina(url:string):Promise<Preview>{try{const target=`https://r.jina.ai/http://${url.replace(/^https?:\/\//i,"")}`;const r=await request(target,{Accept:"text/plain"});if(!r.ok)return EMPTY;const text=await r.text();return{name:cleanName(text.match(/^#\s+(.+)$/m)?.[1]??null),memberCount:extractMembers(text),imageUrl:null,finalUrl:url};}catch{return EMPTY;}}
async function fetchMicrolink(url:string):Promise<Preview>{const endpoint=`https://api.microlink.io/?url=${encodeURIComponent(url)}&meta=true&data.html.selector=body`;const r=await request(endpoint,{Accept:"application/json"});if(!r.ok)return EMPTY;const payload=await r.json() as {data?:{html?:string;title?:string;description?:string;url?:string;image?:{url?:string|null}|null}};const d=payload.data;if(!d)return EMPTY;const html=d.html??"";const structured=extractStructuredProps(html);const memberCount=structured.memberCount??extractMembers(html)??extractMembers(d.description??"");const name=structured.title??extractName(html,memberCount,d.title??null,null);const base=d.url??url;const image=[absolute(structured.imageUrl,base),firstUsableImageFromHtml(html,base),absolute(d.image?.url,base)].find((v):v is string=>isUsableImage(v))??null;return{name,memberCount,imageUrl:image,finalUrl:base};}
function instagramDirectUrl(url:string){try{const u=new URL(url);const m=u.pathname.match(/^\/j\/([^/]+)\/?$/i);return m?`https://www.instagram.com/j/${m[1]}/`:null;}catch{return null;}}
async function fetchInstagram(url:string):Promise<Preview>{const r=await request(url,{Accept:"text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",Referer:"https://www.instagram.com/"});if(!r.ok)return EMPTY;const html=await r.text();const s=extractStructuredProps(html);const memberCount=s.memberCount??extractMembers(html);const name=s.title??extractName(html,memberCount,null,null);const image=[absolute(s.imageUrl,r.url||url),firstUsableImageFromHtml(html,r.url||url)].find((v):v is string=>isUsableImage(v))??null;return{name,memberCount,imageUrl:image,finalUrl:r.url||url};}
export async function resolveRenderedCommunityPreview(inviteUrl:string):Promise<Preview>{if(isWhatsAppInviteUrl(inviteUrl)){try{const direct=await fetchWhatsAppDirect(inviteUrl);if(direct.name||direct.memberCount!==null||direct.imageUrl)return direct;}catch{}try{const jina=await fetchJina(inviteUrl);if(jina.name||jina.memberCount!==null)return jina;}catch{}}try{const rendered=await fetchMicrolink(inviteUrl);if(rendered.name||rendered.memberCount!==null||rendered.imageUrl)return rendered;}catch{}const direct=instagramDirectUrl(inviteUrl);if(direct){try{const rd=await fetchMicrolink(direct);if(rd.name||rd.memberCount!==null||rd.imageUrl)return rd;}catch{}try{const dp=await fetchInstagram(direct);if(dp.name||dp.memberCount!==null||dp.imageUrl)return dp;}catch{}}return EMPTY;}
