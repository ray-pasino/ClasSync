import { NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/db';
import CourseModel from '../../../../../models/course';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await request.json();
    await CourseModel.findByIdAndUpdate(
      params.id,
      {
        code: body.code,
        name: body.name,
        lecturer: body.lecturer,
        credithours: body.credithours,
      },
      { new: true }
    );
    return NextResponse.json({ success: true, message: 'Course Info Updated' });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: 'Error Updating Course Info' });
  }
}
