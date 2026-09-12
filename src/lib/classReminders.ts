import { connectDB } from './db';
import StudentModel from '../models/student';
import LecturerModel from '../models/lecturer';
import TimetableModel from '../models/timetable';
import ReminderLogModel from '../models/reminderLog';
import AlertModel from '../models/alert';
import { classMatchesStudent, cohortLabel, normalizeLabel } from './match';
import { normalizeSemester } from './timetable';
import { sendSms, sandboxEnabled } from './notifyStudents';

// Ghana keeps GMT+0 all year, so the default needs no DST handling — but read
// the zone from the environment anyway so a deployment in another region (or a
// laptop set to a different clock) still resolves "now" against campus time
// rather than the server's.
const TIME_ZONE = process.env.REMINDER_TIMEZONE || 'Africa/Accra';

// How long before a class starts its reminder goes out.
const DEFAULT_LEAD_MINUTES = 30;

export function leadMinutes(): number {
  const raw = Number(process.env.REMINDER_LEAD_MINUTES);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_LEAD_MINUTES;
}

/**
 * The current weekday, calendar date and minutes-since-midnight *at campus*,
 * regardless of where the server itself is running.
 */
export function zonedNow(now: Date = new Date(), timeZone: string = TIME_ZONE) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  ) as Record<string, string>;

  return {
    dayName: parts.weekday,
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    // hour12:false renders midnight as "24" in some ICU builds.
    minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute),
  };
}

/**
 * Minutes-since-midnight for the start of a stored slot. Sessions store a
 * range like "11:00 AM - 1:00 PM"; only the start matters here. A plain 24-hour
 * "13:00" is accepted too, since the time slots are admin-entered free text.
 * Returns null for anything unparseable so a malformed row is skipped rather
 * than mis-timed.
 */
export function parseStartMinutes(range: unknown): number | null {
  const start = String(range ?? '').split('-')[0]?.trim();
  if (!start) return null;

  const twelve = start.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]\.?$/);
  if (twelve) {
    let hour = Number(twelve[1]);
    const minute = twelve[2] ? Number(twelve[2]) : 0;
    if (hour < 1 || hour > 12 || minute > 59) return null;
    if (hour === 12) hour = 0; // 12 AM -> 0, 12 PM -> 12 after the offset below
    return (twelve[3].toLowerCase() === 'p' ? hour + 12 : hour) * 60 + minute;
  }

  const twentyFour = start.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) {
    const hour = Number(twentyFour[1]);
    const minute = Number(twentyFour[2]);
    if (hour > 23 || minute > 59) return null;
    return hour * 60 + minute;
  }

  return null;
}

const sameDay = (a: unknown, b: unknown) =>
  String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The reminder log's unique key for one occurrence of one session.
 *
 * Sandbox runs get their own key space. Without this, testing at 10:35 on a
 * Wednesday would claim the session and make the real 10:36 run skip it — a
 * test that silently suppresses the very reminder it was verifying.
 */
export function reminderKey(
  dateKey: string,
  session: {
    className?: string;
    level?: number;
    course?: string;
    day?: string;
    time?: string;
  },
  sandbox: boolean
): string {
  return [
    sandbox ? 'sandbox' : 'live',
    dateKey,
    session.className ?? '',
    session.level ?? '',
    session.course ?? '',
    session.day ?? '',
    session.time ?? '',
  ].join('|');
}

type Session = {
  className?: string;
  level?: number;
  course?: string;
  room?: string;
  time?: string;
  lecturer?: string;
  day?: string;
  Semester?: string;
};

type CancellationNotice = {
  className?: string;
  level?: number;
  course?: string;
  day?: string;
  semester?: string;
  createdAt?: Date | string;
};

type RescheduleNotice = CancellationNotice & {
  fromDay?: string;
  fromTime?: string;
  toDay?: string;
  toTime?: string;
  toRoom?: string;
  // True when the timetable was deliberately left unchanged (see models/alert).
  oneOff?: boolean;
  lecturerNames?: string[];
};

/**
 * Does this cancellation notice cover the occurrence of `session` starting at
 * `startsAt`?
 *
 * A cancellation is a one-off: the recurring session stays on the timetable and
 * runs again next week (see api/timetable/alert). So the notice suppresses the
 * reminder for exactly the first occurrence that follows it — anything more
 * than a week after it was raised is the next running of the class, which is
 * reminded as normal.
 *
 * The notice's optional fields widen its reach rather than narrow it: no
 * `course` means the whole cohort, no `day` means whichever day comes first, no
 * `level` means every level of the programme. That mirrors how the alert route
 * resolves recipients, so whoever was told the class is off is exactly who
 * stops being reminded about it.
 */
