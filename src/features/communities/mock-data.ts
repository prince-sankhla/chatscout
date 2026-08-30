import type { Community } from "@/types/community";

/** UI-only placeholders. Replace with a data source when backend work begins. */
export const communities: Community[] = [
  { slug: "bca-coding-india", name: "BCA Coding India", category: "Coding", location: "India", membersLabel: "2.4K demo members", description: "A friendly space to swap programming resources, project feedback, and study motivation.", accent: "violet", initials: "BCA\nCODING", tags: ["Coding", "BCA", "India"], isDemo: true },
  { slug: "jaipur-coding-community", name: "Jaipur Coding Community", category: "Coding", location: "Jaipur", membersLabel: "980 demo members", description: "Meet fellow learners in Jaipur for code help, hackathon teams, and local tech conversations.", accent: "pink", initials: "JAIPUR\nCODING", tags: ["Coding", "Jaipur", "Students"], isDemo: true },
  { slug: "jee-2027-students", name: "JEE 2027 Students", category: "Study", location: "India", membersLabel: "1.8K demo members", description: "Study routines, resources, and encouragement for students preparing for JEE 2027.", accent: "blue", initials: "JEE\n2027", tags: ["Study", "JEE", "Students"], isDemo: true },
  { slug: "indian-anime-community", name: "Indian Anime Community", category: "Anime", location: "India", membersLabel: "3.2K demo members", description: "For new releases, fan theories, recommendations, and conversations with anime fans across India.", accent: "orange", initials: "ANIME\nINDIA", tags: ["Anime", "India", "Fans"], isDemo: true },
  { slug: "gaming-india-squad", name: "Gaming India Squad", category: "Gaming", location: "India", membersLabel: "4.1K demo members", description: "Find teammates, discuss games, and keep up with the Indian gaming community.", accent: "teal", initials: "GAMING\nINDIA", tags: ["Gaming", "India", "Squad"], isDemo: true },
  { slug: "build-in-public-india", name: "Build in Public India", category: "Entrepreneurs", location: "India", membersLabel: "1.4K demo members", description: "A small community for sharing product progress, ideas, wins, and useful feedback.", accent: "violet", initials: "BUILD\nINDIA", tags: ["Startups", "Builders", "India"], isDemo: true },
];

export function getCommunity(slug: string) {
  return communities.find((community) => community.slug === slug);
}
