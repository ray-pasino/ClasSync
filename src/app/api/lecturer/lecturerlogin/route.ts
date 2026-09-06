import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '../../../../lib/db';
import { createToken } from '../../../../lib/auth';
import { errorResponse } from '../../../../lib/apiError';
import { parseLoginId } from '../../../../lib/loginId';
import { hashDefaultLecturerPassword } from '../../../../lib/lecturerPassword';
import LecturerModel from '../../../../models/lecturer';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { id, password } = await request.json();

    const loginId = parseLoginId(id);
    if (loginId === null) {
      return NextResponse.json({ success: false, message: 'ID is incorrect' });
    }
    if (typeof password !== 'string') {
      return NextResponse.json({ success: false, message: 'password is incorrect' });
    }

    const user = await LecturerModel.findOne({ id: loginId });
    if (!user) {
      return NextResponse.json({ success: false, message: 'ID is incorrect' });
    }

    // Lecturers created before default passwords existed have none stored.
    // Lazily give them the default (password123) so they get the same login
    // ability as newly-added lecturers, without a manual migration.
    if (!user.password) {
      const hashed = await hashDefaultLecturerPassword();
      await LecturerModel.updateOne({ _id: user._id }, { $set: { password: hashed } });
      user.password = hashed;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ success: false, message: 'password is incorrect' });
    }

    const token = createToken(user._id.toString());
    return NextResponse.json({ success: true, token });
  } catch (error) {
    return errorResponse('Lecturer login error', error);
  }
}