/**
 * Does a notice still apply to an occurrence starting at `startsAt`?
 *
 * Every notice in this module covers exactly one occurrence: the first one
 * after it was raised. A week later the class is running again as timetabled,
 * so the notice has expired. This is the rule cancellations follow, and one-off
 * moves follow it too.
 */
function withinNoticeWindow(
  notice: { createdAt?: Date | string },
  startsAt: Date
): boolean {
  const raised = notice.createdAt ? new Date(notice.createdAt).getTime() : NaN;
  if (!Number.isFinite(raised)) return false;
  const due = startsAt.getTime();
  return raised <= due && raised > due - WEEK_MS;
}

/** Does the notice name this cohort, level, course and semester? */
function noticeMatchesClass(
  notice: CancellationNotice,
  session: Session
): boolean {
  if (normalizeLabel(notice.className) !== normalizeLabel(session.className)) {
    return false;
  }
  if (notice.level != null && Number(notice.level) !== Number(session.level)) {
    return false;
  }
  if (notice.course && normalizeLabel(notice.course) !== normalizeLabel(session.course)) {
    return false;
  }
  if (
    notice.semester &&
    session.Semester &&
    normalizeSemester(notice.semester) !== normalizeSemester(session.Semester)
  ) {
    return false;
  }
  return true;
}

export function cancelsSession(
  notice: CancellationNotice,
  session: Session,
  startsAt: Date
): boolean {
  // A notice carrying a destination is a move, not a cancellation: the class is
  // still holding, elsewhere. The run loop already separates the two by type,
  // but the check belongs here as well so the function cannot be misread — the
  // fields a move fills in overlap exactly with the ones matched below.
  if ((notice as RescheduleNotice).toDay || (notice as RescheduleNotice).toTime) {
    return false;
  }
  if (!withinNoticeWindow(notice, startsAt)) return false;
  if (!noticeMatchesClass(notice, session)) return false;
  if (notice.day && !sameDay(notice.day, session.day)) return false;
  return true;
}

/**
 * Has a one-off move taken this occurrence away from its timetabled slot?
 *
 * A "just this week" move leaves the timetable alone, so the session is still
 * sitting there at its old day and time and would otherwise be reminded about
 * as if nothing had happened. Withholding that reminder is the same act as
 * withholding a cancelled class's — the class is not holding here today.
 */
export function movedAwayFrom(
  notice: RescheduleNotice,
  session: Session,
  startsAt: Date
): boolean {
  if (!notice.oneOff || !notice.fromDay || !notice.fromTime) return false;
  if (!withinNoticeWindow(notice, startsAt)) return false;
  if (!noticeMatchesClass(notice, session)) return false;
  return (
    sameDay(notice.fromDay, session.day) &&
    normalizeLabel(notice.fromTime) === normalizeLabel(session.time)
  );
}

/**
 * Was this occurrence moved here by a reschedule in the last week?
 *
 * A reschedule rewrites the session on the timetable, so the reminder already
 * carries the new day, time and room — this only decides whether to flag the
 * message as a change, so a student who has the old details in their head
 * notices that something moved.
 */
export function rescheduledInto(
  notice: RescheduleNotice,
  session: Session,
  startsAt: Date
): boolean {
  if (!notice.toDay || !notice.toTime) return false;
  if (!withinNoticeWindow(notice, startsAt)) return false;
  if (!noticeMatchesClass(notice, session)) return false;
  return (
    sameDay(notice.toDay, session.day) &&
    normalizeLabel(notice.toTime) === normalizeLabel(session.time)
  );
}

/**
 * The session a one-off move stands in for: the class as it will actually run
 * this week. It is assembled from the notice rather than read from the
 * timetable, because by design nothing on the timetable was changed.
 */
export function virtualSession(notice: RescheduleNotice): Session {
  return {
    className: notice.className,
    level: notice.level,
    course: notice.course,
    room: notice.toRoom,
    time: notice.toTime,
    day: notice.toDay,
    lecturer: notice.lecturerNames?.[0],
    Semester: notice.semester,
  };
}

