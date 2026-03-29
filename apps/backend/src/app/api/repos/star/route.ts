import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getSessionUserId, decrypt } from '@github-trending/server/auth';
import { starRepo } from '@github-trending/server/github-client';
import type { StarRequest } from '@github-trending/shared/models';

export async function POST(request: Request) {
  const userId = await getSessionUserId(prisma);
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as StarRequest;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  const token = decrypt(user.accessTokenEnc);
  await starRepo(body.owner, body.name, token);

  const followed = await prisma.followedRepo.upsert({
    where: {
      userId_githubRepoId: { userId, githubRepoId: body.repoId },
    },
    create: {
      userId,
      githubRepoId: body.repoId,
      owner: body.owner,
      name: body.name,
      fullName: body.fullName,
      description: body.description,
      language: body.language,
      starsCount: body.starsCount,
      url: body.url,
    },
    update: {
      description: body.description,
      language: body.language,
      starsCount: body.starsCount,
    },
  });

  return NextResponse.json({ followed });
}
