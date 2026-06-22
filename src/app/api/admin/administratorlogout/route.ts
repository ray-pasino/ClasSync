import { NextResponse } from 'next/server';

// Token is cleared on the client; nothing to do server-side.
export async function POST() {
  return NextResponse.json({ success: true, message: 'Logged out successfully' });
}
