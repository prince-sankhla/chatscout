# ChatScout

ChatScout is an India-first **community discovery directory** for Instagram, WhatsApp, Telegram and Discord.

People use ChatScout to discover communities by topic, platform, language, region, age and size, preview useful listing details, and continue to the original platform to join.

## Product focus

ChatScout is intentionally directory-first.

### Public discovery

- Multi-platform community directory
- Intent-aware search and relevance ranking
- Platform, category, language, region, age and member filters
- Trending and newly added communities
- Community detail pages with trust and freshness signals
- Related communities and focused collection pages
- Join redirects with analytics
- Search-engine-friendly community, category and collection URLs
- Anonymous discovery analytics

### Community owners

- Submit a community for review
- Upload listing imagery and details
- Claim an existing community
- Request listing updates
- View listing performance from a private dashboard
- Receive review and status notifications

### Operations

- Admin authentication and Controller
- Submission moderation
- Verification and health monitoring
- Reports, audit logs and category management
- Community import and data-quality tooling

Brand marketplace, campaign execution, payouts and rewards workflows are intentionally outside the active application surface.

## Tech stack

- **Frontend:** Next.js App Router, React, TypeScript
- **Styling:** Tailwind CSS + product CSS
- **Database/Auth/Storage:** Supabase PostgreSQL, Auth and Storage
- **Hosting:** Vercel

## Project structure

\`\`\`
chatscout/
├── src/
│   ├── app/                    # Public routes, owner routes, Controller and APIs
│   ├── components/             # Shared public, owner, admin and UI components
│   ├── features/
│   │   ├── analytics/          # Discovery event tracking
│   │   ├── auth/               # Admin/auth actions
│   │   ├── categories/         # Community taxonomy
│   │   ├── claims/             # Community ownership claims
│   │   ├── communities/        # Community access/presentation
│   │   ├── community-monitor/  # Listing health and metadata checks
│   │   ├── discovery/          # Search and browse logic
│   │   ├── health/             # Health helpers
│   │   ├── moderation/         # Controller/moderation logic
│   │   ├── owner/              # Owner dashboard data
│   │   └── submissions/        # Community submissions
│   ├── lib/                    # Supabase clients and shared utilities
│   └── types/                  # Database/domain types
├── docs/                       # Architecture, demand and decisions
├── public/                     # Static assets
└── supabase/                   # Database migrations and seeds
\`\`\`

## Development

### Prerequisites

- Node.js 18+
- npm 9+

\`\`\`bash
npm install
Copy-Item .env.example .env.local
npm run dev
\`\`\`

Open http://localhost:3000.

### Quality checks

\`\`\`bash
npm run lint
npm run build
\`\`\`

## Deployment

ChatScout is designed for Vercel with Supabase as the backend.

## License

This project is proprietary.
