import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import StudentModel from '../../../../models/student';

export const dynamic = 'force-dynamic';

// Returns all students. (Originally getAllStudents.)
export async function GET() {
  try {
    await connectDB();
    const students = await StudentModel.find();
    if (students.length === 0) {
      return NextResponse.json({ success: false, message: 'No students found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: students }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Error fetching students', error: error.message },
      { status: 500 }
    );
  }
}
