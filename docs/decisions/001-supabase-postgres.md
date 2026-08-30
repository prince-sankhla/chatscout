---
title: Supabase PostgreSQL for the V1 data foundation
date: 2026-08-30
status: Accepted
---

### Context

ChatScout needs a simple relational data model for discoverable communities, owner submissions, moderation history, and aggregate product events. The initial product does not require a separate backend service or an ORM.

### Decision

Use Supabase-hosted PostgreSQL with SQL migrations in `supabase/migrations/`. Keep Next.js as the application runtime. Enable Row Level Security and explicitly grant only the public operations required by the read model and future anonymous submission/report forms.

### Rationale

PostgreSQL models the category-to-community relationship and moderation lifecycle directly. Supabase provides a managed PostgreSQL deployment and an API layer while RLS keeps access policy close to the data. This keeps V1 operationally small without precluding future server-side routes or Supabase Auth for admins.

### Consequences

Database changes are reviewed as forward-only SQL migrations. The frontend does not access the database until a dedicated data-access phase. Service-role credentials, if later needed for trusted server tasks, stay server-only. Rate limiting and server-side validation are required before public submission or reporting UI is connected.
