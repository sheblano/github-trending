import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { listTimelineEvents } from '@github-trending/server/timeline';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get('repo') || undefined;
  const eventType = searchParams.get('eventType') || undefined;
  const sinceParam = searchParams.get('since');
  const limitParam = searchParams.get('limit');
  const since = sinceParam ? new Date(sinceParam) : undefined;
  const limit = limitParam ? parseInt(limitParam, 10) : 100;

  if (sinceParam && since && Number.isNaN(since.getTime())) {
    return NextResponse.json({ message: 'Invalid since date' }, { status: 400 });
  }

  const rows = await listTimelineEvents(prisma, {
    repo,
    eventType,
    since: since && !Number.isNaN(since.getTime()) ? since : undefined,
    limit,
  });

  const events = rows.map((e) => ({
    id: e.id,
    githubRepoId: e.githubRepoId,
    owner: e.owner,
    name: e.name,
    fullName: e.fullName,
    eventType: e.eventType,
    title: e.title,
    description: e.description,
    url: e.url,
    eventAt: e.eventAt.toISOString(),
    meta: e.meta as Record<string, unknown> | null,
  }));

  return NextResponse.json({ events });
}
