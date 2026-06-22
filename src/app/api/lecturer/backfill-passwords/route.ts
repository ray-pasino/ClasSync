import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { hashDefaultLecturerPassword } from '../../../../lib/lecturerPassword';
import { errorResponse } from '../../../../lib/apiError';
import LecturerModel from '../../../../models/lecturer';

export const dynamic = 'force-dynamic';

/**
 * One-shot migration: give every existing lecturer that has no password the
 * default (password123), so they can log in with their ID just like newly
 * added lecturers. Pass `?force=true` to (re)set ALL lecturers to the default.
 *
 * Idempotent — safe to call more than once.
 */
export async function POST(request: Request) {
  try {
    await connectDB();
    const force = new URL(request.url).searchParams.get('force') === 'true';
    const hashed = await hashDefaultLecturerPassword();

    const filter = force
      ? {}
      : {
          $or: [
            { password: { $exists: false } },
            { password: null },
            { password: '' },
          ],
        };

    const result = await LecturerModel.updateMany(filter, {
      $set: { password: hashed },
    });

    return NextResponse.json({
      success: true,
      message: force
        ? 'All lecturers reset to the default password.'
        : 'Lecturers without a password were given the default password.',
      updated: result.modifiedCount,
    });
  } catch (error) {
    return errorResponse('Lecturer password backfill error', error);
  }
}
