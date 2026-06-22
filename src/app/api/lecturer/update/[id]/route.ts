import { NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/db';
import LecturerModel from '../../../../../models/lecturer';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await request.json();
    await LecturerModel.findByIdAndUpdate(
      params.id,
      {
        name: body.name,
        id: body.id,
        course: body.course,
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
