import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';
import { sendSms } from '../../../../lib/notifyStudents';
import LecturerModel from '../../../../models/lecturer';

/**
 * Subscribe the authenticated lecturer to timetable SMS notifications by
 * sending them a confirmation message. Mirrors the student notify route so the
 * Arkesel API key is never exposed to the browser.
 */
export async function POST(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Authentication failed' }, { status: 401 });
  }
  try {
    await connectDB();
    const lecturer = await LecturerModel.findById(userId);
    if (!lecturer) {
      return NextResponse.json({ success: false, message: 'Lecturer not found' }, { status: 404 });
    }
    if (!lecturer.phone) {
      return NextResponse.json({ success: false, message: 'No phone number on record' });
    }

    const result = await sendSms(
      [String(lecturer.phone)],
      'Dear Lecturer, you will now receive SMS notifications on your teaching schedule.'
    );
    return NextResponse.json({ success: result.sent, ...result });
  } catch (error) {
    console.error('Error subscribing lecturer to notifications:', error);
    return NextResponse.json({ success: false, message: 'Error sending notification' });
  }
}
