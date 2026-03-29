# GitHub Trending Explorer

A full-stack web app for discovering trending GitHub repositories, starring favorites (synced with your GitHub account), and tracking release notes for repos you follow.

Built with **Angular 21** (Signals + SignalStore, zoneless) and **Next.js** API backend in an **Nx monorepo**, backed by **PostgreSQL** and running in **Docker**.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your GitHub OAuth credentials (see docs/run-app.md)
docker compose up --build
# Open http://localhost:4200
```

See **[docs/run-app.md](docs/run-app.md)** for full setup instructions including GitHub OAuth configuration.

## Features

- Browse trending GitHub repos with language and topic filters
- Search repositories by name and description
- Sort by stars, forks, or last updated
- Star repos (synced with your GitHub account)
- Track release notes for followed repos
- Repo health indicators (commit recency, issues, license)
- Personal notes on followed repos
- Responsive mobile-first design
- PWA support (installable, offline shell)

## Architecture

```
apps/frontend   Angular 21 + Material (served via nginx)
apps/backend    Next.js API routes (GitHub proxy + auth + DB)
libs/shared     Shared TypeScript models and utilities
libs/server     Backend domain libraries (GitHub client, auth, sync)
```

## Development

```bash
npm install
npx nx run-many -t serve -p frontend backend
```

## Tech Stack

- **Frontend**: Angular 21, Angular Material, @ngrx/signals
- **Backend**: Next.js 16 (App Router), Prisma ORM
- **Database**: PostgreSQL 16
- **Infrastructure**: Docker Compose, nginx
- **Auth**: GitHub OAuth with DB-backed sessions
