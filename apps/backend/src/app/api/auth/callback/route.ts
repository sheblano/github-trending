import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import {
  exchangeCodeForToken,
  getGitHubUser,
} from '@github-trending/server/github-client';
import {
  encrypt,
  createSession,
  setSessionCookieOnResponse,
} from '@github-trending/server/auth';

export async function GET(request: Request) {
  console.log('[AUTH] GET /api/auth/callback hit');
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');

  if (!code) {
    console.error('[AUTH] Callback missing code parameter');
    return NextResponse.json({ message: 'Missing code' }, { status: 400 });
  }

  let returnUrl = '/trending';
  if (stateParam) {
    try {
      const decoded = JSON.parse(
        Buffer.from(stateParam, 'base64url').toString()
      );
      returnUrl = decoded.returnUrl || '/trending';
    } catch {
      // ignore invalid state
    }
  }

  const clientId = process.env['GITHUB_CLIENT_ID']!;
  const clientSecret = process.env['GITHUB_CLIENT_SECRET']!;

  try {
    const backendUrl = process.env['BACKEND_URL'] || 'http://localhost:3000';
    const redirectUri = `${backendUrl}/api/auth/callback`;
    const accessToken = await exchangeCodeForToken(code, clientId, clientSecret, redirectUri);
    const ghUser = await getGitHubUser(accessToken);

    const user = await prisma.user.upsert({
      where: { githubId: ghUser.id },
      create: {
        githubId: ghUser.id,
        username: ghUser.login,
        avatarUrl: ghUser.avatar_url,
        accessTokenEnc: encrypt(accessToken),
      },
      update: {
        username: ghUser.login,
        avatarUrl: ghUser.avatar_url,
        accessTokenEnc: encrypt(accessToken),
      },
    });

    const sessionId = await createSession(prisma, user.id);

    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:4200';
    const redirectTo = `${appUrl}${returnUrl}`;
    console.log('[AUTH] Login successful for user:', ghUser.login, '→ redirecting to:', redirectTo);
    const response = NextResponse.redirect(redirectTo);
    setSessionCookieOnResponse(response, sessionId);
    return response;
  } catch (err) {
    console.error('[AUTH] OAuth callback error:', err);
    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:4200';
    return NextResponse.redirect(
      `${appUrl}/login?error=auth_failed`
    );
  }
}
