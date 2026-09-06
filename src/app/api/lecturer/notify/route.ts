import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';
import { sendSms } from '../../../../lib/notifyStudents';
import { leadMinutes } from '../../../../lib/classReminders';
import LecturerModel from '../../../../models/lecturer';

/**
 * Read the authenticated lecturer's SMS reminder preference. Mirrors the
 * student notify route.
 */
export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Authentication failed' }, { status: 401 });
  }
  try {
    await connectDB();
    const lecturer = await LecturerModel.findById(userId, 'phone smsReminders');
    if (!lecturer) {
      return NextResponse.json({ success: false, message: 'Lecturer not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      enabled: lecturer.smsReminders !== false,
      hasPhone: Boolean(lecturer.phone),
    });
  } catch (error) {
    console.error('Error reading lecturer notification preference:', error);
    return NextResponse.json({ success: false, message: 'Error reading preference' });
  }
}

/**
 * Turn per-class SMS reminders on or off for the authenticated lecturer.
 * Body: { enabled?: boolean } — omitted means enable.
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

    const lecturer = await LecturerModel.findById(userId);
    if (!lecturer) {
      return NextResponse.json({ success: false, message: 'Lecturer not found' }, { status: 404 });
    }

    lecturer.smsReminders = enabled;
    await lecturer.save();

    if (!enabled) {
      return NextResponse.json({ success: true, enabled: false });
    }
    if (!lecturer.phone) {
      return NextResponse.json({
        success: false,
        enabled: true,
        message: 'No phone number on record',
      });
    }

    const result = await sendSms(
      [String(lecturer.phone)],
      `Dear Lecturer, you will now receive an SMS ${leadMinutes()} minutes before each class you teach.`
    );
    return NextResponse.json({ success: result.sent, enabled: true, ...result });
  } catch (error) {
    console.error('Error updating lecturer notification preference:', error);
    return NextResponse.json({ success: false, message: 'Error sending notification' });
  }
}
