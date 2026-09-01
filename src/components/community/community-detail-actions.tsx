"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

const savedKey = "chatscout-saved-community-slugs";

function subscribe(onStoreChange: () => void) {
  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener("chatscout-saved-change", handleChange);
  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener("chatscout-saved-change", handleChange);
  };
}

function snapshot() { return localStorage.getItem(savedKey) ?? "[]"; }
function serverSnapshot() { return "[]"; }

export function CommunityDetailActions({ slug, name }: { slug: string; name: string }) {
  const savedSnapshot = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const saved = (() => { try { return (JSON.parse(savedSnapshot) as string[]).includes(slug); } catch { return false; } })();

  function toggleSaved() {
    let slugs: string[];
    try { slugs = JSON.parse(localStorage.getItem(savedKey) ?? "[]") as string[]; } catch { slugs = []; }
    const next = saved ? slugs.filter((item) => item !== slug) : [...new Set([...slugs, slug])];
    localStorage.setItem(savedKey, JSON.stringify(next));
    window.dispatchEvent(new Event("chatscout-saved-change"));
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `${name} | ChatScout`, text: `Discover ${name} on ChatScout.`, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(url).catch(() => undefined);
  }

  return <div className="detail-actions"><button type="button" onClick={toggleSaved} className={saved ? "is-saved" : ""} aria-pressed={saved}><Icon name="bookmark" size={17} />{saved ? "Saved" : "Save"}</button><button type="button" onClick={share}><Icon name="share" size={17} />Share</button><Link href={`/report/${encodeURIComponent(slug)}`}><Icon name="flag" size={17} />Report</Link></div>;
}
