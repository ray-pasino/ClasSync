import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';
import { sendSms } from '../../../../lib/notifyStudents';
import StudentModel from '../../../../models/student';

/**
 * Subscribe the authenticated student to timetable SMS notifications by
 * sending them a confirmation message. Replaces the old client-side Infobip
 * call so the API key is never exposed to the browser.
 */
export async function POST(request: Request) {
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
    if (!student.phone) {
      return NextResponse.json({ success: false, message: 'No phone number on record' });
    }

    const result = await sendSms(
      [student.phone],
      'Dear Student, you will now receive SMS notifications on your timetable schedule.'
    );
    return NextResponse.json({ success: result.sent, ...result });
  } catch (error) {
    console.error('Error subscribing student to notifications:', error);
    return NextResponse.json({ success: false, message: 'Error sending notification' });
  }
}
