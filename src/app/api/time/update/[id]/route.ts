import { NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/db';
import TimeModel from '../../../../../models/time';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await request.json();
    await TimeModel.findByIdAndUpdate(
      params.id,
      { startTime: body.startTime, endTime: body.endTime },
      { new: true }
    );
    return NextResponse.json({ success: true, message: 'Schedule Updated' });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: 'Error Updating Schedule' });
  }
}
