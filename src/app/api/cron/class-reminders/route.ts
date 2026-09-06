import { NextResponse } from 'next/server';
import { runClassReminders } from '../../../../lib/classReminders';
import { errorResponse } from '../../../../lib/apiError';

// This route sends real SMS and costs real money, so it must never run on an
// unauthenticated request. Whatever ends up triggering it — a Vercel cron, a
// node-cron process, cron-job.org — sends the shared secret.
//
//   Authorization: Bearer $CRON_SECRET       (Vercel cron sends this natively)
//   x-cron-secret: $CRON_SECRET              (simpler for external pingers)
//
// Add ?dryRun=1 to see who *would* be texted without sending or claiming
// anything — worth doing once before pointing a scheduler at it.
export const dynamic = 'force-dynamic';

// A run sends one SMS batch per due session, and several classes can start in
// the same slot. The platform default (10s on Vercel) is tight for that, and a
// timeout mid-run would leave sessions claimed in the reminder log but never
// sent. 60s is the Hobby-tier ceiling.
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Fail closed: with no secret configured the endpoint stays shut rather than
  // becoming an open SMS trigger.
  if (!secret) return false;

  const header = request.headers.get('authorization') ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  return bearer === secret || request.headers.get('x-cron-secret') === secret;
}

async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const params = new URL(request.url).searchParams;
    const dryRun = params.get('dryRun') === '1';

    // `at` lets you preview a different moment ("who would be texted at 10:35
    // on Wednesday?") without waiting for it. Dry-run only, so it can never be
    // used to force a real send at the wrong time.
    let now: Date | undefined;
    const at = params.get('at');
    if (at && dryRun) {
      const parsed = new Date(at);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { success: false, message: 'Invalid `at` timestamp' },
          { status: 400 }
        );
      }
      now = parsed;
    }

    const result = await runClassReminders({ dryRun, now });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return errorResponse('Class reminder run failed', error);
  }
}

// GET so a plain scheduler URL works; POST for triggers that insist on it.
export const GET = handle;
export const POST = handle;
