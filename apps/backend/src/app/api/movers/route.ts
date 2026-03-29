import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { aggregateTopMovers } from '@github-trending/server/timeline';

export async function GET() {
  const data = await aggregateTopMovers(prisma);
  return NextResponse.json(data);
}
