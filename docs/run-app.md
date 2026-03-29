# Running GitHub Trending Explorer

## Overview

The app runs three services:

| Service    | Default port | Override via `.env`  | Description                     |
| ---------- | ------------ | -------------------- | ------------------------------- |
| `frontend` | 4200         | `FRONTEND_PORT`      | Angular 21 app served via nginx |
| `backend`  | 3000         | `BACKEND_PORT`       | Next.js API server              |
| `postgres` | 5432         | `POSTGRES_PORT`      | PostgreSQL 16 database          |

In Docker, nginx proxies `/api/*` requests from the frontend to the backend automatically.

> **Port conflicts:** ports 3000 and 5432 are common defaults for many dev stacks. If they are taken, add overrides to your `.env` — no changes to `docker-compose.yml` needed:
>
> ```bash
> FRONTEND_PORT=4201
> BACKEND_PORT=3001
> POSTGRES_PORT=5433
> NEXT_PUBLIC_APP_URL=http://localhost:4201
> BACKEND_URL=http://localhost:3001
> ```

For optional automation (OpenClaw, scripts), the backend also exposes a documented JSON API. See **[docs/api.md](api.md)**.

---

## Prerequisites

- **Docker Desktop** (or Docker Engine + Compose v2)
- **A GitHub OAuth App** (required for starring repos and viewing release notes)

Node.js 22+ and npm 10+ are only needed if you plan to run locally without Docker.

---

## GitHub OAuth App Setup

1. Go to **GitHub > Settings > Developer settings > OAuth Apps > New OAuth App**
   (https://github.com/settings/applications/new)

2. Fill in the form:

   | Field                        | Value                                      |
   | ---------------------------- | ------------------------------------------ |
   | Application name             | e.g. **Trending Explorer (local)** (GitHub disallows names starting with `GitHub` or `Gist`) |
   | Homepage URL                 | `http://localhost:4200`                     |
   | Authorization callback URL   | `http://localhost:3000/api/auth/callback`   |

3. Click **Register application**

4. Copy the **Client ID**

5. Click **Generate a new client secret** and copy it immediately

6. You'll use both values in the `.env` file below

### Required OAuth Scopes

The app requests these scopes during login:

- `read:user` -- read your GitHub profile
- `public_repo` -- star/unstar public repositories on your behalf

### When is auth required?

- **Browsing trending repos**: No login needed
- **Starring repos / viewing release notes**: GitHub login required
- **README preview**: Works anonymously (higher rate limits when logged in)
- **Star history sparklines, weekly digest (bell), server-synced filter presets**: GitHub login required (anonymous presets are stored in the browser only)

---

## Environment Variables

| Variable              | Description                                    | Example                                                    |
| --------------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| `GITHUB_CLIENT_ID`    | OAuth App Client ID                            | `Iv1.abc123`                                               |
| `GITHUB_CLIENT_SECRET`| OAuth App Client Secret                        | `secret_xyz`                                               |
| `SESSION_SECRET`      | Signs the httpOnly session cookie              | Any random string (32+ chars)                              |
| `ENCRYPTION_KEY`      | Encrypts stored GitHub tokens (32 bytes hex)   | `openssl rand -hex 32`                                     |
| `DATABASE_URL`        | PostgreSQL connection string                   | `postgresql://trending:trending_pass@postgres:5432/github_trending` |
| `NEXT_PUBLIC_APP_URL` | Frontend URL (for OAuth redirects)             | `http://localhost:4200`                                    |
| `BACKEND_URL`         | Backend URL (for OAuth redirects)              | `http://localhost:3000`                                    |

---

## Run with Docker (Recommended)

```bash
# 1. Copy the example env file
cp .env.example .env

# 2. Fill in your GitHub OAuth credentials and generate secrets
#    Edit .env and set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET
#    Generate secrets:
openssl rand -hex 32  # use output for ENCRYPTION_KEY
openssl rand -base64 32  # use output for SESSION_SECRET

# 3. Build and start all services
docker compose up --build

# 4. Open the app
open http://localhost:4200
```

### What happens on first startup

The backend container automatically creates all database tables when it starts.
It runs `prisma db push` against the PostgreSQL container, which reads the
Prisma schema and creates the `User`, `Session`, `FollowedRepo`, and
`ReleaseCache` tables if they don't exist. No manual migration step is needed
for Docker.

### Verify everything is running

- **Frontend**: http://localhost:4200 should show the trending page
- **Backend health**: http://localhost:3000/api/auth/me should return `{ "user": null }`
- **Database**: `docker compose exec postgres psql -U trending -d github_trending -c '\dt'` should list tables (`User`, `Session`, `FollowedRepo`, `ReleaseCache`)

### Stop

```bash
docker compose down          # stop services
docker compose down -v       # stop and delete database volume
```

---

## First Login Flow

1. Open http://localhost:4200 -- browse trending repos anonymously
2. Click the **star** button on any repo, or navigate to the **Starred** tab
3. You'll be prompted to **Sign in with GitHub**
4. Authorize the app on GitHub
5. You'll be redirected back to where you were
6. Star repos freely -- they sync to your GitHub account
7. Open the **Starred** tab > **Release Notes** to see new releases

---

## Local Development (without Docker)

```bash
# 1. Copy and configure .env (do this first so DATABASE_URL is available)
cp .env.example .env
# Edit .env: set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_SECRET, ENCRYPTION_KEY
# Make sure DATABASE_URL points to localhost:
#   DATABASE_URL=postgresql://trending:trending_pass@localhost:5432/github_trending

# 2. Start only the database via Docker
docker compose up postgres -d

# 3. Install dependencies
npm install

# 4. Generate Prisma client and create database tables
npx prisma generate --schema=apps/backend/prisma/schema.prisma
npx prisma db push --schema=apps/backend/prisma/schema.prisma

# 5. Start both apps
npx nx run-many -t serve -p frontend backend
```

Step 4 creates all tables (`User`, `Session`, `FollowedRepo`, `ReleaseCache`)
in the local PostgreSQL database. You only need to run it once, or again if you
change the Prisma schema.

The Angular dev server (port 4200) uses `proxy.conf.json` to forward `/api/*` to the Next.js server (port 3000).

---

## Troubleshooting

### OAuth callback URL mismatch

Ensure the callback URL in your GitHub OAuth App settings exactly matches:
`http://localhost:3000/api/auth/callback`

### Missing environment variables

The backend will fail to start if `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SESSION_SECRET`, or `ENCRYPTION_KEY` are missing. Check your `.env` file.

### GitHub rate limiting

- **Without login**: 60 API requests/hour (shared across all users)
- **With login**: 5,000 requests/hour per user
- Trending results are cached server-side for 15 minutes to reduce API usage

### Database connection issues

```bash
# Check if postgres is running
docker compose ps

# View postgres logs
docker compose logs postgres

# Reset the database
docker compose down -v && docker compose up --build
```
