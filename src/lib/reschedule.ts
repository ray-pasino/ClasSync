import { connectDB } from './db';
import TimetableModel from '../models/timetable';
import ReminderLogModel from '../models/reminderLog';
import {
  leadMinutes,
  parseStartMinutes,
  reminderKey,
  zonedNow,
} from './classReminders';
import { isSameSession, loadFreeSlots, type SessionRef } from './freeSlots';
import { sandboxEnabled } from './notifyStudents';
import { normalizeLabel } from './match';

export type Placement = { day: string; time: string; room?: string };

export type MoveResult = {
  moved: boolean;
  from: Placement | null;
  to: Placement | null;
  lecturer?: string;
  // Why the move was refused, when it was.
  reason?: 'not_found' | 'occupied';
};

/**
 * Move one session of the saved timetable to a new day/time/room.
 *
 * The timetable is a flat array on a single document (Section 3.4.2 of the
 * report), so a move is an in-place edit of one entry rather than a delete and
 * re-insert — the session keeps its lecturer, course and cohort.
 *
 * The destination is re-checked here rather than trusted from the client: the
 * free-slot list the administrator chose from may be seconds out of date, and
 * writing a clash into the timetable would break the one guarantee generation
 * makes.
 */
export async function moveSession(
  ref: SessionRef,
  to: Placement
): Promise<MoveResult> {
  await connectDB();
  const docs = await TimetableModel.find({}).exec();

  const key = (a: unknown, day: string, time: string) =>
    `${normalizeLabel(a)}|${normalizeLabel(day)}|${normalizeLabel(time)}`;

  let target: { doc: any; index: number; session: any } | null = null;
  const everySession: any[] = [];
  for (const doc of docs) {
    const list = (doc.timetable ?? []) as any[];
    list.forEach((session, index) => {
      everySession.push(session);
      if (!target && isSameSession(session, ref)) {
        target = { doc, index, session };
      }
    });
  }
  if (!target) return { moved: false, from: null, to: null, reason: 'not_found' };

  const { doc, index, session } = target as { doc: any; index: number; session: any };
  const from: Placement = {
    day: String(session.day ?? ''),
    time: String(session.time ?? ''),
    room: session.room,
  };

  // Everything except the session being moved counts as occupying the slot.
  const clash = everySession.some((s) => {
    if (s === session) return false;
    const sameSlot =
      normalizeLabel(s?.day) === normalizeLabel(to.day) &&
      normalizeLabel(s?.time) === normalizeLabel(to.time);
    if (!sameSlot) return false;
    if (to.room && key(s?.room, to.day, to.time) === key(to.room, to.day, to.time)) {
      return true;
    }
    if (session.lecturer && normalizeLabel(s?.lecturer) === normalizeLabel(session.lecturer)) {
      return true;
    }
    return (
      normalizeLabel(s?.className) === normalizeLabel(session.className) &&
      Number(s?.level ?? NaN) === Number(session.level ?? NaN)
    );
  });
  if (clash) return { moved: false, from, to: null, reason: 'occupied' };

  const updated = {
    ...session,
    day: to.day,
    time: to.time,
    room: to.room ?? session.room,
  };
  doc.timetable[index] = updated;
  doc.markModified('timetable');
  await doc.save();

  return {
    moved: true,
    from,
    to: { day: updated.day, time: updated.time, room: updated.room },
    lecturer: session.lecturer,
  };
}

/**
 * The session as it sits on the timetable, without changing anything.
 *
 * A one-off move needs the lecturer and the current room to describe what is
 * happening, but must leave the timetable exactly as it found it.
 */
export async function findSession(ref: SessionRef): Promise<{
  day: string;
  time: string;
  room?: string;
  lecturer?: string;
} | null> {
  await connectDB();
  const docs = await TimetableModel.find({}).exec();
  for (const doc of docs) {
    for (const session of ((doc.timetable ?? []) as any[])) {
      if (isSameSession(session, ref)) {
        return {
          day: String(session.day ?? ''),
          time: String(session.time ?? ''),
          room: session.room,
          lecturer: session.lecturer,
        };
      }
    }
  }
  return null;
}

/**
 * Is this destination still on offer for this session?
 *
 * Checked against the same free-slot finder the dialog listed, so a one-off
 * move is held to exactly the constraints the administrator or lecturer was
 * shown — and so a list that went stale while the message was being typed
 * cannot put two classes in one room.
 */
export async function destinationIsFree(
  ref: SessionRef,
  to: Placement
): Promise<boolean> {
  const { slots } = await loadFreeSlots(ref);
  const slot = slots.find(
    (s) =>
      normalizeLabel(s.day) === normalizeLabel(to.day) &&
      normalizeLabel(s.time) === normalizeLabel(to.time)
  );
  if (!slot) return false;
  if (!to.room) return true;
  return slot.rooms.some(
    (r) => normalizeLabel(r.roomname) === normalizeLabel(to.room)
  );
}

