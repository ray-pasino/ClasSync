import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { dispatchClassAlert, type AlertType } from '../../../../lib/alerts';
import { normalizeSemester } from '../../../../lib/timetable';
import TimetableModel from '../../../../models/timetable';

export const dynamic = 'force-dynamic';

const VALID_TYPES: AlertType[] = ['cancellation', 'change', 'info'];

/**
 * Raise a change/cancellation alert for a class. Notifies the class's students
 * (matched on program + level) and its lecturers by SMS, and records the alert
 * so it appears in their in-app feeds.
 *
 * Body: { className, semester?, type, message? }
 *   type 'cancellation' also removes the class's sessions from the timetable;
 *   'change' / 'info' are announcements only.
 */
export async function POST(request: Request) {
  try {
    await connectDB();
    const { className, semester, level, type, message } = await request.json();

    if (!className || typeof className !== 'string') {
      return NextResponse.json(
        { success: false, message: 'A class is required.' },
        { status: 400 }
      );
    }
    const alertType: AlertType = VALID_TYPES.includes(type) ? type : 'info';
    const canonicalSemester = semester ? normalizeSemester(semester) : undefined;
    const lvl = level != null && level !== '' ? Number(level) : undefined;

    // Resolve the cohort's lecturers from the current timetable *before* any
    // cancellation removes those sessions.
    const docs = await TimetableModel.find({}).exec();
    const lecturerNames = Array.from(
      new Set(
        docs
          .flatMap((d: any) => d.timetable || [])
          .filter(
            (s: any) =>
              s?.className === className &&
              (!canonicalSemester || s?.Semester === canonicalSemester) &&
              (lvl == null || Number(s?.level) === lvl)
          )
          .map((s: any) => s?.lecturer)
          .filter(Boolean)
      )
    ) as string[];

    // A cancellation pulls the cohort's sessions off the timetable so it also
    // disappears from everyone's view, not just sends a message.
    if (alertType === 'cancellation') {
      const match: Record<string, any> = { className };
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
      lecturerNames,
    });

    return NextResponse.json({
      success: true,
      message:
        alertType === 'cancellation'
          ? `${className} cancelled and everyone affected was notified.`
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
