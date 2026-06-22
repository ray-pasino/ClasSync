import { NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/db';
import RoomModel from '../../../../../models/room';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await request.json();
    await RoomModel.findByIdAndUpdate(
      params.id,
      { roomname: body.roomname, capacity: body.capacity },
      { new: true }
    );
    return NextResponse.json({ success: true, message: 'Room Updated' });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: 'Error Updating Room' });
  }
}
