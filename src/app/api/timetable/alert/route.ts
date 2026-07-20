import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { dispatchClassAlert, type AlertType } from '../../../../lib/alerts';
import { normalizeSemester } from '../../../../lib/timetable';
import TimetableModel from '../../../../models/timetable';

export const dynamic = 'force-dynamic';

const VALID_TYPES: AlertType[] = ['cancellation', 'change', 'info'];

/**
 * Raise a change/cancellation alert for a class. Notifies the class's students
 * (matched on program + level) and the affected lecturer by SMS, and records
 * the alert so it appears in their in-app feeds.
 *
 * Body: { className, semester?, level?, course?, day?, time?, type, message? }
 *   A cancellation is a one-off notice that a course won't hold (optionally on a
 *   specific day). Nothing is removed from the timetable — the recurring session
 *   stays and runs again at its next slot. 'change' / 'info' are announcements.
 */
export async function POST(request: Request) {
  try {
    await connectDB();
    const { className, semester, level, course, day, time, type, message } =
      await request.json();

    if (!className || typeof className !== 'string') {
      return NextResponse.json(
        { success: false, message: 'A class is required.' },
        { status: 400 }
      );
    }
    const alertType: AlertType = VALID_TYPES.includes(type) ? type : 'info';
    const canonicalSemester = semester ? normalizeSemester(semester) : undefined;
    const lvl = level != null && level !== '' ? Number(level) : undefined;

    // Resolve the affected lecturers from the current timetable. When a course
    // (and day) is given, scope to just that session's lecturer. A cancellation
    // never removes anything — the recurring session stays and runs again at its
    // next slot; this only notifies and records the notice.
    const docs = await TimetableModel.find({}).exec();
    const lecturerNames = Array.from(
      new Set(
        docs
          .flatMap((d: any) => d.timetable || [])
          .filter(
            (s: any) =>
              s?.className === className &&
              (!canonicalSemester || s?.Semester === canonicalSemester) &&
              (lvl == null || Number(s?.level) === lvl) &&
              (!course || s?.course === course) &&
              (!day || s?.day === day)
          )
          .map((s: any) => s?.lecturer)
          .filter(Boolean)
      )
    ) as string[];

    const result = await dispatchClassAlert({
      className,
      level: lvl,
      semester: canonicalSemester,
      course,
      day,
      time,
      type: alertType,
      message,
      lecturerNames,
    });

    return NextResponse.json({
      success: true,
      message:
        alertType === 'cancellation'
          ? `${course || className} cancellation notice sent.`
          : `Alert sent for ${className}.`,
      sms: result.sms,
      recipients: result.recipients,
      alertId: result.alert._id,
    });
  } catch (error) {
    console.error('Error raising class alert:', error);
    return NextResponse.json(
      { success: false, message: 'Error raising class alert' },
      { status: 500 }
    );
  }
}
