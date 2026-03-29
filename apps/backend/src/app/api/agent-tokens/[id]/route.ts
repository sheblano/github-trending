import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getSessionUserId } from '@github-trending/server/auth';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId(prisma);
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.apiAccessToken.findFirst({
    where: { id, userId, revokedAt: null },
  });
  if (!existing) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  await prisma.apiAccessToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
