import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/session';
import { processFeed } from '@/lib/rss-parser';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('session-token')?.value;
  const user = token ? await validateSession(token) : null;
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const { feedUrl } = await request.json();
  if (!feedUrl) {
    return NextResponse.json({ success: false, error: 'Missing feedUrl' }, { status: 400 });
  }

  try {
    const result = await processFeed(feedUrl, user.id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: result.message, feedId: result.feedId });
  } catch (err: any) {
    console.error('Subscribe error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to subscribe' }, { status: 500 });
  }
}
