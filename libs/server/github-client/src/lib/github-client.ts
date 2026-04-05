import { RepoSearchResult, GitHubRepo } from '@github-trending/shared/models';

const GITHUB_API = 'https://api.github.com';

interface FetchOptions {
  token?: string;
  etag?: string | null;
}

interface GitHubResponse<T> {
  data: T;
  etag: string | null;
  notModified: boolean;
}

async function githubFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<GitHubResponse<T>> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  if (options.etag) {
    headers['If-None-Match'] = options.etag;
  }

  const res = await fetch(`${GITHUB_API}${path}`, { headers });

  if (res.status === 304) {
    return { data: null as T, etag: options.etag ?? null, notModified: true };
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }

  const data = (await res.json()) as T;
  return {
    data,
    etag: res.headers.get('etag'),
    notModified: false,
  };
}

export async function searchRepositories(params: {
  query: string;
  sort: string;
  order: string;
  page: number;
  perPage: number;
  token?: string;
}): Promise<RepoSearchResult> {
  const qs = new URLSearchParams({
    q: params.query,
    sort: params.sort,
    order: params.order,
    page: String(params.page),
    per_page: String(params.perPage),
  });

  const { data } = await githubFetch<RepoSearchResult>(
    `/search/repositories?${qs}`,
    { token: params.token }
  );
  return data;
}

export async function starRepo(
  owner: string,
  name: string,
  token: string
): Promise<void> {
  const res = await fetch(`${GITHUB_API}/user/starred/${owner}/${name}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Length': '0',
    },
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to star ${owner}/${name}: ${res.status}`);
  }
}

export async function unstarRepo(
  owner: string,
  name: string,
  token: string
): Promise<void> {
  const res = await fetch(`${GITHUB_API}/user/starred/${owner}/${name}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to unstar ${owner}/${name}: ${res.status}`);
  }
}

export async function getUserStarredRepos(
  token: string,
  page = 1,
  perPage = 100
): Promise<GitHubRepo[]> {
  const qs = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    sort: 'created',
    direction: 'desc',
  });
  const { data } = await githubFetch<GitHubRepo[]>(
    `/user/starred?${qs}`,
    { token }
  );
  return data;
}

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  published_at: string | null;
  html_url: string;
}

export async function getRepoReleases(
  owner: string,
  name: string,
  options: FetchOptions = {}
): Promise<GitHubResponse<GitHubRelease[]>> {
  return githubFetch<GitHubRelease[]>(
    `/repos/${owner}/${name}/releases?per_page=10`,
    options
  );
}

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
}

export async function getGitHubUser(token: string): Promise<GitHubUser> {
  const { data } = await githubFetch<GitHubUser>('/user', { token });
  return data;
}

/** README rendered as HTML (GitHub-flavored markdown). */
export async function getRepoReadmeHtml(
  owner: string,
  name: string,
  token?: string
): Promise<string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.html+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/readme`,
    { headers }
  );
  if (res.status === 404) {
    return '';
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub README ${res.status}: ${body}`);
  }
  return await res.text();
}

export interface StargazerEntry {
  starred_at: string;
  user: { login: string };
}

export async function getStargazersPage(
  owner: string,
  name: string,
  page: number,
  perPage: number,
  token?: string
): Promise<StargazerEntry[]> {
  const qs = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3.star+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/stargazers?${qs}`,
    { headers }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub stargazers ${res.status}: ${body}`);
  }
  return (await res.json()) as StargazerEntry[];
}

export async function getRepoPublicInfo(
  owner: string,
  name: string,
  token?: string
): Promise<{ stargazers_count: number }> {
  const { data } = await githubFetch<{ stargazers_count: number }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
    { token }
  );
  return data;
}

export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri?: string
): Promise<string> {
  const body: Record<string, string> = {
    client_id: clientId,
    client_secret: clientSecret,
    code,
  };
  if (redirectUri) {
    body['redirect_uri'] = redirectUri;
  }

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (data.error || !data.access_token) {
    throw new Error(
      `OAuth token exchange failed: ${data.error || 'no token'}${data.error_description ? ` - ${data.error_description}` : ''}`
    );
  }
  return data.access_token;
}
