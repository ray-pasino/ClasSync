import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import CourseModel from '../../../../models/course';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { id } = await request.json();
    await CourseModel.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Course Deleted' });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: true, message: 'Error' });
  }
}
