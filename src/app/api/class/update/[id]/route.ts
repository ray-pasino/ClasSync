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
        $set: {
          className: body.className,
          courses: body.courses,
          semester: body.semester,
          level: body.level ? Number(body.level) : undefined,
          population: body.population,
          unavailablerooms: body.unavailablerooms,
        },
        // Drop the legacy single-course fields once a record is saved via the
        // multi-course form, so stale data can't leak into the generator.
        $unset: { course: '', meetings: '' },
      },
      { new: true }
    );
    return NextResponse.json({ success: true, message: 'Class Info Updated' });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: 'Error Updating Class Info' });
  }
}
