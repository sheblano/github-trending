import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const BASE = process.env['TRENDING_API_URL'] || 'http://localhost:3000';
const AGENT_TOKEN = process.env['TRENDING_AGENT_TOKEN'];

const server = new McpServer({
  name: 'github-trending',
  version: '1.0.0',
});

async function getJson(path: string, authenticated = false): Promise<string> {
  const headers: Record<string, string> = {};
  if (authenticated && AGENT_TOKEN) {
    headers['Authorization'] = `Bearer ${AGENT_TOKEN}`;
  }

  const response = await fetch(`${BASE}${path}`, { headers });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  return text;
}

server.tool(
  'get_trending',
  'Fetch trending or radar repos with optional filters',
  {
    language: z.string().optional(),
    topics: z.string().optional(),
    dateRange: z.enum(['daily', 'weekly', 'monthly']).optional(),
    q: z.string().optional(),
    sort: z.enum(['stars', 'forks', 'updated']).optional(),
    order: z.enum(['asc', 'desc']).optional(),
    viewMode: z.enum(['default', 'radar']).optional(),
    page: z.number().int().positive().optional(),
    perPage: z.number().int().positive().max(100).optional(),
  },
  async ({ language, topics, dateRange, q, sort, order, viewMode, page, perPage }) => {
    const params = new URLSearchParams();
    if (language) params.set('language', language);
    if (topics) params.set('topics', topics);
    if (dateRange) params.set('dateRange', dateRange);
    if (q) params.set('q', q);
    if (sort) params.set('sort', sort);
    if (order) params.set('order', order);
    if (viewMode) params.set('viewMode', viewMode);
    if (page) params.set('page', String(page));
    if (perPage) params.set('perPage', String(perPage));

    const query = params.toString();
    const text = await getJson(`/api/repos/trending${query ? `?${query}` : ''}`);
    return { content: [{ type: 'text', text }] };
  }
);

server.tool(
  'get_timeline',
  'Fetch timeline events such as star spikes, releases, and radar entries',
  {
    eventType: z.string().optional(),
    repo: z.string().optional(),
    since: z.string().optional(),
    limit: z.number().int().positive().optional(),
  },
  async ({ eventType, repo, since, limit }) => {
    const params = new URLSearchParams();
    if (eventType) params.set('eventType', eventType);
    if (repo) params.set('repo', repo);
    if (since) params.set('since', since);
    if (limit) params.set('limit', String(limit));

    const query = params.toString();
    const text = await getJson(`/api/timeline${query ? `?${query}` : ''}`);
    return { content: [{ type: 'text', text }] };
  }
);

server.tool(
  'get_digest',
  'Fetch the personalized weekly digest (requires TRENDING_AGENT_TOKEN)',
  {},
  async () => {
    if (!AGENT_TOKEN) {
      throw new Error('TRENDING_AGENT_TOKEN is required for get_digest');
    }
    const text = await getJson('/api/digest', true);
    return { content: [{ type: 'text', text }] };
  }
);

