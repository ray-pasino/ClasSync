import LecturerModel from '../models/lecturer';
import CourseModel from '../models/course';
import RoomModel from '../models/room';
import TimeModel from '../models/time';
import ClassModel from '../models/class';

// Collect all the data needed to generate a timetable.
export async function collectData() {
  try {
    const lecturers = await LecturerModel.find().exec();
    const courses = await CourseModel.find().exec();
    const lectureRooms = await RoomModel.find().exec();
    const timeSlots = await TimeModel.find().exec();
    const setClasses = await ClassModel.find().exec();
    return { lecturers, courses, lectureRooms, timeSlots, setClasses };
  } catch (error) {
    console.error('Error collecting data:', error);
    return null;
  }
}

// A single placed session in the generated timetable. Shape is kept exactly as
// the dashboard / student / lecturer views consume it.
export interface TimetableItem {
  Semester: string;
  className: string;
  // Academic level of the cohort (100/200/300/400), when the class records one.
  level?: number;
  course: string;
  room: string;
  time: string;
  lecturer: string;
  day: string;
}

// A class (or one of its weekly meetings) that could not be placed, with a
// human-readable reason. Powers the "what couldn't be scheduled" summary and,
// later, the AI conflict explainer.
export interface UnscheduledEntry {
  className: string;
  course: string;
  semester: string;
  needed: number;
  placed: number;
  reason: string;
}

export interface GenerationResult {
  timetable: TimetableItem[];
  unscheduled: UnscheduledEntry[];
  warnings: string[];
}

// Every (day, slot) pairing the scheduler can place a session into.
interface Cell {
  day: string;
  slotIndex: number;
  time: string;
}

const num = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// The app has used two different vocabularies for the academic period: class
// records store "First Semester"/"Second Semester" while the older generate
// modal sent "Semester 1"/"Semester 2". Collapse every variant to one canonical
// label so the generator can reliably match a class to the selected period and
// old records keep working. Anything unrecognised is returned trimmed as-is.
export function normalizeSemester(value: any): string {
  const s = String(value ?? '').toLowerCase().trim();
  if (!s) return '';
  if (s.includes('first') || s.includes('1') || s.includes('one')) return 'First Semester';
  if (s.includes('second') || s.includes('2') || s.includes('two')) return 'Second Semester';
  return String(value).trim();
}

// The courses a class takes, each with its meetings/week. Reads the new
// `courses` array, falling back to the legacy single `course`/`meetings` fields
// so older class records still schedule.
function classCourses(cls: any): { course: string; meetings: number }[] {
  if (Array.isArray(cls.courses) && cls.courses.length) {
    return cls.courses
      .filter((c: any) => c && c.course)
      .map((c: any) => ({
        course: c.course,
        meetings: Math.max(1, num(c.meetings, 1)),
      }));
  }
  if (cls.course) {
    return [{ course: cls.course, meetings: Math.max(1, num(cls.meetings, 1)) }];
  }
  return [];
}

// The course names a lecturer can teach. Reads the new `courses` array,
// falling back to the legacy single `course` field so older lecturer records
// still match.
function lecturerCourses(l: any): string[] {
  if (Array.isArray(l.courses) && l.courses.length) {
    return l.courses.filter(Boolean);
  }
  return l.course ? [l.course] : [];
}

// Whether a lecturer is qualified to teach a given course.
function lecturerTeaches(l: any, course: string): boolean {
  return lecturerCourses(l).includes(course);
}

// Identity of a cohort for double-booking purposes: a programme + its level.
// Two levels of the same programme are different student bodies and may run in
// parallel, so they must be keyed apart.
function cohortKey(className: string, level: any): string {
  const lvl = level == null || level === '' ? '' : String(level);
  return `${className}::${lvl}`;
}

/**
 * Generate a conflict-free timetable from the collected data and the chosen
 * days of the week.
 *
 * Unlike the previous random assignment, this honours the constraints already
 * captured on each record:
 *   - a class is taught by a lecturer whose `course` matches the class's course;
 *   - a room must have `capacity >= class.population` and not be in the class's
 *     `unavailablerooms` list;
 *   - each class is scheduled `meetings` times per week, spread across days;
 *   - no lecturer, room, or class is ever double-booked in the same slot;
 *   - independent classes may run in parallel (different room + lecturer).
 *
 * Scheduling can be scoped with `options`:
 *   - `semester`  — only classes for this academic period (normalised, so
 *                   "Semester 1" and "First Semester" match the same classes);
 *   - `programme` — only classes whose `className` matches this programme;
 *   - `occupied`  — sessions already placed (e.g. other programmes on the saved
 *                   timetable). Their rooms, lecturers and cohorts are treated
 *                   as busy so a merge stays 100% conflict-free across the whole
 *                   timetable, and their teaching load feeds the fairness pass.
 * With no scope, every class is scheduled.
 *
 * Hard-to-place classes (large population / few eligible rooms or lecturers)
 * are scheduled first so they get first pick. Anything that still can't be
 * placed is reported in `unscheduled` with the reason, never silently dropped.
 */
