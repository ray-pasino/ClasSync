import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { hashDefaultLecturerPassword } from '../../../../lib/lecturerPassword';
import LecturerModel from '../../../../models/lecturer';

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    // New lecturers can log in immediately: their ID is the login ID and they
    // get the default password (password123), hashed before storage.
    const password = await hashDefaultLecturerPassword();
    const lecturer = new LecturerModel({
      name: body.name,
      id: body.id,
      course: body.course,
      phone: body.phone,
      email: body.email,
      password,
    });
    await lecturer.save();
    return NextResponse.json({ success: true, message: 'Lecturer Added' });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: 'Error Adding Lecturer' });
  }
}
