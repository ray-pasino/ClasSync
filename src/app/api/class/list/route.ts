import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import ClassModel from '../../../../models/class';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const setclass = await ClassModel.find({});
    return NextResponse.json({ success: true, data: setclass });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: 'Error Listing Classes' });
  }
}
