import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import { connectDB } from '../../../../lib/db';
import { createToken } from '../../../../lib/auth';
import LecturerModel from '../../../../models/lecturer';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { name, id, email, password, phone, faculty, department, campus, course, courses } =
      await request.json();
    const courseList = Array.isArray(courses) ? courses.filter(Boolean) : [];

    const exist = await LecturerModel.findOne({ email });
    if (exist) {
      return NextResponse.json({ success: false, message: 'User already exists' });
    }
    if (!validator.isEmail(email)) {
      return NextResponse.json({ success: false, message: 'Please enter a valid email' });
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, message: 'Please enter a strong password' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new LecturerModel({
      name, email, id, password: hashedPassword, phone, faculty, department, campus,
      courses: courseList,
      course: courseList[0] ?? course,
    });
    const user = await newUser.save();
    const token = createToken(user._id.toString());
    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: error.message });
  }
}
