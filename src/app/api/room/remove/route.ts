import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import RoomModel from '../../../../models/room';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { id } = await request.json();
    await RoomModel.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Lecture Room Deleted' });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: true, message: 'Error' });
  }
}
