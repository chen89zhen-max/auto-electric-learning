import { NextRequest } from 'next/server';
import { POST as handleLegacyAuthPost } from '../route';

export async function POST(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.delete('content-length');

  const request = new NextRequest(req.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'logout' }),
  });

  return handleLegacyAuthPost(request);
}
