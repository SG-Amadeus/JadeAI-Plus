import { NextRequest, NextResponse } from 'next/server';
import { profileRepository } from '@/lib/db/repositories/profile.repository';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';

/**
 * Returns codenames only — no profile data.
 * This is the only profile endpoint that does NOT require the x-profile-ui header,
 * so CLI / agent-driven calls can list codenames for use with --profile flag.
 */
export async function GET(request: NextRequest) {
  try {
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const codenames = await profileRepository.findCodenamesByUserId(user.id);
    return NextResponse.json(codenames);
  } catch (error) {
    console.error('GET /api/profile/codenames error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
