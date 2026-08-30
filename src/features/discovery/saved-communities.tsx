"use client";

import { useEffect, useState } from "react";
import { CommunityGrid } from "@/components/community/community-grid";
import type { Community } from "@/types/community";

const savedKey = "chatscout-saved-community-slugs";

export function SavedCommunities({ communities }: { communities: Community[] }) {
  const [saved, setSaved] = useState<Community[] | null>(null);
  useEffect(() => {
    try {
      const slugs = JSON.parse(localStorage.getItem(savedKey) ?? "[]") as string[];
      setSaved(communities.filter((community) => slugs.includes(community.slug)));
    } catch { setSaved([]); }
  }, [communities]);
  if (saved === null) return <p className="neon-empty">Loading saved communities…</p>;
  return saved.length ? <CommunityGrid communities={saved} /> : <p className="neon-empty">You have not saved any communities yet.</p>;
}
