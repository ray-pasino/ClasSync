import bcrypt from 'bcryptjs';

// Default password every lecturer gets when an admin creates them. Lecturers
// sign in with their Lecturer ID + this password until a reset flow exists.
export const DEFAULT_LECTURER_PASSWORD = 'password123';

/** Hash a plaintext password with the same cost factor used across the app. */
export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

/** Convenience: a freshly hashed copy of the default lecturer password. */
export function hashDefaultLecturerPassword(): Promise<string> {
  return hashPassword(DEFAULT_LECTURER_PASSWORD);
}
