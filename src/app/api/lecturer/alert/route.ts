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
 * Body: { className, semester?, type, message? }
 *   'cancellation' removes only THIS lecturer's sessions for the class (not the
 *   whole cohort's), so other lecturers' sessions on the same class stay put.
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

    const { className, semester, level, type, message } = await request.json();
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

    // Authorisation: the lecturer must actually teach this cohort on the current
    // timetable, or they can't raise an alert for it.
    const docs = await TimetableModel.find({}).exec();
    const teachesClass = docs
      .flatMap((d: any) => d.timetable || [])
      .some(
        (s: any) =>
          s?.className === className &&
          s?.lecturer === lecturerName &&
          (!canonicalSemester || s?.Semester === canonicalSemester) &&
          (lvl == null || Number(s?.level) === lvl)
      );
    if (!teachesClass) {
      return NextResponse.json(
        { success: false, message: 'You do not teach this class.' },
        { status: 403 }
      );
    }

    // A cancellation pulls only THIS lecturer's sessions for the cohort, leaving
    // any other lecturers' sessions on the same cohort intact.
    if (alertType === 'cancellation') {
      const match: Record<string, any> = { className, lecturer: lecturerName };
      if (canonicalSemester) match.Semester = canonicalSemester;
      if (lvl != null) match.level = lvl;
      await TimetableModel.updateMany({}, { $pull: { timetable: match } });
      await TimetableModel.deleteMany({ timetable: { $size: 0 } });
    }

    const result = await dispatchClassAlert({
      className,
      level: lvl,
      semester: canonicalSemester,
      type: alertType,
      message,
      lecturerNames: [lecturerName],
    });

    return NextResponse.json({
      success: true,
      message:
        alertType === 'cancellation'
          ? `Your ${className} sessions were cancelled and students notified.`
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
