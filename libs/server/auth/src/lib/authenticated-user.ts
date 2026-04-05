import { createHash, randomBytes } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import { headers } from 'next/headers';
import { getSessionUserId } from './session';

/** SHA-256 hex of the raw bearer secret (store only this in the database). */
export function hashApiTokenPlain(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex');
}

/** Opaque token shown once to the user; prefix helps identify leaks in logs. */
export function generateAgentTokenPlain(): string {
  return `gte_${randomBytes(32).toString('base64url')}`;
}

/**
 * Resolves the current user for API routes: browser session cookie first, then
 * `Authorization: Bearer <token>` for agent tokens created via POST /api/agent-tokens.
 */
export async function getAuthenticatedUserId(
  prisma: PrismaClient
): Promise<number | null> {
  const fromCookie = await getSessionUserId(prisma);
  if (fromCookie !== null) return fromCookie;

  const h = await headers();
  const auth = h.get('authorization');
  if (!auth?.toLowerCase().startsWith('bearer ')) return null;
  const plain = auth.slice(7).trim();
  if (!plain) return null;

  const tokenHash = hashApiTokenPlain(plain);
  const row = await prisma.apiAccessToken.findFirst({
    where: { tokenHash, revokedAt: null },
    select: { id: true, userId: true },
  });
  if (!row) return null;

  prisma.apiAccessToken
    .update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((err) =>
      console.error('[auth] failed to update token lastUsedAt:', err)
    );

  return row.userId;
}