/** Short suffix flagging a moved class, kept brief to stay inside one SMS. */
export function rescheduleNote(notice: RescheduleNotice, session: Session): string {
  return notice.fromDay && !sameDay(notice.fromDay, session.day)
    ? ` (moved from ${notice.fromDay})`
    : ' (rescheduled)';
}

export type ReminderRunResult = {
  ranAt: string;
  timeZone: string;
  dayName: string;
  leadMinutes: number;
  dryRun: boolean;
  // Whether SMS went out in Arkesel sandbox mode (accepted, nothing delivered
  // or billed). Reported so a green run can't be misread as a live one.
  sandbox: boolean;
  due: number;
  sent: number;
  skippedAlreadySent: number;
  // Sessions whose reminder was withheld because a cancellation notice covers
  // this week's occurrence.
  skippedCancelled: number;
  // Sessions withheld at their timetabled slot because a one-off move took this
  // week's occurrence somewhere else. The new slot gets its own reminder.
  skippedMoved: number;
  details: Array<Record<string, unknown>>;
};

/**
 * Find every session starting within the lead window and text the students in
 * that cohort plus the lecturer taking it.
 *
 * Safe to call repeatedly: each session is claimed through a unique reminder
 * log key before any SMS goes out, so overlapping or retried runs can't double
 * -send. `dryRun` resolves recipients and reports what would happen without
 * claiming anything or sending.
 */
