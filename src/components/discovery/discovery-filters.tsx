"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./discovery-filters.module.css";

const CATEGORY_OPTIONS = [
  ["", "All categories"],
  ["college-university", "College & University"],
  ["jee-neet", "JEE & NEET"],
  ["competitive-exams", "Competitive Exams"],
  ["study-groups", "Study Groups"],
  ["bca-mca", "BCA / MCA"],
  ["career-jobs", "Career & Jobs"],
  ["ai-ml", "AI & ML"],
  ["coding", "Coding"],
  ["web-development", "Web Development"],
  ["cybersecurity", "Cybersecurity"],
  ["startups-entrepreneurship", "Startups & Entrepreneurship"],
  ["cloud-devops", "Cloud & DevOps"],
  ["gaming", "Gaming"],
  ["anime-manga", "Anime & Manga"],
  ["music", "Music"],
  ["memes-humor", "Memes & Humor"],
  ["movies-ott", "Movies & OTT"],
  ["sports", "Sports"],
  ["fitness", "Fitness"],
  ["health-wellness", "Health & Wellness"],
  ["fashion-beauty", "Fashion & Beauty"],
  ["travel", "Travel"],
  ["photography", "Photography"],
  ["books-writing", "Books & Writing"],
  ["finance-investing", "Finance & Investing"],
  ["crypto-web3", "Crypto & Web3"],
  ["creators", "Creators"],
  ["freelance", "Freelance"],
  ["networking", "Networking"],
  ["local-communities", "Local Communities"],
  ["india-wide", "India-wide"],
] as const;

export function DiscoveryFilters({ category = "", sort = "newest" }: { category?: string; sort?: "newest" | "members" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.get("q") ?? "";

  function update(nextCategory: string, nextSort: string) {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (nextCategory) next.set("category", nextCategory);
    if (nextSort !== "newest") next.set("sort", nextSort);
    const search = next.toString();
    router.push(search ? `${pathname}?${search}` : pathname);
  }

  return (
    <div className={styles.bar} aria-label="Community filters">
      <label className={styles.field}>
        <span>Category</span>
        <select value={category} onChange={(event) => update(event.target.value, sort)}>
          {CATEGORY_OPTIONS.map(([value, label]) => <option value={value} key={value || "all"}>{label}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span>Sort by</span>
        <select value={sort} onChange={(event) => update(category, event.target.value)}>
          <option value="newest">Newest</option>
          <option value="members">Most members</option>
        </select>
      </label>
      {(category || sort !== "newest") && <button type="button" className={styles.reset} onClick={() => update("", "newest")}>Reset</button>}
    </div>
  );
}
