-- DEV ONLY: baseline category taxonomy. No community data is seeded.
insert into public.categories (name, slug, description, icon_key, sort_order)
values
  ('Coding', 'coding', 'Programming and software learning communities', 'code', 10),
  ('Students', 'students', 'Student life and course-based communities', 'graduation-cap', 20),
  ('Anime', 'anime', 'Anime and manga fan communities', 'sparkles', 30),
  ('Gaming', 'gaming', 'Gaming and teammate-finding communities', 'gamepad-2', 40),
  ('Entrepreneurship', 'entrepreneurship', 'Builders, founders, and startup communities', 'rocket', 50),
  ('Fitness', 'fitness', 'Fitness and wellbeing communities', 'activity', 60),
  ('Art & Design', 'art-design', 'Creative and design communities', 'palette', 70)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    icon_key = excluded.icon_key,
    sort_order = excluded.sort_order;
