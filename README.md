# 🔭 GitHub Trending Explorer

> Because [github.com/trending](https://github.com/trending) is great for a quick glance, but not enough when you want to **filter, track, score, and stay on top of** the repos that actually matter to you.

A self-hosted web app that supercharges GitHub's trending page with persistent starring, release tracking, watchlist scoring, radar-mode ranking, a timeline of notable events, and more — all without any AI dependency.

🤖 **This project was vibe-coded.** I came up with the feature ideas and provided the technical direction — the actual code was largely AI-generated.

---

## 💡 Why this exists

GitHub's native trending page gives you a flat list of popular repos for today, this week, or this month. That's it. No search. No topic filters. No way to save what you find. No way to know if a repo is actually healthy or just had a one-day spike.

I wanted something that lets me:

- 🔍 **Search and filter** trending repos by language, topics, date range, and sort order — then **save those filter combos** as reusable presets
- ⭐ **Star repos** and have them sync with my GitHub account, with **personal notes** attached
- 📦 **Track releases** for repos I follow, with unseen badges so I never miss an update
- 📊 **Score repos** on health and momentum so I can tell the difference between a flash-in-the-pan and a project worth depending on
- 📡 **Rank by signal, not just stars** — a radar mode that surfaces fast-rising, well-maintained repos
- 🕐 **See a timeline** of notable events: new releases, star spikes, repos entering the radar

So I built it.

---

## ✨ Features

### 🔍 Discovery & filtering

- **Trending grid** with infinite scroll, powered by GitHub's search API
- **Language filter** — JavaScript, TypeScript, Python, Go, Rust, Java, C++, C#, Swift, Kotlin, Ruby, PHP, Dart, Zig, Elixir, Scala, or All
- **Topic chips** — Machine Learning, AI, Deep Learning, LLM, DevOps, Docker, Kubernetes, Serverless, React, Angular, Vue, Next.js, CLI, Database, API, Security, Testing, Blockchain, Web3, Game Dev
- **Date range** — Today / This Week / This Month
- **Sort** by Stars, Forks, or Last Updated, ascending or descending
- **Debounced search** across repo names and descriptions
- **Filter presets** — save your favorite filter combos (cloud-synced when signed in, localStorage when anonymous)

### 📊 Watchlist confidence score

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

- Re-sorts repos by a weighted signal combining watch score, star growth velocity, push freshness, and topic breadth
- Shows a **radar rank** chip per repo
- Highlights **"hot" repos** (score >= 72) with a purple accent border
- Surfaces reasons like *"Strong star growth"*, *"Recently pushed"*, *"Fresh commits"*

### 🃏 Repo cards at a glance

Each card displays: owner avatar, full name (linked), description, primary language, formatted star count, forks, last push date, commit recency health chip (Active / Slowing / Stale), open issue count, license (or "No License" warning), archive status, and up to 5 topic chips.

### 📈 Star history sparkline

When signed in, each repo card lazy-loads a **mini sparkline chart** showing weekly star growth — sampled from the GitHub Stargazers API and cached for 24 hours.

### 📖 README preview

Click the article icon on any card to open a **side drawer** with the repo's rendered README — no need to leave the app. Includes a direct "Open on GitHub" link.

### ⭐ Starring & tracking

- **Star / unstar repos** directly from the trending page — syncs with your actual GitHub stars
- **Starred tab** with your followed repos, follow dates, and an **unstar** action
- **Personal notes** per repo — type in a textarea, auto-saved on blur

### 📦 Release notes

- **Release Notes tab** aggregates the latest releases across all your starred repos
- **Unseen badge** on the tab when there are new releases you haven't checked
- Each release shows tag, date, rendered body, and a link to the GitHub release page

### 🔔 Weekly digest

A **bell icon** in the toolbar (signed in) opens a digest menu:

- Count of repos with new releases since your last check
- "Trending in your languages" — personalized picks based on the languages of your starred repos
- Red dot indicator for unseen updates; auto-marked as seen when opened

### 🕐 Timeline

A dedicated **Timeline page** showing chronological events:

- **Release published** — when a starred repo pushes a new release
- **Star spike** — when a trending repo gains significant stars between snapshots
- **Entered radar** — when a repo's radar score crosses the "hot" threshold

Filter by repo name or event type. Events are derived from throttled snapshots recorded during trending fetches (no background scheduler needed for MVP).

### 📱 Progressive Web App

Installable as a PWA with an offline-capable shell via Angular Service Worker.

### 📐 Responsive design

Full **mobile-first** layout: bottom tab navigation on small screens, scrollable chip rows, stacked controls, and a single-column repo grid.

---

## 🛠 Tech stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Angular 21 (Signals, zoneless), Angular Material, @ngrx/signals |
| **Backend** | Next.js 16 (App Router, API routes) |
| **Database** | PostgreSQL 16, Prisma ORM |
| **Auth** | GitHub OAuth with DB-backed encrypted sessions |
| **Monorepo** | Nx 22 with shared TypeScript libraries |
| **Infrastructure** | Docker Compose, nginx reverse proxy |

### 📁 Project structure

```
apps/frontend     Angular 21 SPA served via nginx
apps/backend      Next.js API server (GitHub proxy + auth + DB)
libs/shared        Shared TypeScript models and utilities
libs/server        Backend domain libraries:
  ├─ github-client   GitHub API wrapper
  ├─ auth            Session & encryption helpers
  ├─ repo-sync       Starred repo & release sync
  ├─ repo-scoring    Watchlist confidence & radar scoring
  └─ timeline        Snapshot recording & event derivation
```

---

## 🚀 Quick start

### Prerequisites

- **Docker Desktop** (or Docker Engine + Compose v2)
- A **GitHub OAuth App** — [create one here](https://github.com/settings/applications/new)

  | Field | Value |
  |-------|-------|
  | Application name | e.g. *Trending Explorer (local)* |
  | Homepage URL | `http://localhost:4200` |
  | Authorization callback URL | `http://localhost:3000/api/auth/callback` |

### 🐳 Run with Docker

```bash
# 1. Clone and configure
git clone https://github.com/sheblano/github-trending.git
cd github-trending
cp .env.example .env

# 2. Edit .env — add your GitHub OAuth credentials and generate secrets
#    GITHUB_CLIENT_ID=<your client id>
#    GITHUB_CLIENT_SECRET=<your client secret>
#    SESSION_SECRET=$(openssl rand -base64 32)
#    ENCRYPTION_KEY=$(openssl rand -hex 32)

# 3. Build and start
docker compose up --build

# 4. Open the app
open http://localhost:4200
```

The backend auto-creates all database tables on first startup — no manual migration needed.

### 💻 Local development (without Docker)

```bash
# Start only the database
docker compose up postgres -d

# Install dependencies
npm install

# Generate Prisma client and push schema
npx prisma generate --schema=apps/backend/prisma/schema.prisma
npx prisma db push --schema=apps/backend/prisma/schema.prisma

# Start both apps
npx nx run-many -t serve -p frontend backend
```

The Angular dev server (`:4200`) proxies `/api/*` to the Next.js server (`:3000`).

---

## 🔐 Auth & rate limits

| Context | Rate limit | Login required? |
|---------|-----------|-----------------|
| Browse trending repos | 60 req/hr (anonymous) | No |
| Star/unstar, release notes, star history, digest, server presets | 5,000 req/hr (per user) | Yes |
| README preview | Works anonymously, better limits when signed in | No |

Trending results are cached server-side for 15 minutes.

---

## 🦞 Using with OpenClaw

[OpenClaw](https://github.com/openclaw/openclaw) is a self-hosted personal AI assistant that runs across 20+ messaging platforms (WhatsApp, Telegram, Slack, Discord, and more). Because this app exposes a clean REST API, it can be wired up as an OpenClaw skill to surface trending repo insights wherever you already chat.

### What this enables

With a thin OpenClaw skill pointing at your running instance, you could ask your assistant things like:

- *"What's trending in Rust this week?"* — queries `/api/repos/trending?language=Rust&dateRange=weekly`
- *"Show me the radar top 10"* — queries with `viewMode=radar&perPage=10`
- *"Any star spikes today?"* — queries `/api/timeline?eventType=star_spike`
- *"New releases from my starred repos?"* — queries `/api/releases`
- *"Weekly digest"* — queries `/api/digest`

The results come back as structured JSON, which OpenClaw can format into a readable message for your channel of choice.

### API endpoints useful for a skill

| Endpoint | What it returns |
|----------|----------------|
| `GET /api/repos/trending` | Scored trending repos with filters (`language`, `topics`, `dateRange`, `q`, `sort`, `order`, `viewMode`, `page`, `perPage`) |
| `GET /api/timeline` | Chronological events (`repo`, `eventType`, `since`, `limit`) |
| `GET /api/releases` | Release feeds for starred repos (requires auth) |
| `GET /api/digest` | Weekly digest summary (requires auth) |
| `GET /api/repos/{owner}/{name}/readme` | Rendered README HTML for any repo |
| `GET /api/repos/{owner}/{name}/star-history` | Weekly star samples for sparkline data (requires auth) |

### Sketch of a skill

An OpenClaw skill lives in `~/.openclaw/workspace/skills/github-trending/SKILL.md` and typically includes trigger phrases, the API base URL, and formatting instructions. A minimal example:

```markdown
---
name: github-trending
version: 1.0.0
description: Query your self-hosted GitHub Trending Explorer
triggers:
  - trending repos
  - radar repos
  - star spikes
  - new releases
  - weekly digest
---

# GitHub Trending Explorer Skill

Query the self-hosted GitHub Trending Explorer API at `${TRENDING_API_URL}`.

## Trending repos
When the user asks about trending repos, call:
`GET ${TRENDING_API_URL}/api/repos/trending`

Supported query params: `language`, `topics` (comma-separated), `dateRange` (daily/weekly/monthly), `q` (search), `sort` (stars/forks/updated), `order` (asc/desc), `viewMode` (default/radar), `page`, `perPage`.

Format each repo as: **name** — description (score / label).

## Timeline events
When the user asks about star spikes, releases entering the radar, or recent events:
`GET ${TRENDING_API_URL}/api/timeline`

Params: `repo` (owner/name), `eventType` (release_published/star_spike/entered_radar), `since` (ISO date), `limit`.

## Digest
`GET ${TRENDING_API_URL}/api/digest` (requires auth cookie forwarding or token).
```

Because both projects are MIT-licensed and self-hosted, you own the full stack — no third-party API keys beyond your own GitHub OAuth app.

---

## 🧠 Using with Claude Cowork

[Claude Cowork](https://www.anthropic.com/product/claude-cowork) is Anthropic's agentic AI for knowledge work. It can connect to local services through [MCP (Model Context Protocol)](https://modelcontextprotocol.io) connectors — and since this app runs locally with a full REST API, Claude Cowork can query it directly.

### How it works

You register a lightweight MCP server as a custom connector in Claude Desktop. The MCP server wraps calls to your running Trending Explorer instance, exposing its endpoints as tools that Claude Cowork can invoke autonomously during a conversation.

### Example use cases

- *"Summarize what's hot in AI repos this week and write a brief for my team"* — Claude fetches `/api/repos/trending?topics=AI&viewMode=radar`, then composes a polished document from the scored results
- *"Check if any of my starred repos published releases and draft changelog notes"* — Claude calls `/api/releases`, filters for unseen entries, and produces a formatted summary
- *"Pull the star history for vercel/next.js and chart the growth trend"* — Claude calls `/api/repos/vercel/next.js/star-history` and generates a chart in a spreadsheet or document

Because Cowork handles multi-step tasks, it can chain these API calls — fetch trending, score them, cross-reference your starred list, and produce a finished deliverable.

### Minimal MCP server setup

Create a small MCP server (TypeScript or Python) that proxies to your local instance. With the `@modelcontextprotocol/sdk`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const BASE = process.env.TRENDING_API_URL || "http://localhost:3000";
const server = new McpServer({ name: "github-trending", version: "1.0.0" });

server.tool(
  "get_trending",
  "Fetch scored trending repos with optional filters",
  {
    language: z.string().optional(),
    dateRange: z.enum(["daily", "weekly", "monthly"]).optional(),
    viewMode: z.enum(["default", "radar"]).optional(),
    q: z.string().optional(),
    perPage: z.number().optional(),
  },
  async ({ language, dateRange, viewMode, q, perPage }) => {
    const params = new URLSearchParams();
    if (language) params.set("language", language);
    if (dateRange) params.set("dateRange", dateRange);
    if (viewMode) params.set("viewMode", viewMode);
    if (q) params.set("q", q);
    if (perPage) params.set("perPage", String(perPage));
    const res = await fetch(`${BASE}/api/repos/trending?${params}`);
    return { content: [{ type: "text", text: await res.text() }] };
  }
);

server.tool(
  "get_timeline",
  "Fetch timeline events (releases, star spikes, radar entries)",
  {
    eventType: z.string().optional(),
    repo: z.string().optional(),
    limit: z.number().optional(),
  },
  async ({ eventType, repo, limit }) => {
    const params = new URLSearchParams();
    if (eventType) params.set("eventType", eventType);
    if (repo) params.set("repo", repo);
    if (limit) params.set("limit", String(limit));
    const res = await fetch(`${BASE}/api/timeline?${params}`);
    return { content: [{ type: "text", text: await res.text() }] };
  }
);
```

Then register it in your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "github-trending": {
      "command": "npx",
      "args": ["tsx", "path/to/your/mcp-server.ts"],
      "env": { "TRENDING_API_URL": "http://localhost:3000" }
    }
  }
}
```

Claude Cowork will then see `get_trending` and `get_timeline` as available tools it can call during any task.

---

## 📄 License

[MIT](LICENSE)

---

Built with ☕ by [@sheblano](https://github.com/sheblano)
