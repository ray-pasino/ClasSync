import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import ClassModel from '../../../../models/class';

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const setclass = new ClassModel({
      className: body.className,
      course: body.course,
      semester: body.semester,
      meetings: body.meetings,
      population: body.population,
      unavailablerooms: body.unavailablerooms,
    });
    await setclass.save();
    return NextResponse.json({ success: true, message: 'Class Added' });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: 'Error Adding Class' });
  }
}
