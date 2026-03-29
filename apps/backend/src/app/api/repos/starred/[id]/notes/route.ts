import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { getAuthenticatedUserId } from '@github-trending/server/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId(prisma);
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const repoId = parseInt(id, 10);
  const body = (await request.json()) as { notes: string | null };

  const repo = await prisma.followedRepo.findFirst({
    where: { id: repoId, userId },
  });

  if (!repo) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  const updated = await prisma.followedRepo.update({
    where: { id: repoId },
    data: { notes: body.notes },
  });

  return NextResponse.json({ repo: updated });
}
