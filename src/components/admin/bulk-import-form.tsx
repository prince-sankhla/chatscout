"use client";

import { useActionState } from "react";
import { bulkImportCommunities, type BulkImportResult } from "@/features/admin/bulk-import/actions";

const initialState: BulkImportResult | null = null;

export function BulkImportForm({ categories }: { categories: Array<{ id: string; name: string }> }) {
  const [state, action, pending] = useActionState(bulkImportCommunities, initialState);

  return (
    <form action={action} className="community-form bulk-import-form">
      <label>
        Category
        <select name="category" defaultValue="" required>
          <option value="" disabled>Select a category</option>
          {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
        </select>
      </label>

      <div className="form-row">
        <label>
          Language (optional)
          <input name="language" placeholder="English / Hinglish" maxLength={80} />
        </label>
        <label>
          Region (optional)
          <input name="region" placeholder="India / Jaipur / Global" maxLength={120} />
        </label>
      </div>

      <label>
        Instagram GC invite URLs
        <textarea name="urls" rows={14} required placeholder={`Paste one public Instagram invite URL per line.\n\nhttps://ig.me/j/...\nhttps://ig.me/j/...`} />
      </label>

      <p className="form-help">Up to 100 unique links per batch. The importer only creates listings when the current name, member count, and image can all be detected and the image can be saved.</p>

      <button className="primary-button form-submit" type="submit" disabled={pending}>
        {pending ? "Importing communities…" : "Import GCs"}
      </button>

      {state && (
        <section className="bulk-import-results" aria-live="polite">
          <div className="bulk-import-summary">
            <strong>{state.imported} imported</strong>
            <span>{state.skipped} skipped</span>
            <span>{state.failed} failed</span>
          </div>
          {state.items.map((item, index) => (
            <article key={`${item.url}-${index}`} className={`bulk-import-item ${item.status}`}>
              <div>
                <strong>{item.name ?? item.url}</strong>
                <small>{item.members === null || item.members === undefined ? "Member count unavailable" : `${item.members.toLocaleString("en-IN")} members`}</small>
              </div>
              <span>{item.status === "imported" ? "Imported" : item.status === "skipped" ? "Already listed" : item.reason ?? "Failed"}</span>
            </article>
          ))}
        </section>
      )}
    </form>
  );
}
