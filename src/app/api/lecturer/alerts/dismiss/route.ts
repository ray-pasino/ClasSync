import { NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/db';
import { getUserIdFromRequest } from '../../../../../lib/auth';
import LecturerModel from '../../../../../models/lecturer';

export const dynamic = 'force-dynamic';

// Read the ids to act on. An empty/absent list means "everything", which is
// how Clear all and Restore all are expressed.
async function readIds(request: Request): Promise<string[] | null> {
  try {
    const body = await request.json();
    const ids = body?.alertIds ?? (body?.alertId ? [body.alertId] : null);
    if (!Array.isArray(ids)) return null;
    return ids.map((id: unknown) => String(id)).filter(Boolean);
  } catch {
    return null;
  }
}

// Dismiss alerts for the signed-in lecturer. Dismissal is per-user: the alert
// document itself is shared and is never modified here.
export async function POST(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Authentication failed' }, { status: 401 });
  }
  const ids = await readIds(request);
  if (!ids || ids.length === 0) {
    return NextResponse.json({ success: false, message: 'No alerts specified' }, { status: 400 });
  }
  try {
    await connectDB();
    const user = await LecturerModel.findByIdAndUpdate(
      userId,
      { $addToSet: { dismissedAlerts: { $each: ids } } },
      { new: true }
    ).select('dismissedAlerts');
    if (!user) {
      return NextResponse.json({ success: false, message: 'Lecturer not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, dismissedAlerts: user.dismissedAlerts });
  } catch (error) {
    console.error('Error dismissing alerts:', error);
    return NextResponse.json({ success: false, message: 'Error dismissing alerts' }, { status: 500 });
  }
}

// Restore alerts. With no ids, restores every dismissed alert.
export async function DELETE(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Authentication failed' }, { status: 401 });
  }
  const ids = await readIds(request);
  try {
    await connectDB();
    const update =
      ids && ids.length > 0
        ? { $pull: { dismissedAlerts: { $in: ids } } }
        : { $set: { dismissedAlerts: [] } };
    const user = await LecturerModel.findByIdAndUpdate(userId, update, {
      new: true,
    }).select('dismissedAlerts');
    if (!user) {
      return NextResponse.json({ success: false, message: 'Lecturer not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, dismissedAlerts: user.dismissedAlerts });
  } catch (error) {
    console.error('Error restoring alerts:', error);
    return NextResponse.json({ success: false, message: 'Error restoring alerts' }, { status: 500 });
  }
}
