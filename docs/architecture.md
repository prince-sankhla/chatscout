# ChatScout Architecture

## Overview

ChatScout is an India-first discovery platform for Instagram group chats. This document outlines the architectural principles, structure, and conventions for the frontend codebase.

## Product Architecture

### User Flow (V1)

1. User discovers the platform
2. Search or browse communities
3. View community details
4. Join community via Instagram (external link)

### Admin/Community Owner Flow (V1)

1. Community owner submits Instagram group chat
2. Admin moderation/verification process
3. Approved communities listed on platform

## Frontend Architecture

### Core Technologies

- **Framework**: Next.js (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Linting**: ESLint
- **Bundler**: Turbopack
- **Package Manager**: npm

### Guiding Principles

1. **Separation of Concerns**
   - UI components must not contain business or database logic
   - Feature-specific logic is isolated within feature modules
   - Shared utilities are centralized

2. **Server-First Approach**
   - Use Next.js Server Components by default
   - Use Client Components only where interactivity is required
   - Minimize client-side JavaScript bundle

3. **Component Organization**
   - UI primitives → `src/components/ui/`
   - Layout components → `src/components/layout/`
   - Feature-specific components → feature modules or `src/components/{feature}/`

4. **Scalability**
   - Architecture supports future Supabase integration without restructuring
   - Clean boundaries between frontend and backend logic
   - Future database/backend implementation should plug in smoothly

5. **No Premature Abstractions**
   - Only create abstractions that are demonstrably useful
   - Avoid unnecessary dependencies
   - Keep the codebase easy to understand

6. **Strict TypeScript**
   - No `any` types unless genuinely unavoidable
   - Strict mode enabled
   - Centralized type definitions in `src/types/`

## Folder Structure

### `src/app/`

Routes, layouts, metadata, and global application entry points.

- `layout.tsx` - Root layout
- `page.tsx` - Home page (placeholder)
- `globals.css` - Global styles
- `(feature-routes)/` - Future feature routes organized by route groups

### `src/components/`

#### `ui/`
Generic, reusable UI primitives (buttons, cards, inputs, etc.). These components should not contain business logic and should be composable.

#### `layout/`
Global layout components:
- Header/Navigation
- Sidebar (future)
- Mobile Navigation (future)
- Footer (future)

#### `community/`
Community-specific reusable presentation components (future):
- CommunityCard
- CommunityGrid
- etc.

### `src/features/`

Feature-specific business logic and functionality. Each feature is self-contained and can be developed independently.

#### `discovery/`
Search and community discovery functionality (future):
- Search logic
- Filtering
- Sorting
- Results management

#### `communities/`
Community-related functionality (future):
- Community detail page logic
- Community information
- Community metadata

#### `submissions/`
Community submission workflow (future):
- Submission form logic
- Validation
- Moderation state management

### `src/lib/`

Shared utilities, infrastructure helpers, and configuration:
- API clients
- Utility functions
- Constants
- Configuration loaders
- Environment helpers

### `src/types/`

Centralized TypeScript type definitions:
- Shared domain types (Community, User, etc.)
- API request/response types
- Global application types

### `src/config/`

Application configuration and constants:
- Feature flags (future)
- API endpoints
- Application constants
- Theme configuration

### `public/`

Static assets:
- `images/` - Image assets
- `icons/` - Icon assets
- `brand/` - ChatScout brand assets (logos, etc.)

### `docs/`

Project documentation:
- `architecture.md` - This file
- `product.md` - Product scope and features
- `decisions/` - Architectural decision records

### `supabase/`

Supabase infrastructure (future):
- `migrations/` - Database migrations
- `seed/` - Seed data for development

### `tests/`

Automated tests (future):
- Unit tests
- Integration tests
- E2E tests

## Future Integrations

### Supabase and PostgreSQL foundation

The database foundation lives in `supabase/migrations/`. It uses Supabase-hosted PostgreSQL with a small normalized public read model:

- `categories`, `communities`, and `community_categories` support discovery.
- `submissions` is the unreviewed owner-submission boundary.
- `reports` supports future abuse and broken-link reporting.
- `verification_checks` preserves verification history while `communities` keeps the latest state.
- `analytics_events` is reserved for trusted, aggregate server-side writes.

No frontend route currently queries Supabase. The UI continues to use explicitly isolated mock data until the data-access phase. When that phase begins, generated database types should live in `src/types/database.ts` and Supabase clients should be separated under `src/lib/supabase/` by browser and server responsibility.

#### Application-side data access

The Supabase browser client is in `src/lib/supabase/client.ts`; the server client and harmless read test are in `src/lib/supabase/server.ts` and `src/lib/supabase/connection-test.ts`. Both use only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The server client is marked `server-only`, disables session persistence, and is not a privileged service-role client.

`src/types/database.ts` is the canonical temporary TypeScript representation of the current schema. Replace it with types generated by `supabase gen types typescript` when authenticated CLI generation is available. Community reads live in `src/features/communities/data-access.ts`, keeping raw queries out of UI components and returning predictable UI-safe errors.

#### Public read and security model

Every `public` table has RLS enabled and explicit grants. Anonymous and authenticated visitors can only read active categories, published communities, and their eligible category relationships. They cannot update or delete product, moderation, verification, or analytics records.

Anonymous submissions and reports are deliberately narrow insert paths: column-level grants prevent callers from setting review or resolution fields, and RLS permits only the initial `pending` or `open` state. Production submission/report endpoints should add rate limiting and validation server-side before they are exposed in the UI.

`analytics_events` has no public grant or RLS policy. A future trusted server-side route may write aggregate events without raw IP addresses or unnecessary personal data. A Supabase service-role key, if one is ever required for such trusted operations, must remain server-only and must never use a `NEXT_PUBLIC_` name.

#### Future boundaries

Admin authentication, moderation actions, and verification workers are intentionally absent. Admin identity can later be linked to Supabase Auth without restructuring the public read tables. Verification workers should append immutable `verification_checks` records and update the community's latest verification fields in a controlled server-side workflow.

### Supabase client integration (NOT IMPLEMENTED YET)

When the application begins querying the database:

1. Database types will be generated and placed in `src/types/database.ts`.
2. Browser and server client initialization will live in `src/lib/supabase/`.
3. Database queries will live in feature modules or a dedicated `src/lib/queries/` folder.
4. Supabase Auth may be added for administrators only.
5. No changes to the above folder structure should be needed.

### Search Functionality (NOT IMPLEMENTED YET)

Search logic will be implemented in `src/features/discovery/` with:
- Search state management
- Query logic
- Filter state
- Results formatting

### Analytics (NOT IMPLEMENTED YET)

Analytics integration will:
- Be tracked at route level using Next.js conventions
- Have dedicated files in `src/lib/analytics/`
- Not pollute component code with tracking logic

### SEO (IMPORTANT)

The architecture is designed to support SEO requirements:

- Community pages will be Server Components, supporting static/dynamic generation
- Metadata will be generated in `layout.tsx` and individual page files
- Structured data/JSON-LD can be added to pages as needed
- URLs will be semantic and meaningful

## Dependency Philosophy

- **Avoid** unnecessary external dependencies
- **Prefer** Next.js built-ins and standard libraries
- **Do not** add Redux, complex state management, GraphQL, ORMs, or microservices without demonstrated need
- **Use** composition and Next.js conventions first

## Naming Conventions

- **Files**: kebab-case (e.g., `user-card.tsx`, `search-communities.ts`)
- **Components**: PascalCase (e.g., `UserCard`, `SearchCommunities`)
- **Functions**: camelCase (e.g., `fetchCommunities`, `formatDate`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RESULTS`, `API_BASE_URL`)
- **Types**: PascalCase (e.g., `Community`, `SubmissionStatus`)

## Adding New Features

When adding a new feature:

1. **Create a feature folder** under `src/features/{feature-name}/`
2. **Define types** in `src/types/` or within the feature folder
3. **Create route** under `src/app/` using route groups `(feature-name)/`
4. **Keep business logic** in the feature folder
5. **Use shared UI components** from `src/components/ui/`
6. **Extract reusable components** to appropriate folders
7. **Document decisions** in `docs/decisions/` if needed

## Configuration

### TypeScript

- Strict mode enabled
- `@/*` import alias configured
- Path resolution configured for `src/`

### ESLint

- Configured for Next.js best practices
- TypeScript support enabled

### Next.js

- App Router (no Pages Router)
- `src/` directory structure
- Turbopack bundler
- TypeScript by default

## Code Quality Standards

- **TypeScript**: Strict mode, no implicit `any`
- **Linting**: All ESLint rules pass
- **Formatting**: Consistent formatting via Prettier (future)
- **Testing**: Unit tests for utilities, integration tests for features (future)
- **Documentation**: README files in feature folders (future)

## Current Status

✅ Next.js foundation with App Router
✅ TypeScript configured
✅ Tailwind CSS setup
✅ ESLint configuration
✅ Folder architecture
✅ Documentation scaffolding

❌ NOT YET: Supabase integration
❌ NOT YET: Search functionality
❌ NOT YET: Authentication
❌ NOT YET: Analytics
❌ NOT YET: Community detail pages
❌ NOT YET: Submission workflow
❌ NOT YET: UI components
❌ NOT YET: Admin dashboard
