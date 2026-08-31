"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./discovery-filters.module.css";

const CATEGORY_OPTIONS = [
  ["", "All categories"],
  ["ai-ml", "AI & ML"],
  ["coding", "Coding"],
  ["college-university", "College & University"],
  ["jee-neet", "JEE & NEET"],
  ["career-jobs", "Career & Jobs"],
  ["gaming", "Gaming"],
  ["anime-manga", "Anime & Manga"],
  ["movies-ott", "Movies & OTT"],
  ["fitness", "Fitness"],
  ["finance-investing", "Finance & Investing"],
  ["creators", "Creators"],
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
      {(category || sort !== "newest") && (
        <button type="button" className={styles.reset} onClick={() => update("", "newest")}>Reset</button>
      )}
    </div>
  );
}
