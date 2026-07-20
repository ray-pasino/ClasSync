import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';
import { dispatchClassAlert, type AlertType } from '../../../../lib/alerts';
import { normalizeSemester } from '../../../../lib/timetable';
import LecturerModel from '../../../../models/lecturer';
import TimetableModel from '../../../../models/timetable';

export const dynamic = 'force-dynamic';

const VALID_TYPES: AlertType[] = ['cancellation', 'change'];

/**
 * Let a lecturer raise a change/cancellation alert for one of their OWN
 * classes. Notifies the class's students (matched on program + level) and
 * records the alert against this lecturer.
 *
 * Body: { className, semester?, level?, course?, day?, time?, type, message? }
 *   A cancellation is a one-off notice that the lecturer's course won't hold
 *   (optionally on a specific day). Nothing is removed from the timetable — the
 *   recurring session stays and runs again at its next slot.
 */
export async function POST(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Authentication failed' }, { status: 401 });
  }
  try {
    await connectDB();
    const lecturer = await LecturerModel.findById(userId);
    if (!lecturer) {
      return NextResponse.json({ success: false, message: 'Lecturer not found' }, { status: 404 });
    }

    const { className, semester, level, course, day, time, type, message } =
      await request.json();
    if (!className || typeof className !== 'string') {
      return NextResponse.json(
        { success: false, message: 'A class is required.' },
        { status: 400 }
      );
    }
    const alertType: AlertType = VALID_TYPES.includes(type) ? type : 'change';
    const canonicalSemester = semester ? normalizeSemester(semester) : undefined;
    const lvl = level != null && level !== '' ? Number(level) : undefined;
    const lecturerName = lecturer.name;

    // Authorisation: the lecturer must actually teach this cohort (and the named
    // course, when given) on the current timetable.
    const docs = await TimetableModel.find({}).exec();
    const teachesClass = docs
      .flatMap((d: any) => d.timetable || [])
      .some(
        (s: any) =>
          s?.className === className &&
          s?.lecturer === lecturerName &&
          (!canonicalSemester || s?.Semester === canonicalSemester) &&
          (lvl == null || Number(s?.level) === lvl) &&
          (!course || s?.course === course)
      );
    if (!teachesClass) {
      return NextResponse.json(
        { success: false, message: 'You do not teach this class.' },
        { status: 403 }
      );
    }

    // A cancellation is a one-off notice — nothing is removed from the
    // timetable; the recurring session stays and runs again at its next slot.
    const result = await dispatchClassAlert({
      className,
      level: lvl,
      semester: canonicalSemester,
      course,
      day,
      time,
      type: alertType,
      message,
      lecturerNames: [lecturerName],
    });

    return NextResponse.json({
      success: true,
      message:
        alertType === 'cancellation'
          ? `${course || className} cancellation notice sent to students.`
          : `Alert sent for ${className}.`,
      sms: result.sms,
      recipients: result.recipients,
      alertId: result.alert._id,
    });
  } catch (error) {
    console.error('Error raising lecturer class alert:', error);
    return NextResponse.json(
      { success: false, message: 'Error raising class alert' },
      { status: 500 }
    );
  }
}
