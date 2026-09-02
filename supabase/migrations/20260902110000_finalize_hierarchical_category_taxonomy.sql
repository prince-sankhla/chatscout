begin;

-- Finalize ChatScout's two-level category taxonomy without changing
-- community/category assignments.
alter table public.categories
  add constraint categories_parent_fk
  foreign key (parent_id) references public.categories(id) on delete restrict;

alter table public.categories
  add constraint categories_display_order_nonnegative
  check (display_order >= 0);

create index if not exists categories_active_parent_display_order_idx
  on public.categories (parent_id, is_active, display_order);

create unique index if not exists categories_active_parent_name_uidx
  on public.categories (parent_id, lower(btrim(name)))
  where is_active;

-- Canonical top-level order. Inactive legacy roots remain untouched so
-- existing community relationships are not broken in Phase 1.
update public.categories c
set display_order = v.display_order,
    sort_order = v.display_order,
    updated_at = timezone('utc', now())
from (values
  ('random-friends', 10),
  ('memes-reels', 20),
  ('dating-singles', 30),
  ('gaming', 40),
  ('sports', 50),
  ('anime-fandom', 60),
  ('music', 70),
  ('movies-series', 80),
  ('study-education', 90),
  ('fitness-gym', 100),
  ('fashion-beauty', 110),
  ('technology', 120),
  ('travel', 130),
  ('other', 140)
) as v(slug, display_order)
where c.slug = v.slug and c.parent_id is null and c.is_active;

-- Keep the existing secondary sort field synchronized with the canonical
-- display ordering for active child categories.
update public.categories c
set sort_order = c.display_order,
    updated_at = timezone('utc', now())
where c.is_active and c.parent_id is not null;

commit;