export async function runClassReminders({
  now = new Date(),
  dryRun = false,
}: { now?: Date; dryRun?: boolean } = {}): Promise<ReminderRunResult> {
  await connectDB();

  const lead = leadMinutes();
  const sandbox = sandboxEnabled();
  const { dayName, dateKey, minutes } = zonedNow(now);

  // Optional guard for installs that keep previous semesters' timetables
  // around — without it, a stale document would keep texting people forever.
  const semesterFilter = process.env.REMINDER_SEMESTER?.trim();

  const docs = await TimetableModel.find(
    semesterFilter ? { semester: semesterFilter } : {}
  ).exec();

  // Notices are read before the scan, not after it: a class moved to a slot that
  // holds nothing on the timetable would otherwise never be looked at, and its
  // reminder would be the one thing the run had to do.
  //
  // Only the last week of notices can still be covering an upcoming session;
  // anything older belongs to an occurrence that has already been and gone.
  const recent = (await AlertModel.find(
    {
      type: { $in: ['cancellation', 'change'] },
      createdAt: { $gte: new Date(now.getTime() - WEEK_MS) },
    },
    'type className level course day semester createdAt fromDay fromTime ' +
      'toDay toTime toRoom oneOff lecturerNames'
  ).exec()) as Array<RescheduleNotice & { type?: string }>;
  const notices = recent.filter((a) => a.type === 'cancellation');
  const moves = recent.filter((a) => a.type === 'change' && a.toDay && a.toTime);
  const oneOffMoves = moves.filter((a) => a.oneOff);

  // How long until a session starting at `time` today, or null when the label
  // is unparseable or the slot is not inside the lead window.
  const untilDue = (time?: string): number | null => {
    const start = parseStartMinutes(time);
    if (start === null) return null;
    const until = start - minutes;
    // Strictly after "now" so a class already under way isn't announced.
    return until > 0 && until <= lead ? until : null;
  };

  // Each due session carries the instant it actually starts, so a notice can be
  // matched against this week's occurrence rather than the recurring slot in
  // the abstract.
  const due: Array<{ session: Session; occursAt: Date }> = [];
  for (const doc of docs) {
    for (const session of (doc.timetable ?? []) as Session[]) {
      if (!sameDay(session?.day, dayName)) continue;
      const until = untilDue(session?.time);
      if (until === null) continue;
      due.push({
        session,
        occursAt: new Date(now.getTime() + until * 60 * 1000),
      });
    }
  }

  // A one-off move exists only as an alert — the timetable still shows the
  // class at its normal slot — so the occurrence it moves the class *to* has to
  // be added to today's scan by hand.
  for (const move of oneOffMoves) {
    if (!sameDay(move.toDay, dayName)) continue;
    const until = untilDue(move.toTime);
    if (until === null) continue;
    const occursAt = new Date(now.getTime() + until * 60 * 1000);
    if (!withinNoticeWindow(move, occursAt)) continue;
    due.push({ session: virtualSession(move), occursAt });
  }

  const result: ReminderRunResult = {
    ranAt: now.toISOString(),
    timeZone: TIME_ZONE,
    dayName,
    leadMinutes: lead,
    dryRun,
    sandbox,
    due: due.length,
    sent: 0,
    skippedAlreadySent: 0,
    skippedCancelled: 0,
    skippedMoved: 0,
    details: [],
  };
  if (due.length === 0) return result;

  // Loaded once and matched in memory: cohort membership is a fuzzy label match
  // (see lib/match), not something the query language can express.
  const students = await StudentModel.find(
    { smsReminders: { $ne: false } },
    'program level phone'
  ).exec();

  for (const { session, occursAt } of due) {
    const label = cohortLabel(session.className, session.level);

    // A class that has been called off, or moved elsewhere just for this week,
    // is not reminded about at its timetabled slot — not to the cohort and not
    // to the lecturer. Both notices cover this week only, so next week's
    // running of the same session is reminded as normal.
    const cancelled = notices.find((notice) =>
      cancelsSession(notice, session, occursAt)
    );
    const movedAway = cancelled
      ? undefined
      : oneOffMoves.find((notice) => movedAwayFrom(notice, session, occursAt));
    if (cancelled || movedAway) {
      if (cancelled) result.skippedCancelled += 1;
      else result.skippedMoved += 1;
      result.details.push({
        course: session.course,
        className: label,
        time: session.time,
        room: session.room,
        skipped: cancelled ? 'cancelled' : 'moved',
        noticeRaisedAt: (cancelled ?? movedAway)?.createdAt,
        ...(movedAway
          ? { movedTo: `${movedAway.toDay} ${movedAway.toTime}` }
          : {}),
      });
      continue;
    }
    const key = reminderKey(dateKey, session, sandbox);

    const studentPhones = students
      .filter((s: any) =>
        classMatchesStudent(
          { className: session.className, level: session.level },
          s
        )
      )
      .map((s: any) => s.phone)
      .filter(Boolean);

    const lecturerPhones = session.lecturer
      ? (
          await LecturerModel.find(
            { name: session.lecturer, smsReminders: { $ne: false } },
            'phone'
          ).exec()
        )
          .map((l: any) => (l.phone != null ? String(l.phone) : ''))
          .filter(Boolean)
      : [];

    const base = {
      course: session.course,
      className: label,
      time: session.time,
      room: session.room,
      students: studentPhones.length,
      lecturers: lecturerPhones.length,
    };

    if (dryRun) {
      result.details.push({ ...base, wouldSend: true });
      continue;
    }

    // Claim the session first. A duplicate key means another run already has
    // it — losing a reminder to a later send failure is far better than texting
    // a whole cohort twice.
    try {
      await ReminderLogModel.create({
        key,
        dateKey,
        className: label,
        course: session.course,
        day: session.day,
        time: session.time,
        studentCount: studentPhones.length,
        lecturerCount: lecturerPhones.length,
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        result.skippedAlreadySent += 1;
        continue;
      }
      throw error;
    }

    const startsAt = String(session.time ?? '').split('-')[0]?.trim();
    const where = session.room ? ` in ${session.room}` : '';

    // A class moved here in the last week is flagged, so the reminder reads as
    // a correction to whoever still has the old slot in mind. The new day, time
    // and room are already right: the reschedule rewrote the timetable this
    // reminder is built from.
    const move = moves.find((m) => rescheduledInto(m, session, occursAt));
    const note = move ? rescheduleNote(move, session) : '';

    const studentSms = studentPhones.length
      ? await sendSms(
          studentPhones,
          `Reminder: ${session.course} starts at ${startsAt}${where}${note}. (${label})`
        )
      : { sent: false, reason: 'no_recipients' as const };

    const lecturerSms = lecturerPhones.length
      ? await sendSms(
          lecturerPhones,
          `Reminder: you teach ${session.course} at ${startsAt}${where}${note}. (${label})`
        )
      : { sent: false, reason: 'no_recipients' as const };

    const sent = studentSms.sent || lecturerSms.sent;
    if (sent) result.sent += 1;

    await ReminderLogModel.updateOne(
      { key },
      {
        $set: {
          smsSent: sent,
          smsReason: sent
            ? undefined
            : studentSms.reason ?? lecturerSms.reason,
        },
      }
    );

    result.details.push({ ...base, sent, rescheduled: Boolean(move) });
  }

  return result;
}
