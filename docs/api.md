# HTTP API reference (optional integration layer)

The **main product** is the web UI. This document describes the **same backend** for scripts, OpenClaw, MCP servers, or other HTTP clients.

**Base URL:** your Next.js API origin (`BACKEND_URL`), e.g. `http://localhost:3000` in local dev (Angular on `:4200` proxies `/api/*` there).

## Authentication

| Method | When |
|--------|------|
| **Browser** | After GitHub OAuth, the API sets an httpOnly `session_id` cookie. The SPA sends it automatically on same-origin or proxied requests. |
| **Agents / scripts** | Create a long-lived **agent token** while signed in (browser session required once): `POST /api/agent-tokens`. Then call personalized endpoints with `Authorization: Bearer <token>`. |

Token management (create/list/revoke) is **session-only** (`POST` / `GET` / `DELETE /api/agent-tokens/...`) so you cannot mint new tokens using only a bearer token.

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | JSON `{ ok, service }` for probes. |

## Public (no login)

These work without `session_id` or `Authorization`. An optional GitHub token may still be used internally when you *are* logged in (better rate limits on upstream GitHub).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/repos/trending` | Scored trending search. Query: `language`, `topics` (comma-separated), `dateRange` (`daily` \| `weekly` \| `monthly`), `q`, `sort` (`stars` \| `forks` \| `updated`), `order` (`asc` \| `desc`), `viewMode` (`default` \| `radar`), `page`, `perPage` (max 100). |
| GET | `/api/repos/discovery` | Galaxy layout; same filter params as trending (no `viewMode`). |
| GET | `/api/timeline` | Timeline events. Query: `repo`, `eventType`, `since` (ISO date), `limit`. |
| GET | `/api/movers` | Aggregated “top movers” from snapshots/events. |
| GET | `/api/repos/{owner}/{name}/readme` | Rendered README HTML (`{ html }`). |
| GET | `/api/hello` | Plain text probe (legacy). |

### Example: trending (curl)

```bash
curl -sS "$BACKEND_URL/api/repos/trending?language=Rust&dateRange=weekly&perPage=5"
```

### Example: timeline star spikes

```bash
curl -sS "$BACKEND_URL/api/timeline?eventType=star_spike&limit=20"
```

## Authenticated (session or Bearer agent token)

All of these return **401** if neither a valid session nor a valid agent token is present.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/me` | Current user profile or `{ user: null }`. |
| GET | `/api/repos/starred` | Starred/followed repos (syncs with GitHub). |
| POST | `/api/repos/star` | Star a repo (body per API). |
| DELETE | `/api/repos/star/{owner}/{name}` | Unstar. |
| PATCH | `/api/repos/starred/{id}/notes` | Update notes. |
| GET | `/api/releases` | Release feeds for followed repos. |
| GET | `/api/digest` | Weekly digest summary. |
| POST | `/api/digest/seen` | Mark digest seen. |
| GET / POST | `/api/presets` | List / create filter presets. |
| DELETE | `/api/presets/{id}` | Delete preset. |
| GET | `/api/repos/{owner}/{name}/star-history` | Weekly star history samples (heavy on GitHub; cached server-side). |

### Example: digest with agent token

```bash
curl -sS -H "Authorization: Bearer $TRENDING_AGENT_TOKEN" \
  "$BACKEND_URL/api/digest"
```

## Agent token management (browser session only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agent-tokens` | List active tokens (metadata only). |
| POST | `/api/agent-tokens` | Body optional `{ "label": "OpenClaw" }`. Returns `{ token, id, label, createdAt }`. **Save `token` once**; it is not stored in plain text. |
| DELETE | `/api/agent-tokens/{id}` | Revoke token. |

## OpenClaw-oriented mapping

| User intent | Endpoint |
|-------------|----------|
| Trending / radar repos | `GET /api/repos/trending` (+ `viewMode=radar`) |
| Galaxy layout | `GET /api/repos/discovery` |
| Top movers | `GET /api/movers` |
| Star spikes / radar entries / releases on timeline | `GET /api/timeline` |
| README snippet | `GET /api/repos/{owner}/{name}/readme` |
| My releases / digest / presets / star / notes | Authenticated routes above + `Authorization: Bearer` |

A **copy-paste skill template** lives in [examples/openclaw/](examples/openclaw/).

## Rate limits

Anonymous GitHub search traffic is limited by GitHub (see the main [README](../README.md) “Auth & rate limits”). Authenticated users use your stored OAuth token and higher limits.

## Schema changes

If you pull updates that add tables or indexes, run:

```bash
npx prisma db push --schema=apps/backend/prisma/schema.prisma
npx prisma generate --schema=apps/backend/prisma/schema.prisma
```
