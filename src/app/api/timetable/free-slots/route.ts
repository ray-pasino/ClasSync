import { NextResponse } from 'next/server';
import { loadFreeSlots } from '../../../../lib/freeSlots';
import { errorResponse } from '../../../../lib/apiError';

export const dynamic = 'force-dynamic';

/**
 * Where could one session move to?
 *
 * Query: ?className=&level=&course=&day=&time=&semester=
 *   identifying the session the administrator is proposing to reschedule.
 *
 * Returns the day/time slots with at least one usable room, and the session's
 * current placement for reference. Read-only — nothing is changed until the
 * change alert itself is sent.
 */
export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams;
    const className = q.get('className')?.trim();
    const course = q.get('course')?.trim();
    const day = q.get('day')?.trim();
    const time = q.get('time')?.trim();

    if (!className || !course || !day || !time) {
      return NextResponse.json(
        {
          success: false,
          message: 'A class, course, day and time are required.',
        },
        { status: 400 }
      );
    }

    const levelRaw = q.get('level');
    const { slots, current } = await loadFreeSlots({
      className,
      course,
      day,
      time,
      level:
        levelRaw != null && levelRaw !== '' ? Number(levelRaw) : undefined,
      semester: q.get('semester')?.trim() || undefined,
    });

    return NextResponse.json({ success: true, data: { slots, current } });
  } catch (error) {
    return errorResponse('Free slot lookup failed', error);
  }
}
