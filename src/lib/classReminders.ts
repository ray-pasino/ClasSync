import { connectDB } from './db';
import StudentModel from '../models/student';
import LecturerModel from '../models/lecturer';
import TimetableModel from '../models/timetable';
import ReminderLogModel from '../models/reminderLog';
import { classMatchesStudent, cohortLabel } from './match';
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

  const due: Session[] = [];
  for (const doc of docs) {
    for (const session of (doc.timetable ?? []) as Session[]) {
      if (!sameDay(session?.day, dayName)) continue;
      const start = parseStartMinutes(session?.time);
      if (start === null) continue;
      const until = start - minutes;
      // Strictly after "now" so a class already under way isn't announced.
      if (until > 0 && until <= lead) due.push(session);
    }
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
    details: [],
  };
  if (due.length === 0) return result;

  // Loaded once and matched in memory: cohort membership is a fuzzy label match
  // (see lib/match), not something the query language can express.
  const students = await StudentModel.find(
    { smsReminders: { $ne: false } },
    'program level phone'
  ).exec();

  for (const session of due) {
    const label = cohortLabel(session.className, session.level);
    // Sandbox runs get their own key space. Without this, testing at 10:35 on a
    // Wednesday would claim the session and make the real 10:36 run skip it —
    // a test that silently suppresses the very reminder it was verifying.
    const key = [
      sandbox ? 'sandbox' : 'live',
      dateKey,
      session.className ?? '',
      session.level ?? '',
      session.course ?? '',
      session.day ?? '',
      session.time ?? '',
    ].join('|');

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

    const studentSms = studentPhones.length
      ? await sendSms(
          studentPhones,
          `Reminder: ${session.course} starts at ${startsAt}${where}. (${label})`
        )
      : { sent: false, reason: 'no_recipients' as const };

    const lecturerSms = lecturerPhones.length
      ? await sendSms(
          lecturerPhones,
          `Reminder: you teach ${session.course} at ${startsAt}${where}. (${label})`
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

    result.details.push({ ...base, sent });
  }

  return result;
}
