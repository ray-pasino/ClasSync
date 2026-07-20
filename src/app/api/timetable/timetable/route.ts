import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { collectData, generateTimetable, normalizeSemester } from '../../../../lib/timetable';
import { notifyAllStudents } from '../../../../lib/notifyStudents';
import TimetableModel from '../../../../models/timetable';

export const dynamic = 'force-dynamic';

// Retrieve the saved timetable.
export async function GET() {
  try {
    await connectDB();
    const timetable = await TimetableModel.findOne({}).exec();
    if (!timetable) {
      return NextResponse.json({ success: false, message: 'Timetable not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, timetable: timetable.timetable });
  } catch (error) {
    console.error('Error retrieving timetable:', error);
    return NextResponse.json({ success: false, message: 'Error retrieving timetable' }, { status: 500 });
  }
}

// Generate and save a new timetable, then notify students by SMS.
export async function POST(request: Request) {
  try {
    await connectDB();
    const { name, semester, days, programme } = await request.json();

    const data = await collectData();
    if (!data) {
      return NextResponse.json({ success: false, message: 'Error collecting data' }, { status: 500 });
    }

    // Canonicalise the selected period so it matches the class records and the
    // labels stored on each generated session.
    const canonicalSemester = normalizeSemester(semester);

    // The app keeps a single active timetable (GET returns the first document).
    // Merge into it rather than wiping everything:
    //   - sessions in OTHER semesters are always kept and never constrain the
    //     new run (different semesters can reuse rooms/times);
    //   - within THIS semester, a chosen programme rebuilds only itself and is
    //     kept clear of the other programmes, which are passed as `occupied` so
    //     the merged result stays 100% conflict-free. With no programme, this
    //     semester is fully regenerated.
    const existingDoc = await TimetableModel.findOne({}).exec();
    const existing: any[] = existingDoc?.timetable || [];
    const kept = existing.filter((s: any) => {
      if (s?.Semester !== canonicalSemester) return true;
      return programme ? s?.className !== programme : false;
    });
    const occupied = kept.filter((s: any) => s?.Semester === canonicalSemester);

    const { timetable: fresh, unscheduled, warnings } = generateTimetable(data, days, {
      semester: canonicalSemester,
      programme,
      occupied,
    });

    const merged = [...kept, ...fresh];

    await TimetableModel.deleteMany({});
    const info = new TimetableModel({ name, semester: canonicalSemester, timetable: merged });
    await info.save();

    // Notify students by SMS. Non-blocking: SMS failures must not fail
    // timetable generation.
    notifyAllStudents().catch((err) => console.error('Error notifying students:', err));

    return NextResponse.json({
      success: true,
      message: 'Timetable generated successfully',
      timetable: merged,
      unscheduled,
      warnings,
    });
  } catch (error) {
    console.error('Error Compiling Details For Timetable:', error);
    return NextResponse.json(
      { success: false, message: 'Error Compiling Details For Timetable' },
      { status: 500 }
    );
  }
}

// Delete part or all of the saved timetable, so the admin can clear things out
// before regenerating.
//   { scope: 'all' }            -> remove every timetable entirely
//   { semester }                -> remove all classes in that semester
//   { semester, className }     -> remove a single class from that semester
export async function DELETE(request: Request) {
  try {
    await connectDB();
    const { scope, semester, className, level } = await request.json().catch(() => ({}));

    if (scope === 'all' || (!semester && !className)) {
      await TimetableModel.deleteMany({});
      return NextResponse.json({ success: true, message: 'All timetables deleted' });
    }

    if (!semester) {
      return NextResponse.json(
        { success: false, message: 'A semester is required to delete a group.' },
        { status: 400 }
      );
    }

    // Pull matching sessions out of every timetable document's `timetable` array.
    // A level narrows the match to a single cohort of the programme.
    const match: Record<string, any> = { Semester: semester };
    if (className) match.className = className;
    if (level != null && level !== '') match.level = Number(level);
    await TimetableModel.updateMany({}, { $pull: { timetable: match } });

    // Drop any timetable documents left with no sessions, so the empty state
    // and the next regeneration stay clean.
    await TimetableModel.deleteMany({ timetable: { $size: 0 } });

    return NextResponse.json({
      success: true,
      message: className
        ? `${className} removed`
        : `${semester} timetable removed`,
    });
  } catch (error) {
    console.error('Error deleting timetable:', error);
    return NextResponse.json(
      { success: false, message: 'Error deleting timetable' },
      { status: 500 }
    );
  }
}
