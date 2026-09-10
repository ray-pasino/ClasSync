import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { getUserIdFromRequest } from '../../../../lib/auth';
import LecturerModel from '../../../../models/lecturer';
import AlertModel from '../../../../models/alert';

export const dynamic = 'force-dynamic';

// Recent change/cancellation alerts for classes the authenticated lecturer
// teaches (matched by the lecturer name recorded on each alert).
export async function GET(request: Request) {
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

    const recent = await AlertModel.find({ lecturerNames: lecturer.name })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();
    const dismissed = new Set(
      (lecturer.dismissedAlerts || []).map((id: any) => String(id))
    );
    // Flagged, not filtered — see the note on the student route.
    const alerts = recent.map((a: any) => ({
      ...a,
      dismissed: dismissed.has(String(a._id)),
    }));

    return NextResponse.json({ success: true, alerts });
  } catch (error) {
    console.error('Error fetching lecturer alerts:', error);
    return NextResponse.json({ success: false, message: 'Error fetching alerts' }, { status: 500 });
  }
}
