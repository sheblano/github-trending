# OpenClaw example (template)

This folder contains a **template** skill you can copy into your OpenClaw workspace. It is **not** loaded automatically by this repo — it is documentation + a starting point.

It also includes an example MCP server file, `mcp-server.ts`, if you want to expose the same API to Claude Desktop or another MCP-compatible client.

## Setup

1. Run the GitHub Trending Explorer backend (see root [README](../../README.md)). Note your API base URL, e.g. `http://localhost:3000` or your deployed `BACKEND_URL`.

2. Sign in via the web UI (GitHub OAuth).

3. Create an agent token (browser session required):

   ```bash
   curl -sS -X POST "$BACKEND_URL/api/agent-tokens" \
     -H "Content-Type: application/json" \
     -H "Cookie: session_id=YOUR_SESSION_ID" \
     -d '{"label":"OpenClaw"}'
   ```

   Or use your browser’s dev tools to copy the `session_id` cookie for a one-off `curl`. Save the returned `token` securely.

4. Copy `SKILL.md` into your OpenClaw skills directory, for example:

   `~/.openclaw/workspace/skills/github-trending/SKILL.md`

5. Configure environment variables for OpenClaw (exact mechanism depends on your OpenClaw version):

   - `TRENDING_API_URL`: backend base URL (no trailing slash), e.g. `http://localhost:3000`
   - `TRENDING_AGENT_TOKEN`: optional; required only for personalized endpoints (`/api/digest`, `/api/releases`, etc.)

## MCP example

`mcp-server.ts` is a tiny TypeScript example using `@modelcontextprotocol/sdk` that exposes:

- `get_trending`
- `get_timeline`
- `get_digest`

Set the same environment variables:

- `TRENDING_API_URL`
- `TRENDING_AGENT_TOKEN` (optional; needed for `get_digest`)

Run it with a tool like `tsx`:

```bash
npx tsx docs/examples/openclaw/mcp-server.ts
```

## Security

- Treat `TRENDING_AGENT_TOKEN` like a password. Rotate with `DELETE /api/agent-tokens/{id}` if leaked.
- This template avoids embedding real secrets in the repo.

## More detail

See [API reference](../../api.md).
