export type DemandPlatform = "instagram" | "whatsapp" | "telegram" | "discord";
export type DemandCollection = "whatsapp-groups" | "telegram-groups" | "discord-servers" | "instagram-gcs";

export type DemandOpportunity = {
  slug: string;
  routeCollection: DemandCollection;
  platform: DemandPlatform;
  keyword: string;
  title: string;
  description: string;
  categorySlug: string;
  region?: string;
  searchVolume: string;
  volumeSource: string;
  market: string;
  intent: string;
  priority: "tier-1" | "tier-2" | "tier-3" | "tier-4";
};

/**
 * Deliberately limited to opportunities with a current ChatScout supply path.
 * Demand-only keywords stay in the inventory until enough legitimate listings
 * exist to make an indexable page useful.
 */
export const DEMAND_OPPORTUNITIES: DemandOpportunity[] = [
  { slug: "study", routeCollection: "whatsapp-groups", platform: "whatsapp", keyword: "study WhatsApp group", title: "Study WhatsApp Groups", description: "Browse study-focused WhatsApp communities for students, exams, college discussions and learning support.", categorySlug: "study-education", searchVolume: "Unavailable", volumeSource: "No reliable public volume snapshot found", market: "India", intent: "High-intent community discovery", priority: "tier-2" },
  { slug: "coding", routeCollection: "whatsapp-groups", platform: "whatsapp", keyword: "coding WhatsApp group", title: "Coding WhatsApp Groups", description: "Find coding and programming WhatsApp communities listed on ChatScout, with platform and community details before you join.", categorySlug: "coding", searchVolume: "Unavailable", volumeSource: "No reliable public volume snapshot found", market: "India / Global", intent: "High-intent community discovery", priority: "tier-2" },
  { slug: "anime", routeCollection: "whatsapp-groups", platform: "whatsapp", keyword: "anime WhatsApp group", title: "Anime WhatsApp Groups", description: "Explore anime and fandom WhatsApp communities currently listed on ChatScout.", categorySlug: "anime-fandom", searchVolume: "Unavailable", volumeSource: "No reliable public volume snapshot found", market: "India / Global", intent: "High-intent community discovery", priority: "tier-3" },
  { slug: "study", routeCollection: "telegram-groups", platform: "telegram", keyword: "study Telegram group", title: "Study Telegram Groups", description: "Browse active study-focused Telegram communities for students, exam preparation and learning discussions.", categorySlug: "study-education", searchVolume: "Unavailable", volumeSource: "No reliable public volume snapshot found", market: "India / Global", intent: "High-intent community discovery", priority: "tier-2" },
  { slug: "coding", routeCollection: "telegram-groups", platform: "telegram", keyword: "coding Telegram group", title: "Coding Telegram Groups", description: "Discover coding and programming Telegram communities covering software development and technical learning.", categorySlug: "coding", searchVolume: "Unavailable", volumeSource: "No reliable public volume snapshot found", market: "India / Global", intent: "High-intent community discovery", priority: "tier-2" },
  { slug: "jobs", routeCollection: "telegram-groups", platform: "telegram", keyword: "jobs Telegram group", title: "Jobs Telegram Groups", description: "Find career and jobs Telegram communities for vacancy updates, hiring discussions and professional opportunities.", categorySlug: "career-jobs", searchVolume: "Unavailable", volumeSource: "No reliable public volume snapshot found", market: "India / Global", intent: "High-intent jobs-community discovery", priority: "tier-2" },
  { slug: "jee", routeCollection: "telegram-groups", platform: "telegram", keyword: "JEE Telegram group", title: "JEE Telegram Groups", description: "Explore competitive-exam communities relevant to JEE preparation and student discussions.", categorySlug: "competitive-exams", searchVolume: "Unavailable", volumeSource: "No reliable public volume snapshot found", market: "India", intent: "Very high-intent exam-community discovery", priority: "tier-2" },
  { slug: "anime", routeCollection: "telegram-groups", platform: "telegram", keyword: "anime Telegram group", title: "Anime Telegram Groups", description: "Browse anime and fandom communities on Telegram, with real ChatScout listings rather than empty keyword pages.", categorySlug: "anime-fandom", searchVolume: "Unavailable", volumeSource: "No reliable public volume snapshot found", market: "India / Global", intent: "High-intent community discovery", priority: "tier-3" },
  { slug: "coding", routeCollection: "discord-servers", platform: "discord", keyword: "coding Discord server", title: "Coding Discord Servers", description: "Find coding and programming Discord servers on ChatScout, including software-development communities and technical discussion spaces.", categorySlug: "coding", searchVolume: "Unavailable", volumeSource: "No reliable public volume snapshot found", market: "Global", intent: "High-intent community discovery", priority: "tier-1" },
  { slug: "gaming", routeCollection: "discord-servers", platform: "discord", keyword: "gaming Discord server", title: "Gaming Discord Servers", description: "Browse gaming communities on Discord, from social gaming spaces to competitive communities.", categorySlug: "gaming", searchVolume: "Unavailable", volumeSource: "No reliable public volume snapshot found", market: "Global", intent: "Very high-intent community discovery", priority: "tier-1" },
  { slug: "anime", routeCollection: "discord-servers", platform: "discord", keyword: "anime Discord server", title: "Anime Discord Servers", description: "Discover anime-focused Discord communities with real listings and community details.", categorySlug: "anime-fandom", searchVolume: "Unavailable", volumeSource: "No reliable public volume snapshot found", market: "Global", intent: "High-intent community discovery", priority: "tier-2" },
  { slug: "students", routeCollection: "instagram-gcs", platform: "instagram", keyword: "student Instagram group chat", title: "Student Instagram Group Chats", description: "Find student and college-focused Instagram group chats currently listed on ChatScout.", categorySlug: "college-students", searchVolume: "Unavailable", volumeSource: "No reliable public volume snapshot found", market: "Global", intent: "High-intent student-community discovery", priority: "tier-3" },
  { slug: "anime", routeCollection: "instagram-gcs", platform: "instagram", keyword: "anime Instagram group chat", title: "Anime Instagram Group Chats", description: "Explore anime and fandom Instagram group chats with real ChatScout listings.", categorySlug: "anime-fandom", searchVolume: "Unavailable", volumeSource: "No reliable public volume snapshot found", market: "Global", intent: "High-intent community discovery", priority: "tier-3" },
];

export function getDemandOpportunity(collection: string, slug: string) {
  return DEMAND_OPPORTUNITIES.find((item) => item.routeCollection === collection && item.slug === slug) ?? null;
}
