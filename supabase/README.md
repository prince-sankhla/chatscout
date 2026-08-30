# Supabase database foundation

The repository is prepared for a Supabase project. Application connection variables belong in `.env.local`, which is ignored by Git. Copy their placeholder names from `.env.example`; do not commit actual values.

- Initialize the local CLI configuration with `npx --yes supabase@<version> init`.
- Authenticate your Supabase account with `npx --yes supabase@<version> login`, then link a project with `npx --yes supabase@<version> link --project-ref <project-ref>`.
- Review remote migration state with `npx --yes supabase@<version> migration list --linked` and apply pending migrations with `npx --yes supabase@<version> db push --linked`.
- Apply migrations in chronological order from `migrations/`; do not use `db reset` against a hosted project.
- `seed/dev-categories.sql` contains development-only category taxonomy and no communities.
- `config.toml` declares `seed/dev-categories.sql` as the local seed path.
- The current frontend does not read from Supabase.
- Before exposing new table operations, update both PostgreSQL grants and RLS policies; do not rely on either one alone.

Run the local database test workflow before deployment. Never place a service-role or database password in a public environment variable.
