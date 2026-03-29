import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import {
  generateAgentTokenPlain,
  getSessionUserId,
  hashApiTokenPlain,
} from '@github-trending/server/auth';

/** List or create agent tokens (browser session only, not Bearer). */
export async function GET() {
  const userId = await getSessionUserId(prisma);
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const rows = await prisma.apiAccessToken.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      label: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });

  return NextResponse.json({ tokens: rows });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId(prisma);
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let label: string | null = null;
  try {
    const body = (await request.json()) as { label?: string };
    if (typeof body.label === 'string' && body.label.trim()) {
      label = body.label.trim().slice(0, 120);
    }
  } catch {
    // empty body ok
  }

  const plain = generateAgentTokenPlain();
  const tokenHash = hashApiTokenPlain(plain);

  const row = await prisma.apiAccessToken.create({
    data: {
      userId,
      tokenHash,
      label,
    },
    select: { id: true, label: true, createdAt: true },
  });

  return NextResponse.json({
    token: plain,
    id: row.id,
    label: row.label,
    createdAt: row.createdAt.toISOString(),
  });
}
