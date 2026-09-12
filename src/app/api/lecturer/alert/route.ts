import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';
import { dispatchClassAlert, type AlertType } from '../../../../lib/alerts';
import { normalizeSemester } from '../../../../lib/timetable';
import { applyReschedule } from '../../../../lib/reschedule';
import LecturerModel from '../../../../models/lecturer';
import TimetableModel from '../../../../models/timetable';

export const dynamic = 'force-dynamic';

const VALID_TYPES: AlertType[] = ['cancellation', 'change'];

/**
 * Let a lecturer raise a change/cancellation alert for one of their OWN
 * classes. Notifies the class's students (matched on program + level) and
 * records the alert against this lecturer.
 *
 * Body: { className, semester?, level?, course?, day?, time?, type, message?,
 *         moveTo? }
 *   A cancellation is a one-off notice that the lecturer's course won't hold
 *   (optionally on a specific day). Nothing is removed from the timetable — the
 *   recurring session stays and runs again at its next slot.
 *
 *   A 'change' carrying `moveTo` is a one-off move: the class runs elsewhere
 *   this week and returns to its timetabled slot next week. The timetable is
 *   deliberately left alone — rewriting the schedule every cohort reads is an
 *   administrative act — so the move lives on the alert, and the reminder
 *   pipeline withholds the old slot's reminder and raises one for the new slot,
 *   exactly as it does for a cancellation.
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

    const { className, semester, level, course, day, time, type, message, moveTo } =
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

    // A lecturer's reschedule is always one-off: the class is away for this week
    // and back at its timetabled slot next week. `applyReschedule` re-checks the
    // destination against the same free-slot rules the dialog listed, so a stale
    // list cannot put two classes in one room.
    let move = null;
    const wantsMove =
      alertType === 'change' && moveTo?.day && moveTo?.time && course && day && time;
    if (wantsMove) {
      const outcome = await applyReschedule(
        {
          className,
          level: lvl,
          course,
          day,
          time,
          semester: canonicalSemester,
        },
        { day: moveTo.day, time: moveTo.time, room: moveTo.room },
        { oneOff: true }
      );
      if (!outcome.ok) {
        return NextResponse.json(
          {
            success: false,
            message:
              outcome.reason === 'occupied'
                ? 'That slot has just been taken. Refresh the free slots and pick another.'
                : 'That session is no longer on the timetable.',
          },
          { status: 409 }
        );
      }
      move = outcome;
    }

    // Same timing rule as a cancellation's: if this class's reminder has already
    // gone out, the students hold details that are now wrong and must be texted
    // now. If it has not, the reminder pipeline will withhold the old slot's
    // reminder and send one for the new slot instead, carrying the change.
    const timing = move?.timing ?? { now: true, reason: 'reminder_will_carry' as const };

    // A cancellation is a one-off notice — nothing is removed from the
    // timetable; the recurring session stays and runs again at its next slot.
    const result = await dispatchClassAlert({
      className,
      level: lvl,
      semester: canonicalSemester,
      course,
      day: move?.from?.day ?? day,
      time,
      type: alertType,
      message,
      lecturerNames: [lecturerName],
      from: move?.from ?? null,
      to: move?.to ?? null,
      oneOff: Boolean(move),
      deferSms: Boolean(move) && !timing.now,
      smsNote: timing.reason,
    });

    const movedTo = move?.to
      ? `${move.to.day} ${move.to.time}${move.to.room ? ` in ${move.to.room}` : ''}`
      : '';

    return NextResponse.json({
      success: true,
      message:
        alertType === 'cancellation'
          ? `${course || className} cancellation notice sent to students.`
          : move
          ? `${course} moved to ${movedTo} for this week. ${
              timing.now
                ? 'Students notified now.'
                : 'The class reminder will carry the new details.'
            }`
          : `Alert sent for ${className}.`,
      sms: result.sms,
      smsDeferred: Boolean(move) && !timing.now,
      smsTiming: timing.reason,
      moved: move ? { from: move.from, to: move.to, oneOff: true } : null,
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
