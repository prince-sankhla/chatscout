import Link from "next/link";
import { ControllerShell } from "@/components/admin/controller-shell";
import { createCategory, setCategoryActive, updateCategory } from "@/features/moderation/category-actions";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/auth";

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminCategoriesPage({ searchParams }: Props) {
  await requireAdminUser();
  const { status } = await searchParams;
  const { data: categories, error } = await createAdminSupabaseClient().from("categories").select("id,name,slug,description,sort_order,is_active,created_at,updated_at").order("sort_order", { ascending: true }).order("name", { ascending: true });
  const message = status === "created" ? "Category created." : status === "updated" ? "Category updated." : status === "activated" ? "Category activated." : status === "deactivated" ? "Category deactivated." : status === "failed" ? "Unable to update the category." : status === "invalid" ? "Please check the category fields." : null;
  return <ControllerShell active="categories" title="Category management" description="Manage the existing public.categories taxonomy without removing historical categories.">
    {message && <p className={`form-message ${status === "failed" || status === "invalid" ? "error" : "success"}`}>{message}</p>}
    <section className="controller-panel">
      <div className="controller-panel-head"><div><h2>Add category</h2><p>New categories are appended to the current ordering.</p></div><Link href="/categories" target="_blank" className="admin-secondary">Open public taxonomy ↗</Link></div>
      <form action={createCategory} className="controller-form-grid">
        <label>Name<input name="name" maxLength={80} required placeholder="e.g. Gaming" /></label>
        <label>Description<input name="description" maxLength={500} placeholder="Optional short description" /></label>
        <div className="controller-form-actions"><button className="primary-button form-submit" type="submit">Add category</button></div>
      </form>
    </section>
    <section className="controller-panel">
      <div className="controller-panel-head"><div><h2>Existing categories</h2><p>{categories?.length ?? 0} categories in the shared taxonomy.</p></div></div>
      {error ? <p className="form-message error">Category data is temporarily unavailable.</p> : categories?.length ? <div className="controller-category-list">{categories.map((category) => <article key={category.id} className="controller-category-row">
        <div className="controller-category-state"><span className={`admin-status-badge ${category.is_active ? "published" : "archived"}`}>{category.is_active ? "Active" : "Inactive"}</span><b>{category.name}</b><code>{category.slug}</code><span>{category.description ?? "No description"}</span></div>
        <div className="controller-category-actions">
          <form action={setCategoryActive}><input type="hidden" name="id" value={category.id} /><input type="hidden" name="enabled" value={String(!category.is_active)} /><button className="admin-secondary" type="submit">{category.is_active ? "Deactivate" : "Activate"}</button></form>
          <details><summary>Edit</summary><form action={updateCategory} className="controller-inline-form"><input type="hidden" name="id" value={category.id} /><label>Name<input name="name" defaultValue={category.name} maxLength={80} required /></label><label>Description<input name="description" defaultValue={category.description ?? ""} maxLength={500} /></label><label>Order<input name="sortOrder" type="number" min={0} max={100000} defaultValue={category.sort_order} required /></label><button className="primary-button" type="submit">Save changes</button></form></details>
        </div>
      </article>)}</div> : <p className="admin-empty">No categories found.</p>}
    </section>
  </ControllerShell>;
}
