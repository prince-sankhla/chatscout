# ChatScout

ChatScout is an **India-first discovery platform for Instagram group chats**.

Help users discover and join Instagram communities organized by topics and interests.

## Current Status

🚀 **Phase 1: Foundation & Architecture** ← You are here

This phase establishes a clean, scalable codebase foundation. The actual product UI and features are built in subsequent phases.

### ✅ Completed

- Next.js App Router setup
- TypeScript strict mode
- Tailwind CSS configuration
- ESLint setup
- Folder architecture
- Architecture documentation
- Product scope documentation
- Environment configuration

### 🔄 NOT YET IMPLEMENTED

- Community discovery UI
- Search functionality
- Community detail pages
- Admin submission workflow
- Authentication
- Database integration (Supabase)
- Analytics

See [docs/product.md](./docs/product.md) for complete feature scope.

## Tech Stack

### Frontend

- **Framework**: [Next.js](https://nextjs.org) with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **Linting**: ESLint
- **Bundler**: Turbopack
- **Package Manager**: npm

### Backend (Planned)

- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Hosting**: Vercel

## Project Structure

```
chatscout/
├── src/
│   ├── app/                    # Routes, layouts, entry points
│   ├── components/
│   │   ├── ui/                 # Reusable UI primitives
│   │   ├── layout/             # Global layout components
│   │   └── community/          # Community-specific components
│   ├── features/               # Feature-specific logic
│   │   ├── discovery/          # Search/browse communities
│   │   ├── communities/        # Community details
│   │   └── submissions/        # Community submission workflow
│   ├── lib/                    # Shared utilities & helpers
│   ├── types/                  # Centralized TypeScript types
│   └── config/                 # Application configuration
├── docs/
│   ├── architecture.md         # Architecture decisions & patterns
│   ├── product.md              # Product scope & features
│   └── decisions/              # Architectural decision records
├── public/
│   ├── images/
│   ├── icons/
│   └── brand/
└── supabase/                   # Database migrations & seeds (future)
```

See [docs/architecture.md](./docs/architecture.md) for detailed architecture documentation.

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# Install dependencies
npm install

# Create .env.local from .env.example (PowerShell)
Copy-Item .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Available Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint

# Import the clearly marked synthetic development fixtures as drafts
npm run seed:dev

# Fix ESLint issues
npm run lint -- --fix
```

## Development Principles

1. **Server-First**: Use Next.js Server Components by default
2. **Type-Safe**: Strict TypeScript, no `any` types
3. **Scalable**: Architecture supports future Supabase integration
4. **Minimal Dependencies**: Avoid unnecessary libraries
5. **Clean Code**: Separated concerns, reusable components
6. **SEO-Ready**: Server-side rendering for discoverability

## Key Architectural Decisions

- **No Pages Router**: App Router only
- **No State Management Library**: Use React Context + hooks initially
- **No ORMs**: SQL queries only when needed (future)
- **No GraphQL**: REST or server functions only
- **Component Organization**: By type (ui/, layout/) and by feature (features/)

See [docs/decisions/](./docs/decisions/) for detailed architectural decisions.

## Adding Features

When adding new features:

1. Create feature folder under `src/features/{feature-name}/`
2. Create route under `src/app/(feature-name)/`
3. Use shared UI components from `src/components/ui/`
4. Keep business logic in feature folder
5. Define types in `src/types/` or within feature folder

## Code Quality

All commits must pass:

```bash
npm run lint    # ESLint must pass
npm run build   # TypeScript must compile
```

## Deployment

ChatScout will be deployed to [Vercel](https://vercel.com) (planned for later phases).

## Documentation

- **[Architecture Guide](./docs/architecture.md)** - Technical architecture and patterns
- **[Product Scope](./docs/product.md)** - V1 features and what's NOT included
- **[Decisions](./docs/decisions/)** - Architectural decision records

## Contributing

When contributing:

1. Follow the project structure
2. Use TypeScript strictly
3. Keep components small and focused
4. Separate business logic from UI
5. Run `npm run lint` before committing
6. Update documentation if adding new patterns

## License

This project is proprietary.

## Questions?

See the documentation in `docs/` or the architecture guide for detailed information about the codebase structure and conventions.
