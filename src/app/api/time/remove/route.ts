import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import TimeModel from '../../../../models/time';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { id } = await request.json();
    await TimeModel.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Schedule Deleted' });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: true, message: 'Error' });
  }
}
