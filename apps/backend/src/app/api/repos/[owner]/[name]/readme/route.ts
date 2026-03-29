import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { getAuthenticatedUserId, decrypt } from '@github-trending/server/auth';
import { getRepoReadmeHtml } from '@github-trending/server/github-client';

const cache = new Map<string, { html: string; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; name: string }> }
) {
  const { owner, name } = await params;
  const key = `${owner.toLowerCase()}/${name.toLowerCase()}`;

  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ html: cached.html });
  }

  let token: string | undefined;
  const userId = await getAuthenticatedUserId(prisma);
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      token = decrypt(user.accessTokenEnc);
    }
  }

  try {
    const html = await getRepoReadmeHtml(owner, name, token);
    cache.set(key, { html, timestamp: Date.now() });
    return NextResponse.json({ html });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load README';
    return NextResponse.json({ html: '', message }, { status: 502 });
  }
}
