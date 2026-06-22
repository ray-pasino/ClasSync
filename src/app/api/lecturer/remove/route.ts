import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import LecturerModel from '../../../../models/lecturer';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { id } = await request.json();
    await LecturerModel.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Lecturer Deleted' });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: true, message: 'Error' });
  }
}
