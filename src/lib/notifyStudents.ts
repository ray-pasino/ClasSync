import { connectDB } from './db';
import StudentModel from '../models/student';

const DEFAULT_MESSAGE =
  'Dear Student, your timetable for the semester has just been created. ' +
  'Log into your Students Portal to view your timetable.';

type NotifyResult = {
  sent: boolean;
  count?: number;
  reason?: string;
  // True when the request went to Arkesel in sandbox mode: validated and
  // billed as nothing, with no message actually delivered. Surfaced so a
  // sandbox run is never mistaken for a real send in logs or API responses.
  sandbox?: boolean;
};

/**
 * Arkesel's v2 API accepts `sandbox: true`, which validates and accepts the
 * request without delivering or charging for anything. Enable it with
 * ARKESEL_SANDBOX=true to exercise the full send path — real credentials, real
 * recipients, real response handling — at zero cost.
 */
export function sandboxEnabled(): boolean {
  return String(process.env.ARKESEL_SANDBOX ?? '').toLowerCase() === 'true';
}

// Arkesel's SMS v2 endpoint. Accepts a JSON body with many recipients at once.
const ARKESEL_ENDPOINT = 'https://sms.arkesel.com/api/v2/sms/send';

/**
 * Normalise a Ghanaian phone number to the international MSISDN form Arkesel
 * expects (e.g. "233241234567"). Handles the common stored forms:
 * "0241234567", "+233241234567", "233241234567" and a bare "241234567".
 * Returns '' if nothing usable is left after stripping.
 */
export function normalizeGhanaMsisdn(raw: string): string {
  const digits = String(raw ?? '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('233')) return digits;
  if (digits.startsWith('0')) return `233${digits.slice(1)}`;
  // A 9-digit local number missing its leading 0 (e.g. "241234567").
  if (digits.length === 9) return `233${digits}`;
  return digits;
}

/**
 * Send an SMS via Arkesel to the given phone numbers (or to every student on
 * record if no numbers are supplied). Reads credentials from the environment:
 *   ARKESEL_API_KEY, ARKESEL_SENDER
 *
 * Never throws — failures are logged and reported through the return value so
 * callers don't fail if SMS is down or unconfigured. These are server-only
 * variables and are never exposed to the browser.
 */
export async function sendSms(
  phoneNumbers: string[],
  message: string = DEFAULT_MESSAGE
): Promise<NotifyResult> {
  const apiKey = process.env.ARKESEL_API_KEY;
  // Arkesel sender IDs are max 11 characters and must be pre-approved.
  const sender = process.env.ARKESEL_SENDER || 'GCTU';

  if (!apiKey) {
    console.warn('[sendSms] Arkesel not configured; skipping SMS.');
    return { sent: false, reason: 'not_configured' };
  }

  // Normalise, drop blanks, and de-duplicate so a person on record twice (e.g.
  // a student who is also matched as a lecturer) isn't billed/messaged twice.
  const recipients = Array.from(
    new Set(
      phoneNumbers
        .map((p) => normalizeGhanaMsisdn(p))
        .filter((p) => p.length > 0)
    )
  );
  if (recipients.length === 0) {
    return { sent: false, reason: 'no_recipients' };
  }

  const sandbox = sandboxEnabled();

  try {
    const response = await fetch(ARKESEL_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      // Only send `sandbox` when it's on — Arkesel omits the field entirely for
      // live sends rather than passing false.
      body: JSON.stringify({
        sender,
        message,
        recipients,
        ...(sandbox ? { sandbox: true } : {}),
      }),
    });

    const body = await response.text();
    if (!response.ok) {
      console.error(`[sendSms] Arkesel responded ${response.status}: ${body}`);
      return { sent: false, reason: `arkesel_${response.status}`, sandbox };
    }

    // Arkesel returns { status: "success", ... } on a successful submission.
    let status = '';
    try {
      status = JSON.parse(body)?.status ?? '';
    } catch {
      /* non-JSON body — fall through to the status check below */
    }
    if (status && status !== 'success') {
      console.error(`[sendSms] Arkesel rejected the request: ${body}`);
      return { sent: false, reason: `arkesel_${status}`, sandbox };
    }

    console.log(
      `[sendSms] SMS ${sandbox ? 'accepted in SANDBOX mode (nothing delivered or billed)' : 'dispatched'} to ${recipients.length} recipient(s).`
    );
    return { sent: true, count: recipients.length, sandbox };
  } catch (error) {
    console.error('[sendSms] Error sending SMS:', error);
    return { sent: false, reason: 'exception', sandbox };
  }
}

/** Notify every student with a phone number on record. */
export async function notifyAllStudents(message: string = DEFAULT_MESSAGE) {
  await connectDB();
  const students = await StudentModel.find({}, 'phone').exec();
  const phoneNumbers = students.map((s: any) => s.phone).filter(Boolean);
  return sendSms(phoneNumbers, message);
}
