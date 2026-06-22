import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import TimetableModel from '../../../../models/timetable';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { id } = await request.json();
    await TimetableModel.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Timetable Deleted' });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: 'Error' });
  }
}
