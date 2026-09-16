"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

export function SearchForm({ query = "", className = "" }: { query?: string; className?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form className={`neon-search ${className}`.trim()} role="search" action="/search" onSubmit={() => setIsSubmitting(true)}>
      <Icon name="search" />
      <input
        name="q"
        defaultValue={query}
        aria-label="Search communities"
        autoComplete="off"
        placeholder="Try: coding groups in Jaipur, JEE communities, gaming Discord…"
      />
      <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Searching…" : "Search"}</button>
    </form>
  );
}
