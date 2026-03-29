import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { invalidateSession } from '@github-trending/server/auth';

export async function POST() {
  await invalidateSession(prisma);
  return NextResponse.json({ ok: true });
}
