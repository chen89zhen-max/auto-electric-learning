import { NextRequest } from 'next/server';
import { POST as handleLegacyAuthPost } from '../route';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown>;
  const headers = new Headers(req.headers);
  headers.delete('content-length');

  const request = new NextRequest(req.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...body, action: 'login' }),
  });

  return handleLegacyAuthPost(request);
}
