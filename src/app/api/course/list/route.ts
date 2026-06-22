import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import CourseModel from '../../../../models/course';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const course = await CourseModel.find({});
    return NextResponse.json({ success: true, data: course });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: 'Error Listing Courses' });
  }
}
