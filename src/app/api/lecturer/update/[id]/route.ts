import { NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/db';
import LecturerModel from '../../../../../models/lecturer';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await request.json();
    const courses = Array.isArray(body.courses)
      ? body.courses.filter(Boolean)
      : undefined;
    await LecturerModel.findByIdAndUpdate(
      params.id,
      {
        name: body.name,
        id: body.id,
        // Persist the multi-course list; keep legacy `course` as the first one
        // so anything still reading it stays correct.
        ...(courses
          ? { courses, course: courses[0] }
          : { course: body.course }),
        phone: body.phone,
        email: body.email,
      },
      { new: true }
    );
    return NextResponse.json({ success: true, message: 'Lecturer Info Updated' });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: 'Error Updating Lecturer Info' });
  }
}
