# ChatScout Product Scope

## Overview

ChatScout is an global **multi-platform community discovery directory**.

The platform helps people discover and evaluate public community listings across Instagram, WhatsApp, Telegram and Discord. Visitors can search by topic and intent, filter by platform and useful community attributes, preview listing context, and continue to the original platform to join.

## Public discovery

### Search and browse

- Intent-aware community search
- Platform filtering
- Category and subcategory browsing
- Language, country and region filtering
- Age and member-size filtering
- New and trending discovery
- Related-community recommendations

### Community pages

Community pages can show:

- Community name and description
- Platform
- Member count
- Categories and tags
- Language, country and region
- Trust and freshness signals
- Community rules, eligibility and restrictions when supplied
- Join CTA to the original platform
- Related and trending communities
- SEO metadata, canonical URLs and structured data

### Collection and SEO pages

ChatScout exposes focused platform/category collections only where the database has enough real community supply to make the page useful.

Core public URL families include:

- \`/search\`
- \`/categories\`
- \`/categories/[slug]\`
- \`/trending\`
- \`/new\`
- \`/community/[slug]\`
- \`/whatsapp-groups/[slug]\`
- \`/telegram-groups/[slug]\`
- \`/discord-servers/[slug]\`
- \`/instagram-gcs/[slug]\`

## Community owner workflow

Owners can:

1. Submit a community for review.
2. Claim an existing listing when ownership can be verified.
3. Request updates to an owned listing.
4. Keep listing information accurate.
5. View basic listing views, join clicks and listing completeness in a private dashboard.

## Operations

The private Controller provides:

- Admin authentication
- Submission review and publication
- Community search and filtering
- Claims review
- Verification workflows
- Community health monitoring
- Reports
- Category management
- Import tooling
- Audit logs
- Analytics

## Analytics

Discovery events are tracked for useful product measurement, including search, community views and join clicks. The public directory remains usable without an account.

## Product boundary

ChatScout is directory-first. The active application does **not** include:

- Brand marketplace
- Campaign management
- Campaign execution
- Audience packs
- Payout processing
- Rewards or earnings ledgers
- Influencer/brand workspaces
- In-app community member management

Those concerns are deliberately outside the current product surface so search, discovery, listing quality and community supply remain the core experience.

## Technical scope

- Next.js App Router
- React and TypeScript
- Supabase PostgreSQL/Auth/Storage
- Vercel deployment
- Server-rendered public discovery pages
- Client-side interactive filters/navigation where appropriate
- Background community-health checks

## Success criteria

- Fast, useful community discovery
- Strong indexable page coverage from real listings
- Clear context before users leave ChatScout to join
- Healthy and current directory data
- Straightforward submission and ownership workflows
- Low operational complexity as the directory grows
