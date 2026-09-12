import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { dispatchClassAlert, type AlertType } from '../../../../lib/alerts';
import { normalizeSemester } from '../../../../lib/timetable';
import { applyReschedule } from '../../../../lib/reschedule';
import TimetableModel from '../../../../models/timetable';

export const dynamic = 'force-dynamic';

const VALID_TYPES: AlertType[] = ['cancellation', 'change', 'info'];

/**
 * Raise a change/cancellation alert for a class. Notifies the class's students
 * (matched on program + level) and the affected lecturer by SMS, and records
 * the alert so it appears in their in-app feeds.
 *
 * Body: { className, semester?, level?, course?, day?, time?, type, message?,
 *         moveTo? }
 *   A cancellation is a one-off notice that a course won't hold (optionally on a
 *   specific day). Nothing is removed from the timetable — the recurring session
 *   stays and runs again at its next slot, and only that occurrence's reminder
 *   is withheld.
 *
 *   A 'change' carrying `moveTo` actually reschedules the session: the named
 *   day/time session is moved to the new day/time/room on the saved timetable,
 *   so every portal and the class reminder read the new placement from then on.
 *   Whether the SMS goes out now or rides on the reminder is decided by
 *   lib/reschedule — see the comment at the dispatch below. Without `moveTo` a
 *   'change' is an announcement only, as before. 'info' is always an
 *   announcement.
 */
export async function POST(request: Request) {
  try {
    await connectDB();
    const {
      className,
      semester,
      level,
      course,
      day,
      time,
      type,
      message,
      moveTo,
      oneOff,
    } = await request.json();

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

    // A permanent reschedule moves the session before anyone is told, so the
    // timetable the portals (and the reminder) read is already correct by the
    // time the alert lands. A one-off leaves the timetable alone and is carried
    // entirely by the reminder pipeline. Either way the destination is
    // re-validated server-side.
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
        { oneOff: Boolean(oneOff) }
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

    // Timing rule: if the cohort has already had this class's reminder, they
    // are holding details that are now wrong, so the change goes out by SMS
    // immediately. If the reminder has not run yet it will carry the new day,
    // time and room itself — so no SMS here, and no duplicate message.
    const timing = move?.timing ?? { now: true, reason: 'reminder_will_carry' as const };

    const result = await dispatchClassAlert({
      className,
      level: lvl,
      semester: canonicalSemester,
      course,
      // Record the alert against the day the change concerns: where the session
      // was, since that is the occurrence students were originally told about.
      day: move?.from?.day ?? day,
      time,
      type: alertType,
      message,
      lecturerNames,
      from: move?.from ?? null,
      to: move?.to ?? null,
      oneOff: Boolean(move?.oneOff),
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
          ? `${course || className} cancellation notice sent.`
          : move
          ? `${course} moved to ${movedTo}${move.oneOff ? ' for this week' : ''}. ${
              timing.now
                ? 'Students and lecturer notified now.'
                : 'The class reminder will carry the new details.'
            }`
          : `Alert sent for ${className}.`,
      sms: result.sms,
      smsDeferred: Boolean(move) && !timing.now,
      smsTiming: timing.reason,
      moved: move ? { from: move.from, to: move.to, oneOff: move.oneOff } : null,
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
