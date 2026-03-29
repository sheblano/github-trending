import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSessionUserId } from '@github-trending/server/auth';

export async function GET() {
  const userId = await getSessionUserId(prisma);
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const rows = await prisma.filterPreset.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    presets: rows.map((r) => ({
      id: r.id,
      name: r.name,
      filters: r.filters,
    })),
  });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId(prisma);
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    filters?: Record<string, unknown>;
  };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ message: 'Name is required' }, { status: 400 });
  }
  if (!body.filters || typeof body.filters !== 'object') {
    return NextResponse.json({ message: 'filters is required' }, { status: 400 });
  }

  try {
    const preset = await prisma.filterPreset.create({
      data: {
        userId,
        name,
        filters: body.filters as object,
      },
    });
    return NextResponse.json({
      preset: {
        id: preset.id,
        name: preset.name,
        filters: preset.filters,
      },
    });
  } catch {
    return NextResponse.json(
      { message: 'A preset with this name already exists' },
      { status: 409 }
    );
  }
}
