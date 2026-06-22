import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import TimeModel from '../../../../models/time';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const time = await TimeModel.find({});
    return NextResponse.json({ success: true, data: time });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: 'Error Listing Schedule' });
  }
}
