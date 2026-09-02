# ChatScout

ChatScout is an **India-first community discovery platform for Instagram, WhatsApp, Telegram and Discord**.

Help users discover and join communities organized by topics, interests, language and location.

## Current Status

🚀 **Launch-ready multi-platform MVP implementation**

The current application includes the public discovery experience, search and filters, multi-platform community detail/join flows, owner submission, analytics, moderation, Supabase Auth/RLS, and the admin Controller.

### ✅ Implemented

- Next.js App Router + TypeScript strict mode
- Tailwind CSS configuration and custom product styling
- Public multi-platform community discovery UI
- Search, category, platform, language, region, age and member filters
- Community detail pages with trust/health/verification signals
- Instagram, WhatsApp, Telegram and Discord community links
- Multi-platform community submission flow
- Automatic public metadata preview for supported community invite links
- Reports and moderation workflow
- Admin authentication and protected Controller routes
- Admin approval/rejection/edit/archive/restore/delete actions
- Verification and community health tooling
- Analytics and admin audit log
- Supabase PostgreSQL + RLS
- Responsive/mobile layout
- Vercel deployment configuration

### 🔎 Search Console verification

The Google Search Console ownership verification file is served from `public/` so the production site can be verified using the HTML-file method.

## Tech Stack

### Frontend

- **Framework**: [Next.js](https://nextjs.org) with App Router
- **Language**: TypeScript (strict)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) + product CSS
- **Bundler**: Turbopack
- **Package Manager**: npm

### Backend

- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Hosting**: Vercel

## Project Structure

```
chatscout/
├── src/
│   ├── app/                    # Routes, layouts, entry points
│   ├── components/             # Shared UI and admin components
│   ├── features/               # Feature-specific logic
│   │   ├── analytics/          # Event tracking
│   │   ├── auth/               # Admin auth actions
│   │   ├── communities/        # Community access/presentation
│   │   ├── discovery/          # Search/browse communities
│   │   ├── health/             # Community health checks
│   │   └── moderation/         # Admin moderation actions
│   ├── lib/                    # Shared utilities and Supabase clients
│   └── types/                  # Centralized TypeScript types
├── docs/                       # Architecture and product docs
├── public/                     # Static assets
└── supabase/                   # Database migrations, seeds and config
```

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Available Scripts

```bash
npm run dev
npm run build
npm start
npm run lint
npm run seed:dev
npm run import:communities
```

## Code Quality

Before shipping, run:

```bash
npm run lint
npm run build
```

## Deployment

ChatScout is designed for deployment on Vercel with Supabase as the backend.

## License

This project is proprietary.
