import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { getSessionUserId, decrypt } from '@github-trending/server/auth';
import { unstarRepo } from '@github-trending/server/github-client';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ owner: string; name: string }> }
) {
  const userId = await getSessionUserId(prisma);
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { owner, name } = await params;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  const token = decrypt(user.accessTokenEnc);
  await unstarRepo(owner, name, token);

  await prisma.followedRepo.deleteMany({
    where: { userId, owner, name },
  });

  return NextResponse.json({ ok: true });
}
