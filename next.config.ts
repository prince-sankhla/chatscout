import type { NextConfig } from "next";

const legacyCategoryRedirects = [
  ["anime-manga", "anime-fandom"],
  ["memes-humor", "memes-reels"],
  ["movies-ott", "movies-series"],
  ["students", "study-education"],
  ["fitness", "fitness-gym"],
  ["study-groups", "general-study"],
  ["college-university", "college-students"],
  ["bca-mca", "engineering-bca-it"],
  ["ai-ml", "ai"],
  ["local-communities", "local-city-communities"],
  ["networking", "random-friends-social-general"],
  ["jee-neet", "competitive-exams"],
  ["entrepreneurship", "startups"],
  ["startups-entrepreneurship", "startups"],
] as const;

const nextConfig: NextConfig = {
  async redirects() {
    return legacyCategoryRedirects.map(([from, to]) => ({
      source: `/categories/${from}`,
      destination: `/categories/${to}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
