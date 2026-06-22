import { NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/db';
import ClassModel from '../../../../../models/class';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await request.json();
    await ClassModel.findByIdAndUpdate(
      params.id,
      {
        className: body.className,
        course: body.course,
        semester: body.semester,
        meetings: body.meetings,
        population: body.population,
        unavailablerooms: body.unavailablerooms,
      },
      { new: true }
    );
    return NextResponse.json({ success: true, message: 'Class Info Updated' });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: 'Error Updating Class Info' });
  }
}
