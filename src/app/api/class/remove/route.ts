import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import ClassModel from '../../../../models/class';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { id } = await request.json();
    await ClassModel.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Class Deleted' });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: true, message: 'Error' });
  }
}
