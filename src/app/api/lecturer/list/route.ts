import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import LecturerModel from '../../../../models/lecturer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const lecturer = await LecturerModel.find({});
    return NextResponse.json({ success: true, data: lecturer });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: 'Error Listing Lecturers' });
  }
}
