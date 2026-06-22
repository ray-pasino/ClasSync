import { connectDB } from './db';
import StudentModel from '../models/student';

const DEFAULT_MESSAGE =
  'Dear Student, your timetable for the semester has just been created. ' +
  'Log into your Students Portal to view your timetable.';

type NotifyResult = { sent: boolean; count?: number; reason?: string };

/**
 * Send an SMS via Infobip to the given phone numbers (or to every student on
 * record if no numbers are supplied). Reads credentials from the environment:
 *   INFOBIP_BASE_URL, INFOBIP_API_KEY, INFOBIP_SENDER
 *
 * Never throws — failures are logged and reported through the return value so
 * callers don't fail if SMS is down or unconfigured. These are server-only
 * variables and are never exposed to the browser.
 */
export async function sendSms(
  phoneNumbers: string[],
  message: string = DEFAULT_MESSAGE
): Promise<NotifyResult> {
  const baseUrl = process.env.INFOBIP_BASE_URL;
  const apiKey = process.env.INFOBIP_API_KEY;
  const sender = process.env.INFOBIP_SENDER || 'GCTU';

  if (!baseUrl || !apiKey) {
    console.warn('[sendSms] Infobip not configured; skipping SMS.');
    return { sent: false, reason: 'not_configured' };
  }

  const recipients = phoneNumbers.filter(
    (p) => typeof p === 'string' && p.trim().length > 0
  );
  if (recipients.length === 0) {
    return { sent: false, reason: 'no_recipients' };
  }

  try {
    const messages = recipients.map((to) => ({
      destinations: [{ to }],
      from: sender,
      text: message,
    }));

    const response = await fetch(`${baseUrl}/sms/2/text/advanced`, {
      method: 'POST',
      headers: {
        Authorization: `App ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[sendSms] Infobip responded ${response.status}: ${body}`);
      return { sent: false, reason: `infobip_${response.status}` };
    }

    console.log(`[sendSms] SMS dispatched to ${recipients.length} recipient(s).`);
    return { sent: true, count: recipients.length };
  } catch (error) {
    console.error('[sendSms] Error sending SMS:', error);
    return { sent: false, reason: 'exception' };
  }
}

/** Notify every student with a phone number on record. */
export async function notifyAllStudents(message: string = DEFAULT_MESSAGE) {
  await connectDB();
  const students = await StudentModel.find({}, 'phone').exec();
  const phoneNumbers = students.map((s: any) => s.phone).filter(Boolean);
  return sendSms(phoneNumbers, message);
}
