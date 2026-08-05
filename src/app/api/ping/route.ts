import { NextRequest, NextResponse } from 'next/server';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';

export async function GET(request: NextRequest) {
  const fingerprint = getUserIdFromRequest(request);
  const user = await resolveUser(fingerprint);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    ok: true,
    version: '0.1.0',
    user: { id: user.id, name: user.name || null },
    timestamp: new Date().toISOString(),
  });
}
