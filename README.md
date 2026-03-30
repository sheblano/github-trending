# 🔭 GitHub Trending Explorer

> Because [github.com/trending](https://github.com/trending) is great for a quick glance, but not enough when you want to **filter, track, score, and stay on top of** the repos that actually matter to you.

**Primary experience:** a self-hosted web app that supercharges GitHub’s trending page with persistent starring, release tracking, watchlist scoring, radar and galaxy discovery, a timeline of notable events, and more, built for **day-to-day use in the browser**.

**Optional integration:** the same Next.js backend exposes **JSON HTTP APIs** you can call from scripts, [OpenClaw](https://github.com/openclaw/openclaw), or other tools. That layer is **additive**: the product is not an “AI tool,” but you can wire it up if you want. See **[API reference](docs/api.md)** and the **[OpenClaw example](docs/examples/openclaw/README.md)** (template skill you can copy).

No AI or assistants are required to use the app; they are optional if you want them.

**Why self-hosted?** You keep your own OAuth app, your own database, your own notes/presets, and your own automation hooks without depending on a hosted third-party service.

🤖 **This project was mostly vibe-coded.** I came up with the feature ideas and provided the technical direction; the actual code was largely AI-generated.

### Preview


| Trending | Galaxy discovery | Top Movers |
| -------- | ---------------- | ---------- |
| Trending | Galaxy           | Top Movers |


---

## 👥 Who this is for

- Developers evaluating open-source repos before starring, following, or depending on them
- People tracking dependencies and wanting a better sense of repo momentum, health, and releases
- Users who already browse GitHub Trending regularly and want filters, history, notes, and better ranking

---

## 💡 Why this exists

GitHub's native trending page gives you a flat list of popular repos for today, this week, or this month. That's it. No search. No topic filters. No way to save what you find. No way to know if a repo is actually healthy or just had a one-day spike.

I wanted something that lets me:

- 🔍 **Search and filter** trending repos by language, topics, date range, and sort order, then **save those filter combos** as reusable presets
- ⭐ **Star repos** and have them sync with my GitHub account, with **personal notes** attached
- 📦 **Track releases** for repos I follow, with unseen badges so I never miss an update
- 📊 **Score repos** on health and momentum so I can tell the difference between a flash-in-the-pan and a project worth depending on
- 📡 **Rank by signal, not just stars:** a radar mode that surfaces fast-rising, well-maintained repos
- 🕐 **See a timeline** of notable events: new releases, star spikes, repos entering the radar

So I built it.

---

## ⚖️ Compared with GitHub Trending


| Capability                | GitHub Trending      | This app             |
| ------------------------- | -------------------- | -------------------- |
| Date range                | Today / week / month | Today / week / month |
| Language filter           | Limited              | Yes                  |
| Topic filters             | No                   | Yes                  |
| Search within results     | No                   | Yes                  |
| Save presets              | No                   | Yes                  |
| Repo health scoring       | No                   | Yes                  |
| Radar ranking             | No                   | Yes                  |
| Galaxy discovery view     | No                   | Yes                  |
| Release tracking          | No                   | Yes                  |
| Personal notes            | No                   | Yes                  |
| Timeline / movers history | No                   | Yes                  |
| Optional automation API   | No                   | Yes                  |


---

## ✨ Features

### 🔍 Discovery & filtering

- **Trending grid** with infinite scroll, powered by GitHub's search API
- **Language filter:** JavaScript, TypeScript, Python, Go, Rust, Java, C++, C#, Swift, Kotlin, Ruby, PHP, Dart, Zig, Elixir, Scala, or All
- **Topic chips:** Machine Learning, AI, Deep Learning, LLM, DevOps, Docker, Kubernetes, Serverless, React, Angular, Vue, Next.js, CLI, Database, API, Security, Testing, Blockchain, Web3, Game Dev
- **Date range:** Today / This Week / This Month
- **Sort** by Stars, Forks, or Last Updated, ascending or descending
- **Debounced search** across repo names and descriptions
- **Filter presets:** save your favorite filter combos (cloud-synced when signed in, localStorage when anonymous)

### 📊 Repo health score

Every repo card shows a **numeric score (0–100)** and a **label** (Strong / Watch / Cooling / Risky) computed from:

- Commit recency and push activity
- Star count and growth momentum (from cached star history samples)
- Fork activity
- Open issue load relative to popularity
- License presence
- Archive status

Hover for a tooltip listing the specific reasons behind the score.

### 📡 Radar mode

Toggle between **Default** (GitHub's ranking) and **Radar** (momentum + health ranking). Radar mode:

- Re-sorts repos by a weighted signal combining watch score, star growth momentum, push freshness, and topic breadth
- Shows a **radar rank** chip per repo
- Highlights **"hot" repos** (score >= 72) with a purple accent border
- Surfaces reasons like *"Strong star growth"*, *"Recently pushed"*, *"Fresh commits"*
- **"Why this is hot"** opens in a **dialog** (insights icon on each card) so you can read radar reasons and scores without breaking the page layout

### 🌌 Galaxy discovery

Interactive **scatter / galaxy** view: each repo is a dot positioned by momentum (radar) vs confidence/stability (watch + maintainer signals), sized by stars, colored by language, with glow on hot radar picks. Includes a detail panel and README preview.

### 🚀 What’s moving fastest

Dashboard aggregating **star spikes**, **entered radar**, **fresh releases**, and **hot snapshots** (high radar score) from your instance’s timeline and snapshot data.

Click any movers card to open the same **"Why this is hot"** dialog with the event context or snapshot reasons behind it.

### 🎨 Brand & dark UI

**Dark-first** Material theme with violet/cyan accents, gradient hero surfaces, custom **SVG logo + favicon**, toolbar theme toggle (persisted), and wider content shell for discovery views.

### 🃏 Repo cards at a glance

Each card displays: owner avatar, full name (linked), description, primary language, formatted star count, forks, last push date, commit recency health chip (Active / Slowing / Stale), open issue count, license (or "No License" warning), archive status, and up to 5 topic chips.

**Layout:** descriptions are **clamped to three lines** with ellipsis so cards stay **even height** in the grid. On desktop, **hover** the description to see the full text in a popover above the card (no reflow of neighbors). On mobile, tap **More** or the description area to expand that card only.

The Trending page also keeps a **recently viewed** strip in local storage so you can jump back into repos you were evaluating (opens the same insights dialog when you pick an item).

### 📈 Star history sparkline

When signed in, each repo card lazy-loads a **mini sparkline chart** showing weekly star growth, sampled from the GitHub Stargazers API and cached for 24 hours.

### 📖 README preview

Click the article icon on any card to open a **side drawer** with the repo's rendered README. No need to leave the app. Includes a direct "Open on GitHub" link.

### ⭐ Starring & tracking

- **Star / unstar repos** directly from the trending page, syncing with your actual GitHub stars
- **Starred tab** with your followed repos, follow dates, and an **unstar** action
- **Personal notes** per repo: type in a textarea, auto-saved on blur

### 📦 Release notes

- **Release Notes tab** aggregates the latest releases across all your starred repos
- **Unseen badge** on the tab when there are new releases you haven't checked
- Each release shows tag, date, rendered body, and a link to the GitHub release page

### 🔔 Weekly digest

A **bell icon** in the toolbar (signed in) opens a digest menu:

- Count of repos with new releases since your last check
- "Trending in your languages": personalized picks based on the languages of your starred repos
- Red dot indicator for unseen updates; auto-marked as seen when opened

### 🕐 Timeline

A dedicated **Timeline page** showing chronological events:

- **Release published:** when a starred repo pushes a new release
- **Star spike:** when a trending repo gains significant stars between snapshots
- **Entered radar:** when a repo's radar score crosses the "hot" threshold

Filter by repo name or event type. Events are derived from throttled snapshots recorded during trending fetches (no background scheduler needed for MVP).

> **First-run note:** The timeline will be empty on a fresh install. Events accumulate automatically as you (or anyone) browse the Trending page over time. Each visit records a snapshot; the next visit an hour later compares it and emits events. Give it a day of normal use and it will start filling up.

### 📐 Responsive design

Full **mobile-first** layout: bottom tab navigation on small screens, scrollable chip rows, stacked controls, and a single-column repo grid. Repo descriptions support tap-to-expand on small screens; insights use the same modal pattern as on desktop.

---

## 🛠 Tech stack


| Layer              | Technology                                                                           |
| ------------------ | ------------------------------------------------------------------------------------ |
| **Frontend**       | Angular 21 (Signals, zoneless), Angular Material, @ngrx/signals                      |
| **Backend**        | Next.js 16 (App Router, API routes)                                                  |
| **Database**       | PostgreSQL 16, Prisma ORM                                                            |
| **Auth**           | GitHub OAuth with DB-backed encrypted sessions; optional agent tokens for API access |
| **Monorepo**       | Nx 22 with shared TypeScript libraries                                               |
| **Infrastructure** | Docker Compose, nginx reverse proxy                                                  |


### 📁 Project structure

```
apps/frontend     Angular 21 SPA served via nginx
apps/backend      Next.js API server (GitHub proxy + auth + DB)
libs/shared        Shared TypeScript models and utilities
libs/server        Backend domain libraries:
  ├─ github-client   GitHub API wrapper
  ├─ auth            Session & encryption helpers
  ├─ repo-sync       Starred repo & release sync
  ├─ repo-scoring    Watchlist confidence, radar scoring & galaxy layout
  └─ timeline        Snapshot recording, event derivation & top movers aggregation
```

---

## 🚀 Quick start

### Prerequisites

- **Docker Desktop** (or Docker Engine + Compose v2)
- A **GitHub OAuth App**: [create one here](https://github.com/settings/applications/new)

  | Field                      | Value                                     |
  | -------------------------- | ----------------------------------------- |
  | Application name           | e.g. *Trending Explorer (local)*          |
  | Homepage URL               | `http://localhost:4200`                   |
  | Authorization callback URL | `http://localhost:3000/api/auth/callback` |


### 🐳 Run with Docker

```bash
# 1. Clone and configure
git clone https://github.com/sheblano/github-trending.git
cd github-trending
cp .env.example .env

# 2. Edit .env: add your GitHub OAuth credentials and generate an encryption key
#    GITHUB_CLIENT_ID=<your client id>
#    GITHUB_CLIENT_SECRET=<your client secret>
#    ENCRYPTION_KEY=$(openssl rand -hex 32)

# 3. Build and start
docker compose up --build

# 4. Open the app
open http://localhost:4200
```

The backend container runs `prisma db push` automatically on every start — all tables are created or updated before the server accepts traffic. No manual migration step is needed. After pulling an update that adds new tables (e.g. agent tokens), simply restart: `docker compose up --build`.

**Port conflicts?** The defaults (frontend `:4200`, backend `:3000`, postgres `:5432`) are likely already in use if you run other dev projects. Override any of them in `.env` without touching `docker-compose.yml`:

```bash
FRONTEND_PORT=4201
BACKEND_PORT=3001
POSTGRES_PORT=5433
# also update the URLs to match:
NEXT_PUBLIC_APP_URL=http://localhost:4201
BACKEND_URL=http://localhost:3001
```

### 💻 Local development (without Docker)

```bash
# Start only the database
docker compose up postgres -d

# Install dependencies
npm install

# Generate Prisma client and push schema (re-run after pulling schema changes, e.g. agent tokens)
npx prisma generate --schema=apps/backend/prisma/schema.prisma
npx prisma db push --schema=apps/backend/prisma/schema.prisma

# Start both apps
npx nx run-many -t serve -p frontend backend
```

The Angular dev server (`:4200`) proxies `/api/*` to the Next.js server (`:3000`).

---

## 🔐 Auth & rate limits


| Context                                                          | Rate limit                                      | Login required?                      |
| ---------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------ |
| Browse trending repos                                            | 60 req/hr (anonymous)                           | No                                   |
| Star/unstar, release notes, star history, digest, server presets | 5,000 req/hr (per user)                         | Yes (browser session or agent token) |
| README preview                                                   | Works anonymously, better limits when signed in | No                                   |


Trending results are cached server-side for 15 minutes.

**API consumers:** Discovery-style endpoints work **without** cookies. Personalized endpoints accept the same **browser session** (`session_id` cookie after GitHub OAuth) **or** `Authorization: Bearer <token>` using an **agent token** you create while signed in. Full matrix and examples: **[docs/api.md](docs/api.md)**.

---

## 🔌 Quick API examples

```bash
# Trending in Rust this week
curl -sS "$BACKEND_URL/api/repos/trending?language=Rust&dateRange=weekly&perPage=5"

# Timeline star spikes
curl -sS "$BACKEND_URL/api/timeline?eventType=star_spike&limit=20"

# Weekly digest (requires agent token)
curl -sS -H "Authorization: Bearer $TRENDING_AGENT_TOKEN" \
  "$BACKEND_URL/api/digest"
```

---

## 🤖 Optional: OpenClaw, MCP, and automation

This app stays **UI-first**. If you want assistants or scripts to talk to the same data, use the HTTP API against your backend base URL (`BACKEND_URL`, e.g. `http://localhost:3000`).

- **[OpenClaw](https://github.com/openclaw/openclaw):** Copy the template skill under **[docs/examples/openclaw/](docs/examples/openclaw/)** into your OpenClaw skills folder and set `TRENDING_API_URL`. Prompt ideas: trending by language, radar top N, timeline star spikes, releases/digest (with a bearer token).
- **Claude / MCP:** Same API; use the example server in **[docs/examples/openclaw/mcp-server.ts](docs/examples/openclaw/mcp-server.ts)** as a starting point, or wrap `GET /api/repos/trending` and `GET /api/timeline` yourself. See **[docs/api.md](docs/api.md)** for parameters and auth.

### OpenClaw-ready checklist

- App running
- Signed in via the web UI
- Agent token created
- `SKILL.md` copied into your OpenClaw skills folder
  - `TRENDING_API_URL` set
- `TRENDING_AGENT_TOKEN` set if you want personalized endpoints

No extra vendor keys beyond your own GitHub OAuth app for the web UI; agent tokens are issued by your instance.

---

## 📄 License

[MIT](LICENSE)

---

Built with ☕ by [@sheblano](https://github.com/sheblano)
