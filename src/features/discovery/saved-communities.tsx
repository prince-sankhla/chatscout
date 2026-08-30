"use client";

import { useMemo, useSyncExternalStore } from "react";
import { CommunityGrid } from "@/components/community/community-grid";
import type { Community } from "@/types/community";

const savedKey = "chatscout-saved-community-slugs";

function subscribeToSavedCommunities(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getSavedCommunitySnapshot() {
  return localStorage.getItem(savedKey) ?? "[]";
}

function getServerSnapshot() {
  return null;
}

export function SavedCommunities({ communities }: { communities: Community[] }) {
  const savedSlugsSnapshot = useSyncExternalStore(subscribeToSavedCommunities, getSavedCommunitySnapshot, getServerSnapshot);
  const saved = useMemo(() => {
    if (savedSlugsSnapshot === null) return null;
    try {
      const slugs = JSON.parse(savedSlugsSnapshot) as string[];
      return communities.filter((community) => slugs.includes(community.slug));
    } catch {
      return [];
    }
  }, [communities, savedSlugsSnapshot]);

  if (saved === null) return <p className="neon-empty">Loading saved communities…</p>;
  return saved.length ? <CommunityGrid communities={saved} /> : <p className="neon-empty">You have not saved any communities yet.</p>;
}
