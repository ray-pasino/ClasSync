import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import RoomModel from '../../../../models/room';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const count = await RoomModel.countDocuments({});
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: 'Error Counting Rooms' });
  }
}
