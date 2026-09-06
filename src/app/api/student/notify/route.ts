import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';
import { sendSms } from '../../../../lib/notifyStudents';
import { leadMinutes } from '../../../../lib/classReminders';
import StudentModel from '../../../../models/student';

/**
 * Read the authenticated student's SMS reminder preference so the sidebar
 * toggle can render the real stored state instead of assuming "on".
 */
export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Authentication failed' }, { status: 401 });
  }
  try {
    await connectDB();
    const student = await StudentModel.findById(userId, 'phone smsReminders');
    if (!student) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      enabled: student.smsReminders !== false,
      hasPhone: Boolean(student.phone),
    });
  } catch (error) {
    console.error('Error reading student notification preference:', error);
    return NextResponse.json({ success: false, message: 'Error reading preference' });
  }
}

/**
 * Turn per-class SMS reminders on or off for the authenticated student.
 * Body: { enabled?: boolean } — omitted means enable, matching the original
 * subscribe-only behaviour of this route.
 *
 * Enabling stores the opt-in *and* sends a confirmation text; the earlier
 * version only sent the text, which is why the promise it made was never kept.
 */
export async function POST(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Authentication failed' }, { status: 401 });
  }
  try {
    await connectDB();

    let enabled = true;
    try {
      const body = await request.json();
      if (typeof body?.enabled === 'boolean') enabled = body.enabled;
    } catch {
      /* empty body — keep the default of enabling */
    }

    const student = await StudentModel.findById(userId);
    if (!student) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
    }

    student.smsReminders = enabled;
    await student.save();

    if (!enabled) {
      return NextResponse.json({ success: true, enabled: false });
    }
    if (!student.phone) {
      return NextResponse.json({
        success: false,
        enabled: true,
        message: 'No phone number on record',
      });
    }

    const result = await sendSms(
      [student.phone],
      `Dear Student, you will now receive an SMS ${leadMinutes()} minutes before each of your classes.`
    );
    return NextResponse.json({ success: result.sent, enabled: true, ...result });
  } catch (error) {
    console.error('Error updating student notification preference:', error);
    return NextResponse.json({ success: false, message: 'Error sending notification' });
  }
}
