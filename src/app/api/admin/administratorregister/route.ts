import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import { connectDB } from '../../../../lib/db';
import { createToken } from '../../../../lib/auth';
import AdminModel from '../../../../models/admin';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { name, password, id, email, team, phone, campus } = await request.json();

    const exist = await AdminModel.findOne({ email });
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

    const newUser = new AdminModel({
      name, id, email, password: hashedPassword, team, phone, campus,
    });
    const user = await newUser.save();
    const token = createToken(user._id.toString());
    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: 'Error' });
  }
}
