import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { collectData, generateTimetable } from '../../../../lib/timetable';
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
    const { name, semester, days } = await request.json();

    const data = await collectData();
    if (!data) {
      return NextResponse.json({ success: false, message: 'Error collecting data' }, { status: 500 });
    }

    const timetable = generateTimetable(data, days);

    const info = new TimetableModel({ name, semester, timetable });
    await info.save();

    // Notify students by SMS. Non-blocking: SMS failures must not fail
    // timetable generation.
    notifyAllStudents().catch((err) => console.error('Error notifying students:', err));

    return NextResponse.json({ success: true, message: 'Timetable generated successfully', timetable });
  } catch (error) {
    console.error('Error Compiling Details For Timetable:', error);
    return NextResponse.json(
      { success: false, message: 'Error Compiling Details For Timetable' },
      { status: 500 }
    );
  }
}
