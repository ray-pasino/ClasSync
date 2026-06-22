import { NextResponse } from 'next/server';

type Mapped = { message: string; status: number };

// Translates an unknown thrown error into a safe, user-facing message.
// Raw technical details (stack traces, driver errors, connection strings)
// must never be sent to the client — they are logged server-side instead.
function classify(error: unknown): Mapped {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  // Database / network reachability problems — e.g. MongoDB Atlas unreachable,
  // "Socket 'secureConnect' timed out", server selection timeouts, DNS or
  // connection-refused errors. These are transient, so we tell the user to retry.
  const connectivity = [
    'secureconnect',
    'timed out',
    'timeout',
    'etimedout',
    'econnrefused',
    'econnreset',
    'enotfound',
    'server selection',
    'topology',
    'failed to connect',
    'getaddrinfo',
    'mongonetwork',
    'connection',
  ];
  if (connectivity.some((needle) => lower.includes(needle))) {
    return {
      message:
        'We’re having trouble connecting to the server right now. Please check your internet connection and try again in a moment.',
      status: 503,
    };
  }

  return {
    message: 'Something went wrong on our end. Please try again.',
    status: 500,
  };
}

// User-facing message only (when you build the response yourself).
export function toUserMessage(error: unknown): string {
  return classify(error).message;
}

// Logs the real error under `context` and returns a safe JSON error response.
export function errorResponse(context: string, error: unknown) {
  console.error(`${context}:`, error);
  const { message, status } = classify(error);
  return NextResponse.json({ success: false, message }, { status });
}