/**
 * Has the reminder for this occurrence of the session already gone out?
 *
 * This is what decides whether a reschedule needs its own SMS. If the cohort
 * has already been texted "starts at 11:00 in C1", they are holding details
 * that are now wrong and must be told immediately. If the reminder has not
 * gone yet, it will be sent from the updated timetable and will carry the new
 * details by itself — a second SMS would be noise, and SMS costs money.
 */
export async function reminderAlreadySent(
  session: { className?: string; level?: number; course?: string; day?: string; time?: string },
  now: Date = new Date()
): Promise<boolean> {
  await connectDB();
  const { dayName, dateKey } = zonedNow(now);
  // A reminder can only have gone out for today's occurrence.
  if (normalizeLabel(session.day) !== normalizeLabel(dayName)) return false;

  const log = await ReminderLogModel.findOne({
    key: reminderKey(dateKey, session, sandboxEnabled()),
  }).exec();
  return Boolean(log?.smsSent);
}

/**
 * Should a reschedule send its SMS now, or leave it to the class reminder?
 *
 * Now, when either:
 *   - the reminder for this occurrence has already been sent, or
 *   - the class starts inside the reminder lead window, where a run may be in
 *     flight right now. Sending is the safe side of that race: a duplicate
 *     message is a nuisance, a missed one sends students to the wrong room.
 *
 * Otherwise the change rides on the reminder, which reads the timetable we
 * have just updated.
 */
export async function smsNeededNow(
  session: { className?: string; level?: number; course?: string; day?: string; time?: string },
  now: Date = new Date()
): Promise<{ now: boolean; reason: 'reminder_sent' | 'inside_lead_window' | 'reminder_will_carry' }> {
  if (await reminderAlreadySent(session, now)) {
    return { now: true, reason: 'reminder_sent' };
  }

  const { dayName, minutes } = zonedNow(now);
  const start = parseStartMinutes(session.time);
  const isToday = normalizeLabel(session.day) === normalizeLabel(dayName);
  if (isToday && start !== null) {
    const until = start - minutes;
    if (until <= leadMinutes()) {
      return { now: true, reason: 'inside_lead_window' };
    }
  }
  return { now: false, reason: 'reminder_will_carry' };
}

export type SmsTiming = {
  now: boolean;
  reason: 'reminder_sent' | 'inside_lead_window' | 'reminder_will_carry';
};

// One flat shape rather than a discriminated union: this project compiles with
// `strict: false`, where TypeScript will not narrow a union on a boolean tag.
export type RescheduleOutcome = {
  ok: boolean;
  // Set when the reschedule was refused.
  reason?: 'not_found' | 'occupied';
  from?: Placement;
  to?: Placement;
  lecturer?: string;
  oneOff?: boolean;
  // Whether the notice needs its own SMS, and why.
  timing?: SmsTiming;
};

/**
 * Carry out a reschedule and decide how its notice should travel.
 *
 * Two kinds, sharing everything except what they do to the timetable:
 *
 *   permanent — the session is moved on the saved timetable, so every portal
 *               and every future reminder reads the new placement.
 *   one-off   — the timetable is deliberately untouched: the class is away for
 *               this week only and returns to its normal slot next week. The
 *               reminder pipeline withholds the old slot's reminder for that one
 *               occurrence and raises one for the new slot instead, which is the
 *               same single-occurrence rule a cancellation follows.
 *
 * The SMS decision is identical for both, and is taken against the slot the
 * students were originally told about.
 */
export async function applyReschedule(
  ref: SessionRef,
  to: Placement,
  { oneOff = false, now = new Date() }: { oneOff?: boolean; now?: Date } = {}
): Promise<RescheduleOutcome> {
  if (oneOff) {
    const current = await findSession(ref);
    if (!current) return { ok: false, reason: 'not_found' };
    if (!(await destinationIsFree(ref, to))) {
      return { ok: false, reason: 'occupied' };
    }
    return {
      ok: true,
      oneOff: true,
      from: { day: current.day, time: current.time, room: current.room },
      to: { day: to.day, time: to.time, room: to.room ?? current.room },
      lecturer: current.lecturer,
      timing: await smsNeededNow(
        { ...ref, day: current.day, time: current.time },
        now
      ),
    };
  }

  const moved = await moveSession(ref, to);
  if (!moved.moved || !moved.from || !moved.to) {
    return { ok: false, reason: moved.reason ?? 'not_found' };
  }
  return {
    ok: true,
    oneOff: false,
    from: moved.from,
    to: moved.to,
    lecturer: moved.lecturer,
    timing: await smsNeededNow(
      { ...ref, day: moved.from.day, time: moved.from.time },
      now
    ),
  };
}
