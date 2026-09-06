import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '../../../../lib/db';
import { createToken } from '../../../../lib/auth';
import { errorResponse } from '../../../../lib/apiError';
import { parseLoginId } from '../../../../lib/loginId';
import StudentModel from '../../../../models/student';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { id, password } = await request.json();

    const loginId = parseLoginId(id);
    if (loginId === null || typeof password !== 'string') {
      return NextResponse.json({ success: false, message: 'ID or password is incorrect' });
    }

    const user = await StudentModel.findOne({ id: loginId });
    if (!user) {
      return NextResponse.json({ success: false, message: 'ID or password is incorrect' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ success: false, message: 'ID or password is incorrect' });
    }

    const token = createToken(user._id.toString());
    return NextResponse.json({ success: true, token });
  } catch (error) {
    return errorResponse('Student login error', error);
  }
}
