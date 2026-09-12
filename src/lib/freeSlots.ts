import { connectDB } from './db';
import RoomModel from '../models/room';
import TimeModel from '../models/time';
import ClassModel from '../models/class';
import TimetableModel from '../models/timetable';
import AlertModel from '../models/alert';
import { normalizeSemester } from './timetable';
import { normalizeLabel } from './match';

// Weekday order used to present free slots in the order a week runs, rather
// than the order rows happen to sit in the timetable document.
const DAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export type SessionRef = {
  className: string;
  level?: number;
  course: string;
  day: string;
  time: string;
  semester?: string;
};

export type FreeSlot = {
  day: string;
  time: string;
  // Rooms free at this day/time that this cohort can actually use.
  rooms: Array<{ roomname: string; capacity: number }>;
};

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

const same = (a: unknown, b: unknown) =>
  normalizeLabel(a) === normalizeLabel(b) && normalizeLabel(a) !== '';

/** Is `session` the one the caller is proposing to move? */
export function isSameSession(session: Session, ref: SessionRef): boolean {
  return (
    same(session.className, ref.className) &&
    (ref.level == null || Number(session.level) === Number(ref.level)) &&
    same(session.course, ref.course) &&
    same(session.day, ref.day) &&
    same(session.time, ref.time)
  );
}

/**
 * Where could this session move to?
 *
 * A destination is offered only when moving the session there would leave the
 * timetable as valid as the generator does (lib/timetable, Section 3.6 of the
 * report): the cohort, the lecturer and the room must all be free in that slot,
 * and the room must fit the cohort and not be on its unavailable list.
 *
 * The session being moved is excluded from the busy maps first, so its own
 * current slot is correctly reported as free — moving a class to a different
 * room at the same time is a legitimate change.
 */
export function freeSlotsFor({
  ref,
  sessions,
  rooms,
  slotTimes,
  days,
  population = 0,
  unavailableRooms = [],
}: {
  ref: SessionRef;
  sessions: Session[];
  rooms: Array<{ roomname: string; capacity: number }>;
  slotTimes: string[];
  days: string[];
  population?: number;
  unavailableRooms?: string[];
}): FreeSlot[] {
  const others = sessions.filter((s) => !isSameSession(s, ref));
  const moving = sessions.find((s) => isSameSession(s, ref));
  const lecturer = moving?.lecturer;

  const key = (a: unknown, day: string, time: string) =>
    `${normalizeLabel(a)}|${normalizeLabel(day)}|${normalizeLabel(time)}`;

  const roomBusy = new Set<string>();
  const lecturerBusy = new Set<string>();
  const cohortBusy = new Set<string>();
  for (const s of others) {
    const day = String(s.day ?? '');
    const time = String(s.time ?? '');
    if (s.room) roomBusy.add(key(s.room, day, time));
    if (s.lecturer) lecturerBusy.add(key(s.lecturer, day, time));
    cohortBusy.add(key(`${s.className ?? ''} ${s.level ?? ''}`, day, time));
  }

  const cohortKey = `${ref.className} ${ref.level ?? ''}`;
  const blockedRooms = unavailableRooms.map((r) => normalizeLabel(r));

  const free: FreeSlot[] = [];
  for (const day of days) {
    for (const time of slotTimes) {
      // The cohort itself can only be in one place at a time, and a lecturer
      // already teaching elsewhere in this slot cannot take the moved session.
      if (cohortBusy.has(key(cohortKey, day, time))) continue;
      if (lecturer && lecturerBusy.has(key(lecturer, day, time))) continue;

      const open = rooms.filter(
        (r) =>
          !roomBusy.has(key(r.roomname, day, time)) &&
          !blockedRooms.includes(normalizeLabel(r.roomname)) &&
          Number(r.capacity ?? 0) >= population
      );
      if (open.length) {
        free.push({
          day,
          time,
          rooms: open.map((r) => ({
            roomname: r.roomname,
            capacity: Number(r.capacity ?? 0),
          })),
        });
      }
    }
  }
  return free;
}

/**
 * Load everything `freeSlotsFor` needs and run it for one session.
 *
 * Teaching days come from the saved timetable rather than a fixed week: the
 * administrator chooses the teaching days at generation time, and offering a
 * slot on a day the institution does not teach would be misleading.
 */
export async function loadFreeSlots(ref: SessionRef): Promise<{
  slots: FreeSlot[];
  current: { day: string; time: string; room?: string; lecturer?: string } | null;
}> {
  await connectDB();

  const [rooms, slots, docs] = await Promise.all([
    RoomModel.find({}, 'roomname capacity').exec(),
    TimeModel.find({}, 'startTime endTime').exec(),
    TimetableModel.find({}).exec(),
  ]);

  const canonical = ref.semester ? normalizeSemester(ref.semester) : undefined;
  const timetabled: Session[] = docs
    .flatMap((d: any) => (d.timetable ?? []) as Session[])
    .filter((s) => !canonical || normalizeSemester(s?.Semester) === canonical);

  // A one-off move puts a class somewhere the timetable knows nothing about, so
  // its destination has to count as occupied here or two people could be sent
  // to the same room in the same hour. The class's own timetabled slot is left
  // occupied as well: that is the conservative reading, and it costs only the
  // rare case of a room that happens to be empty for one week.
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const pending = (await AlertModel.find(
    {
      type: 'change',
      oneOff: true,
      createdAt: { $gte: new Date(Date.now() - WEEK_MS) },
    },
    'className level course semester toDay toTime toRoom lecturerNames'
  ).exec()) as any[];
  const sessions: Session[] = timetabled.concat(
    pending
      .filter((a) => a.toDay && a.toTime)
      .map((a) => ({
        className: a.className,
        level: a.level,
        course: a.course,
        room: a.toRoom,
        day: a.toDay,
        time: a.toTime,
        lecturer: a.lecturerNames?.[0],
        Semester: a.semester,
      }))
  );

  const moving = sessions.find((s) => isSameSession(s, ref));

  // The cohort's own record carries the two room constraints the generator
  // applies: it must seat the class, and the class may bar specific rooms.
  const cls = (await ClassModel.find({}, 'className level population unavailablerooms').exec()).find(
    (c: any) =>
      same(c.className, ref.className) &&
      (ref.level == null || Number(c.level) === Number(ref.level))
  );

  const slotTimes = Array.from(
    new Set([
      ...slots.map((s: any) => `${s.startTime} - ${s.endTime}`),
      // Slot labels already on the timetable, in case a time record was edited
      // or removed after generation.
      ...timetabled.map((s) => String(s.time ?? '')).filter(Boolean),
    ])
  );

  const daysInUse = Array.from(
    new Set(timetabled.map((s) => String(s.day ?? '')).filter(Boolean))
  );
  const days = DAY_ORDER.filter((d) =>
    daysInUse.some((u) => normalizeLabel(u) === normalizeLabel(d))
  );

  return {
    slots: freeSlotsFor({
      ref,
      sessions,
      rooms: rooms.map((r: any) => ({
        roomname: r.roomname,
        capacity: Number(r.capacity ?? 0),
      })),
      slotTimes,
      days: days.length ? days : daysInUse,
      population: Number(cls?.population ?? 0),
      unavailableRooms: Array.isArray(cls?.unavailablerooms)
        ? cls.unavailablerooms
        : [],
    }),
    current: moving
      ? {
          day: String(moving.day ?? ''),
          time: String(moving.time ?? ''),
          room: moving.room,
          lecturer: moving.lecturer,
        }
      : null,
  };
}
