import Link from "next/link";
import { BulkImportForm } from "@/components/admin/bulk-import-form";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function AdminBulkImportPage() {
  await requireAdminUser();
  const supabase = createAdminSupabaseClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id,name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <Link href="/admin" className="back-link">← Back to control center</Link>
          <p className="eyebrow">CHATSCOUT CONTROLLER</p>
          <h1>Bulk GC Import</h1>
          <p>Paste public Instagram invite links and let ChatScout resolve the current community name, member count, and image automatically.</p>
        </div>
      </header>

      <section className="admin-section admin-panel-narrow">
        <div className="admin-section-heading">
          <div>
            <h2>Import community inventory</h2>
            <p>One category per batch keeps the imported catalogue consistent.</p>
          </div>
          <span>100 max</span>
        </div>
        <BulkImportForm categories={categories ?? []} />
      </section>
    </main>
  );
}
