import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import RoomModel from '../../../../models/room';

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const room = new RoomModel({ roomname: body.roomname, capacity: body.capacity });
    await room.save();
    return NextResponse.json({ success: true, message: 'Room Added' });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: 'Error Adding Room' });
  }
}
