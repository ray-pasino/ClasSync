import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;

export function createToken(id: string): string {
  return jwt.sign({ id }, JWT_SECRET);
}

/**
 * Extract and verify the user id from a request's `Authorization: Bearer <jwt>`
 * header. Returns the user id, or null if the token is missing/invalid.
 */
export function getUserIdFromRequest(request: Request): string | null {
  const header = request.headers.get('authorization') || '';
  const token = header.replace('Bearer ', '').trim();
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    return decoded.id;
  } catch {
    return null;
  }
}
