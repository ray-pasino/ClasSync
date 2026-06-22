import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import TimeModel from '../../../../models/time';

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const time = new TimeModel({ startTime: body.startTime, endTime: body.endTime });
    await time.save();
    return NextResponse.json({ success: true, message: 'Schedule Added' });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: 'Error Adding Schedule' });
  }
}