export function generateTimetable(
  { lecturers, lectureRooms, timeSlots, setClasses }: any,
  daysOfWeek: string[],
  options: { semester?: string; programme?: string; occupied?: TimetableItem[] } = {}
): GenerationResult {
  const { semester, programme, occupied = [] } = options;
  const timetable: TimetableItem[] = [];
  const unscheduled: UnscheduledEntry[] = [];
  const warnings: string[] = [];

  const days: string[] = Array.isArray(daysOfWeek) ? daysOfWeek : [];

  if (!days.length || !timeSlots?.length) {
    return {
      timetable,
      unscheduled: [],
      warnings: ['No days or time slots were provided, so nothing could be scheduled.'],
    };
  }
  if (!lectureRooms?.length) warnings.push('No rooms exist — add rooms before generating.');
  if (!lecturers?.length) warnings.push('No lecturers exist — add lecturers before generating.');

  // Scope the classes to schedule: the chosen academic period and, when given,
  // a single programme. Normalising the semester means the filter works no
  // matter which label variant a record uses.
  const targetSemester = normalizeSemester(semester);
  const classesToSchedule = (setClasses || []).filter((c: any) => {
    if (targetSemester && normalizeSemester(c.semester) !== targetSemester)
      return false;
    if (programme && c.className !== programme) return false;
    return true;
  });

  if (classesToSchedule.length === 0) {
    const scope = [programme, targetSemester].filter(Boolean).join(' · ');
    warnings.push(
      scope
        ? `No classes are assigned to ${scope}, so nothing was scheduled for it.`
        : 'No classes exist, so nothing was scheduled.'
    );
  }

  // Flatten every (day, slot) into a list of candidate cells.
  const cells: Cell[] = [];
  days.forEach((day) => {
    timeSlots.forEach((slot: any, slotIndex: number) => {
      cells.push({
        day,
        slotIndex,
        time: `${slot.startTime} - ${slot.endTime}`,
      });
    });
  });

  // Busy maps: `${key}|${day}|${time}` -> true. Keying by the time label (not a
  // slot index) lets us seed these from already-saved sessions, which only
  // carry the time label. Lecturers are keyed by name for the same reason.
  const roomBusy = new Set<string>();
  const lecturerBusy = new Set<string>();
  const classBusy = new Set<string>();
  const cellKey = (a: string, c: Cell) => `${a}|${c.day}|${c.time}`;
  const slotKey = (a: string, day: string, time: string) => `${a}|${day}|${time}`;

  // Running teaching load per lecturer, so we can spread sessions fairly.
  const lecturerLoad = new Map<string, number>();
  const loadOf = (name: string) => lecturerLoad.get(name) ?? 0;

  // Seed the busy maps and teaching load from sessions already on the
  // timetable (e.g. other programmes we're merging alongside), so the new
  // placements never clash with them.
  for (const s of occupied) {
    if (!s || !s.day || !s.time) continue;
    if (s.room) roomBusy.add(slotKey(s.room, s.day, s.time));
    if (s.lecturer) {
      lecturerBusy.add(slotKey(s.lecturer, s.day, s.time));
      lecturerLoad.set(s.lecturer, loadOf(s.lecturer) + 1);
    }
    classBusy.add(slotKey(cohortKey(s.className, s.level), s.day, s.time));
  }

  // Expand each class into one "offering" per course it takes, then pre-compute
  // the lecturers and rooms each offering could use. A class (cohort) shares its
  // population, unavailable rooms, and its own no-double-booking across all of
  // its courses.
  const offerings = classesToSchedule.flatMap((cls: any) => {
    const population = num(cls.population, 0);
    const unavailable: string[] = Array.isArray(cls.unavailablerooms)
      ? cls.unavailablerooms
      : [];

    // Rooms are the same for every course of this class (depend only on
    // population + unavailable list). Compute once.
    const eligibleRooms = (lectureRooms || [])
      .filter(
        (r: any) =>
          !unavailable.includes(r.roomname) && num(r.capacity, 0) >= population
      )
      // Prefer the smallest room that still fits, so large rooms stay free for
      // large classes (better overall utilisation).
      .sort((a: any, b: any) => num(a.capacity) - num(b.capacity));

    return classCourses(cls).map(({ course, meetings }) => {
      const matchingLecturers = (lecturers || []).filter((l: any) =>
        lecturerTeaches(l, course)
      );
      // Fall back to any lecturer if none is assigned to this course, so it
      // still gets placed — but flag it, because it means the wrong subject
      // expertise may be assigned.
      let eligibleLecturers = matchingLecturers;
      let lecturerFallback = false;
      if (eligibleLecturers.length === 0 && (lecturers?.length ?? 0) > 0) {
        eligibleLecturers = lecturers;
        lecturerFallback = true;
      }

      return {
        cls,
        course,
        needed: Math.max(1, meetings),
        population,
        eligibleLecturers,
        eligibleRooms,
        lecturerFallback,
      };
    });
  });

  // Schedule the most-constrained offerings first: fewest room options, then
  // fewest lecturer options, then largest population.
  offerings.sort((a: any, b: any) => {
    if (a.eligibleRooms.length !== b.eligibleRooms.length)
      return a.eligibleRooms.length - b.eligibleRooms.length;
    if (a.eligibleLecturers.length !== b.eligibleLecturers.length)
      return a.eligibleLecturers.length - b.eligibleLecturers.length;
    return b.population - a.population;
  });

  for (const entry of offerings) {
    const { cls, course, needed, population, eligibleLecturers, eligibleRooms, lecturerFallback } =
      entry;

    // Reasons a class can't be placed at all — report once, up front.
    if (eligibleRooms.length === 0) {
      const largest = (lectureRooms || []).reduce(
        (max: number, r: any) => Math.max(max, num(r.capacity)),
        0
      );
      unscheduled.push({
        className: cls.className,
        course,
        semester: normalizeSemester(cls.semester),
        needed,
        placed: 0,
        reason:
          largest > 0
            ? `No room can seat ${population} students (largest room holds ${largest}), or all suitable rooms are marked unavailable.`
            : 'No rooms are available for this class.',
      });
      continue;
    }
    if (eligibleLecturers.length === 0) {
      unscheduled.push({
        className: cls.className,
        course,
        semester: normalizeSemester(cls.semester),
        needed,
        placed: 0,
        reason: `No lecturer is assigned to teach "${course}".`,
      });
      continue;
    }
    if (lecturerFallback) {
      warnings.push(
        `No lecturer is assigned to "${course}" — ${cls.className} was given an available lecturer instead.`
      );
    }

    const usedDays = new Set<string>();
    let placed = 0;

    for (let meeting = 0; meeting < needed; meeting++) {
      // Prefer cells on days this class isn't already meeting, so multiple
      // weekly sessions spread out instead of stacking on one day.
      const ordered = [...cells].sort((a, b) => {
        const au = usedDays.has(a.day) ? 1 : 0;
        const bu = usedDays.has(b.day) ? 1 : 0;
        if (au !== bu) return au - bu;
        if (a.slotIndex !== b.slotIndex) return a.slotIndex - b.slotIndex;
        return days.indexOf(a.day) - days.indexOf(b.day);
      });

      const clsCohort = cohortKey(cls.className, cls.level);
      const clsLevel =
        cls.level == null || cls.level === '' ? undefined : Number(cls.level);

      let done = false;
      for (const cell of ordered) {
        // The cohort itself must be free this slot.
        if (classBusy.has(cellKey(clsCohort, cell))) continue;

        // First free eligible room (smallest that fits, already sorted).
        const room = eligibleRooms.find(
          (r: any) => !roomBusy.has(cellKey(r.roomname, cell))
        );
        if (!room) continue;

        // Free eligible lecturer with the lightest load so far (keyed by name,
        // matching how sessions are stored and seeded).
        const lecturer = eligibleLecturers
          .filter(
            (l: any) => !lecturerBusy.has(cellKey(l.name || 'Unknown Lecturer', cell))
          )
          .sort(
            (a: any, b: any) =>
              loadOf(a.name || 'Unknown Lecturer') -
              loadOf(b.name || 'Unknown Lecturer')
          )[0];
        if (!lecturer) continue;

        const lecturerName = lecturer.name || 'Unknown Lecturer';

        timetable.push({
          Semester: normalizeSemester(cls.semester),
          className: cls.className,
          level: clsLevel,
          course,
          room: room.roomname,
          time: cell.time,
          lecturer: lecturerName,
          day: cell.day,
        });

        roomBusy.add(cellKey(room.roomname, cell));
        lecturerBusy.add(cellKey(lecturerName, cell));
        classBusy.add(cellKey(clsCohort, cell));
        lecturerLoad.set(lecturerName, loadOf(lecturerName) + 1);
        usedDays.add(cell.day);
        placed++;
        done = true;
        break;
      }

      if (!done) break; // no cell could take another meeting for this class
    }

    if (placed < needed) {
      unscheduled.push({
        className: cls.className,
        course,
        semester: normalizeSemester(cls.semester),
        needed,
        placed,
        reason:
          placed === 0
            ? 'Every suitable room or lecturer was already fully booked across the selected days and times. Add more rooms/lecturers or more time slots.'
            : `Only ${placed} of ${needed} weekly meetings could be placed — the selected days and times are nearly full.`,
      });
    }
  }

  return { timetable, unscheduled, warnings };
}
