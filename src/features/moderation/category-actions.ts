"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/auth";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(formData: FormData, key: string, max: number) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function idValue(formData: FormData) {
  const value = text(formData, "id", 50);
  return uuidPattern.test(value) ? value : null;
}

async function audit(userId: string, note: string) {
  await createAdminSupabaseClient().from("admin_audit_log").insert({
    action: "edited",
    admin_user_id: userId,
    community_id: null,
    submission_id: null,
    previous_status: null,
    new_status: null,
    note: note.slice(0, 2000),
  });
}

export async function createCategory(formData: FormData) {
  const user = await requireAdminUser();
  const name = text(formData, "name", 80);
  const description = text(formData, "description", 500) || null;
  const slug = slugify(name);
  if (!name || !slug) redirect("/admin/categories?status=invalid");
  const supabase = createAdminSupabaseClient();
  const maxResult = await supabase.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const sortOrder = (maxResult.data?.sort_order ?? -1) + 1;
  const { error } = await supabase.from("categories").insert({ name, slug, description, sort_order: sortOrder, is_active: true });
  if (error) redirect("/admin/categories?status=failed");
  await audit(user.id, `Category created: ${name}`);
  revalidatePath("/admin/categories");
  revalidatePath("/categories");
  redirect("/admin/categories?status=created");
}

export async function updateCategory(formData: FormData) {
  const user = await requireAdminUser();
  const id = idValue(formData);
  const name = text(formData, "name", 80);
  const description = text(formData, "description", 500) || null;
  const sortRaw = text(formData, "sortOrder", 12);
  const sortOrder = sortRaw ? Number(sortRaw) : 0;
  if (!id || !name || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000) redirect("/admin/categories?status=invalid");
  const slug = slugify(name);
  if (!slug) redirect("/admin/categories?status=invalid");
  const { error } = await createAdminSupabaseClient().from("categories").update({ name, slug, description, sort_order: sortOrder }).eq("id", id);
  if (error) redirect("/admin/categories?status=failed");
  await audit(user.id, `Category updated: ${name}`);
  revalidatePath("/admin/categories");
  revalidatePath("/categories");
  redirect("/admin/categories?status=updated");
}

export async function setCategoryActive(formData: FormData) {
  const user = await requireAdminUser();
  const id = idValue(formData);
  if (!id) redirect("/admin/categories?status=invalid");
  const enabled = text(formData, "enabled", 5) === "true";
  const supabase = createAdminSupabaseClient();
  const { data: category, error } = await supabase.from("categories").update({ is_active: enabled }).eq("id", id).select("name").single();
  if (error || !category) redirect("/admin/categories?status=failed");
  await audit(user.id, `Category ${enabled ? "activated" : "deactivated"}: ${category.name}`);
  revalidatePath("/admin/categories");
  revalidatePath("/categories");
  redirect("/admin/categories?status=${enabled ? "activated" : "deactivated"}");
}
