import { NextResponse } from 'next/server';

/**
 * Block requests that don't carry the x-profile-ui header.
 * This is the hard guarantee that CLI / agent-driven HTTP calls
 * cannot read or write personal profile data from the API.
 * Only the web UI (which adds this header in its fetch wrappers)
 * can access profile data endpoints.
 */
export function requireUiClient(request: Request): { ok: boolean; response?: NextResponse } {
  if (request.headers.get('x-profile-ui') !== '1') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Personal profile data is only accessible from the JadeAI web UI' },
        { status: 403 },
      ),
    };
  }
  return { ok: true };
}
