import { connectDB } from './db';
import StudentModel from '../models/student';
import LecturerModel from '../models/lecturer';
import AlertModel from '../models/alert';
import { classMatchesStudent } from './match';
import { sendSms } from './notifyStudents';

export type AlertType = 'cancellation' | 'change' | 'info';

interface DispatchInput {
  className: string;
  // Cohort level, when the alert targets a single level of the programme.
  level?: number;
  // Cancellation only: the course that won't hold, and the day it applies to.
  course?: string;
  day?: string;
  time?: string;
  semester?: string;
  type: AlertType;
  message: string;
  // Lecturer names teaching the class (from the current timetable). SMS'd and
  // used to scope the in-app feed to the right lecturers.
  lecturerNames?: string[];
  // Where the session sat before and after a reschedule, when the change moved
  // it on the timetable.
  from?: { day: string; time: string; room?: string } | null;
  to?: { day: string; time: string; room?: string } | null;
  // A one-off ("just this week") move, which leaves the timetable untouched.
  oneOff?: boolean;
  // Suppress the SMS because the class's own reminder has not gone out yet and
  // will carry the new details. The alert is still persisted and still appears
  // in the in-app feed immediately.
  deferSms?: boolean;
  // Recorded alongside the alert so the admin can see why no SMS was sent.
  smsNote?: string;
}

// Compose a sensible default SMS/announcement body when the admin doesn't
// supply their own wording.
export function defaultAlertMessage(
  type: AlertType,
  className: string
): string {
  switch (type) {
    case 'cancellation':
      return `Notice: classes for ${className} have been cancelled. Please check your timetable in the portal for details.`;
    case 'change':
      return `Notice: there is a change to the ${className} schedule. Please check your timetable in the portal for the update.`;
    default:
      return `Notice regarding ${className}. Please check your timetable in the portal.`;
  }
}

/**
 * Notify everyone affected by a class change/cancellation and record the alert.
 *
 * Recipients are resolved server-side:
 *   - students whose program+level matches the class label (via the shared
 *     matcher), and
 *   - the lecturers named in `lecturerNames`.
 *
 * SMS is best-effort (never throws); the alert is always persisted so it shows
 * up in the in-app feed regardless of SMS outcome.
 */
export async function dispatchClassAlert({
  className,
  level,
  course,
  day,
  semester,
  type,
  message,
  lecturerNames = [],
  from = null,
  to = null,
  oneOff = false,
  deferSms = false,
  smsNote,
}: DispatchInput) {
  await connectDB();

  const body =
    message && message.trim().length > 0
      ? message.trim()
      : defaultAlertMessage(type, className);

  // Affected students: match on program + level. Pass the cohort's explicit
  // level so a level-specific alert only reaches that level.
  const students = await StudentModel.find({}, 'program level phone').exec();
  const studentPhones = students
    .filter((s: any) => classMatchesStudent({ className, level }, s))
    .map((s: any) => s.phone)
    .filter(Boolean);

  // The class's lecturers, looked up by name.
  const lecturerPhones = lecturerNames.length
    ? (await LecturerModel.find({ name: { $in: lecturerNames } }, 'phone').exec())
        .map((l: any) => (l.phone != null ? String(l.phone) : ''))
        .filter(Boolean)
    : [];

  const sms = deferSms
    ? { sent: false, count: 0, reason: smsNote ?? 'reminder_will_carry' }
    : await sendSms([...studentPhones, ...lecturerPhones], body);

  const alert = await AlertModel.create({
    type,
    className,
    level,
    course,
    day,
    semester,
    fromDay: from?.day,
    fromTime: from?.time,
    fromRoom: from?.room,
    toDay: to?.day,
    toTime: to?.time,
    toRoom: to?.room,
    oneOff,
    message: body,
    lecturerNames,
    smsSent: sms.sent,
    smsCount: sms.count ?? 0,
    smsReason: sms.reason,
    smsDeferred: deferSms,
  });

  return {
    alert,
    sms,
    recipients: {
      students: studentPhones.length,
      lecturers: lecturerPhones.length,
    },
  };
}
