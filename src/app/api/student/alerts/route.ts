import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';
import { classMatchesStudent } from '../../../../lib/match';
import StudentModel from '../../../../models/student';
import AlertModel from '../../../../models/alert';

export const dynamic = 'force-dynamic';

// Recent change/cancellation alerts relevant to the authenticated student —
// those whose class label matches the student's program + level.
export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Authentication failed' }, { status: 401 });
  }
  try {
    await connectDB();
    const student = await StudentModel.findById(userId);
    if (!student) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
    }

    // Pull a recent window, then filter to this student's cohort in-app (the
    // match rule lives in shared code, not the query).
    const recent = await AlertModel.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
    const alerts = recent
      .filter((a: any) =>
        classMatchesStudent({ className: a.className, level: a.level }, student)
      )
      .slice(0, 20);

    return NextResponse.json({ success: true, alerts });
  } catch (error) {
    console.error('Error fetching student alerts:', error);
    return NextResponse.json({ success: false, message: 'Error fetching alerts' }, { status: 500 });
  }
}
