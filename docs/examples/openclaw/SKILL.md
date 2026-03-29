---
name: github-trending-explorer
version: 1.0.0
description: Query a self-hosted GitHub Trending Explorer instance (trending, radar, timeline, optional digest/releases via bearer token)
triggers:
  - trending repos
  - radar repos
  - github trending
  - star spikes
  - timeline events
  - top movers
  - weekly digest
  - my github releases trending app
---

# GitHub Trending Explorer (self-hosted)

**Template skill — copy to your OpenClaw skills folder.** Set:

- `TRENDING_API_URL`: API base URL (e.g. `http://localhost:3000`)
- `TRENDING_AGENT_TOKEN`: optional bearer token from `POST /api/agent-tokens` (see `docs/examples/openclaw/README.md`)

The **web app is the primary product**; this skill only calls its JSON API.

## Public queries (no token)

### Trending or radar repos

`GET ${TRENDING_API_URL}/api/repos/trending`

Query params (all optional unless noted):

- `language`: e.g. `Rust`, `TypeScript`
- `topics`: comma-separated, e.g. `AI,Machine Learning`
- `dateRange`: `daily` | `weekly` | `monthly`
- `q`: search string
- `sort`: `stars` | `forks` | `updated`
- `order`: `asc` | `desc`
- `viewMode`: `default` | `radar`
- `page`, `perPage` (max 100)

**Response:** JSON with `repos`, `totalCount`, `page`, `perPage`, `viewMode`. Each repo includes `full_name`, `description`, `watchScore`, `watchLabel`, `radarScore`, etc.

**Chat formatting:** List top N as `**owner/name** — short description (watch: score/label; radar: score if present).`

### Galaxy / discovery layout

`GET ${TRENDING_API_URL}/api/repos/discovery`: same filter params as trending (no `viewMode`).

### Timeline

`GET ${TRENDING_API_URL}/api/timeline`

- `eventType`: e.g. `star_spike`, `entered_radar`, `release_published`
- `repo`: `owner/name`
- `since`: ISO date
- `limit`

### Top movers

`GET ${TRENDING_API_URL}/api/movers`

### README HTML

`GET ${TRENDING_API_URL}/api/repos/{owner}/{name}/readme`: returns `{ html }`. Summarize in chat; do not dump raw HTML.

## Personalized queries (requires `TRENDING_AGENT_TOKEN`)

Send header: `Authorization: Bearer ${TRENDING_AGENT_TOKEN}`

- Weekly digest: `GET ${TRENDING_API_URL}/api/digest`
- Releases for starred repos: `GET ${TRENDING_API_URL}/api/releases`
- Star history: `GET ${TRENDING_API_URL}/api/repos/{owner}/{name}/star-history`
- Presets: `GET ${TRENDING_API_URL}/api/presets`

If the token is missing or invalid, tell the user to create one via the web UI and `POST /api/agent-tokens` (see repo `docs/api.md`).

## Health check

`GET ${TRENDING_API_URL}/api/health`: expect `{ "ok": true }`.
