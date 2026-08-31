-- Curated V1 category taxonomy. Keep top-level categories stable; finer discovery is handled by search/tags.
insert into public.categories (name, slug, description, icon_key, sort_order, is_active)
values
  ('AI & ML', 'ai-ml', 'Artificial intelligence, machine learning, LLMs, and AI builders.', 'spark', 10, true),
  ('Coding', 'coding', 'Programming, software engineering, and developer communities.', 'code', 20, true),
  ('Web Development', 'web-development', 'Frontend, backend, full-stack, and web tooling.', 'code', 30, true),
  ('BCA / MCA', 'bca-mca', 'College communities for BCA, MCA, and related CS students.', 'graduation', 40, true),
  ('College & University', 'college-university', 'Campus, branch, hostel, and university communities.', 'graduation', 50, true),
  ('JEE & NEET', 'jee-neet', 'JEE, NEET, and entrance-exam preparation communities.', 'graduation', 60, true),
  ('Competitive Exams', 'competitive-exams', 'Government, aptitude, entrance, and competitive exam groups.', 'graduation', 70, true),
  ('Study Groups', 'study-groups', 'Peer study, accountability, notes, and doubt-solving groups.', 'graduation', 80, true),
  ('Career & Jobs', 'career-jobs', 'Internships, jobs, placements, resumes, and career networking.', 'briefcase', 90, true),
  ('Cybersecurity', 'cybersecurity', 'Security, ethical hacking, CTFs, and security careers.', 'shield', 100, true),
  ('Startups & Entrepreneurship', 'startups-entrepreneurship', 'Founders, builders, startup ideas, and entrepreneurship.', 'briefcase', 110, true),
  ('Cloud & DevOps', 'cloud-devops', 'Cloud engineering, CI/CD, infrastructure, and DevOps.', 'bolt', 120, true),
  ('Gaming', 'gaming', 'PC, mobile, console, esports, and gaming communities.', 'gamepad', 200, true),
  ('Anime & Manga', 'anime-manga', 'Anime, manga, fandom, and otaku communities.', 'heart', 210, true),
  ('Music', 'music', 'Artists, listeners, producers, and music discovery.', 'music', 220, true),
  ('Memes & Humor', 'memes-humor', 'Memes, jokes, reels, and internet culture.', 'spark', 230, true),
  ('Movies & OTT', 'movies-ott', 'Films, series, OTT releases, reviews, and discussions.', 'flame', 240, true),
  ('Sports', 'sports', 'Cricket, football, esports, and other sports communities.', 'trend', 250, true),
  ('Fitness', 'fitness', 'Workouts, running, bodybuilding, and fitness accountability.', 'heart', 300, true),
  ('Health & Wellness', 'health-wellness', 'Lifestyle, wellness, habits, and wellbeing communities.', 'heart', 310, true),
  ('Fashion & Beauty', 'fashion-beauty', 'Fashion, grooming, makeup, skincare, and style.', 'heart', 320, true),
  ('Travel', 'travel', 'Travel planning, local tips, backpacking, and experiences.', 'map', 330, true),
  ('Photography', 'photography', 'Photography, editing, cameras, and visual creators.', 'spark', 340, true),
  ('Books & Writing', 'books-writing', 'Readers, writers, book clubs, and publishing.', 'music', 350, true),
  ('Finance & Investing', 'finance-investing', 'Personal finance, investing, markets, and financial literacy.', 'briefcase', 400, true),
  ('Crypto & Web3', 'crypto-web3', 'Crypto, blockchain, Web3 builders, and communities.', 'spark', 410, true),
  ('Creators', 'creators', 'Content creators, influencers, editors, and creator networking.', 'briefcase', 420, true),
  ('Freelance', 'freelance', 'Freelancing, clients, remote work, and independent careers.', 'briefcase', 430, true),
  ('Networking', 'networking', 'Professional, founder, student, and interest-based networking.', 'users', 440, true),
  ('Local Communities', 'local-communities', 'City, neighborhood, campus, and regional communities.', 'map', 500, true),
  ('India-wide', 'india-wide', 'Communities built for people across India.', 'globe', 510, true)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    icon_key = excluded.icon_key,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = timezone('utc', now());

create index if not exists categories_active_sort_order_idx
  on public.categories (is_active, sort_order, name);
