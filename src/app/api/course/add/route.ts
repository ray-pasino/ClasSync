import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import CourseModel from '../../../../models/course';

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const course = new CourseModel({
      code: body.code,
      name: body.name,
      lecturer: body.lecturer,
      credithours: body.credithours,
    });
    await course.save();
    return NextResponse.json({ success: true, message: 'Course Added' });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: 'Error Adding Course' });
  }
}
