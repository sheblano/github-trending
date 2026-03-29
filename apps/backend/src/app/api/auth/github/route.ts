import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log('[AUTH] GET /api/auth/github hit');
  const { searchParams } = new URL(request.url);
  const returnUrl = searchParams.get('returnUrl') || '/trending';

  const clientId = process.env['GITHUB_CLIENT_ID'];
  if (!clientId) {
    console.error('[AUTH] GITHUB_CLIENT_ID not configured');
    return NextResponse.json(
      { message: 'GITHUB_CLIENT_ID not configured' },
      { status: 500 }
    );
  }

  const callbackUrl = `${process.env['BACKEND_URL'] || 'http://localhost:3000'}/api/auth/callback`;
  const state = Buffer.from(JSON.stringify({ returnUrl })).toString('base64url');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: 'read:user public_repo',
    state,
  });

  const redirectUrl = `https://github.com/login/oauth/authorize?${params}`;
  console.log('[AUTH] Redirecting to GitHub OAuth, callback:', callbackUrl);
  return NextResponse.redirect(redirectUrl);
}
