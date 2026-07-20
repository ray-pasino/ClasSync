'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Megaphone, CalendarX, AlertTriangle, Send } from 'lucide-react';
import { cohortLabel } from '../../lib/match';

export type NotifyTarget = {
  semester: string;
  className: string;
  level?: number;
  // The cohort's placed sessions, so cancellation can target a specific course
  // (and the exact day/time it won't hold).
  sessions?: { course: string; day: string; time: string }[];
};
export type AlertType = 'cancellation' | 'change';

export type AlertPayload = {
  type: AlertType;
  message: string;
  // Cancellation only: which course, and optionally which single session.
  course?: string;
  day?: string;
  time?: string;
};

// Sentinel for "cancel every session of the chosen course".
const ALL = 'all';

interface Props {
  // The class the alert targets; null keeps the dialog closed.
  target: NotifyTarget | null;
  onClose: () => void;
  // Dispatch the alert. Resolves true on success (dialog then closes), false
  // otherwise (dialog stays open so the sender can retry).
  onSend: (payload: AlertPayload) => Promise<boolean>;
  // Explains what "Cancel class" removes, since it differs by role
  // (admin: the whole class; lecturer: only their own sessions).
  cancelNote: string;
}

/**
 * Shared dialog for raising a class change/cancellation alert. Used by both the
 * admin dashboard and the lecturer schedule page; the caller owns the request
 * and toast via `onSend`.
 *
 * A cancellation is scoped to a single course of the cohort (not the whole
 * timetable), and optionally to one day's session of that course.
 */
const NotifyDialog = ({ target, onClose, onSend, cancelNote }: Props) => {
  const [type, setType] = useState<AlertType>('change');
  const [message, setMessage] = useState('');
  const [messageEdited, setMessageEdited] = useState(false);
  const [course, setCourse] = useState('');
  const [session, setSession] = useState<string>(ALL);
  const [sending, setSending] = useState(false);

  const label = target ? cohortLabel(target.className, target.level) : '';
  const sessions = useMemo(() => target?.sessions ?? [], [target]);

  // Distinct courses on this cohort, and the sessions of the chosen course.
  const courses = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.course).filter(Boolean))),
    [sessions]
  );
  const courseSessions = useMemo(
    () => sessions.filter((s) => s.course === course),
    [sessions, course]
  );
  const chosen = session === ALL ? null : courseSessions.find((s) => `${s.day}__${s.time}` === session);

  // Compose the default wording from the current selection.
  const autoMessage = (): string => {
    if (type === 'change') {
      return `Notice: there is a change to the ${label} schedule. Please check your timetable in the portal for the update.`;
    }
    const c = course || 'class';
    const when = chosen ? ` on ${chosen.day} (${chosen.time})` : '';
    return `Notice: the ${c} class for ${label} will not hold${when}. Please check your timetable in the portal.`;
  };

  // Reset everything when the dialog opens on a new cohort. Default to the first
  // course and its first session (the specific day it won't hold).
  useEffect(() => {
    if (!target) return;
    setType('change');
    setMessageEdited(false);
    const all = target.sessions ?? [];
    const firstCourse = all[0]?.course ?? '';
    setCourse(firstCourse);
    const firstSess = all.find((s) => s.course === firstCourse);
    setSession(firstSess ? `${firstSess.day}__${firstSess.time}` : ALL);
  }, [target]);

  // Keep the message in sync with the selection until the sender edits it.
  useEffect(() => {
    if (!target || messageEdited) return;
    setMessage(autoMessage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, type, course, session, messageEdited]);

  if (!target) return null;

  const handleSend = async () => {
    if (!message.trim()) return;
    if (type === 'cancellation' && !course) return;
    setSending(true);
    try {
      const payload: AlertPayload = { type, message };
      if (type === 'cancellation') {
        payload.course = course;
        if (chosen) {
          payload.day = chosen.day;
          payload.time = chosen.time;
        }
      }
      const ok = await onSend(payload);
      if (ok) onClose();
    } finally {
      setSending(false);
    }
  };

  const selectClass =
    'w-full border border-[#D8DEEC] rounded-[10px] px-3.5 py-2.5 bg-[#F7F9FD] text-sm text-b-blue focus:outline-none focus:border-accent focus:bg-white transition-colors';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[rgba(15,18,45,0.55)] backdrop-blur-sm"
      onClick={() => !sending && onClose()}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        style={{ animation: 'modal-pop 0.18s ease-out' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-b-blue px-6 py-5">
          <div className="flex items-center gap-2.5">
            <span className="h-9 w-9 shrink-0 rounded-lg bg-white/15 flex items-center justify-center text-white">
              <Megaphone size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-white font-semibold text-lg leading-tight truncate">
                Notify {label}
              </h2>
              <p className="text-white/60 text-xs mt-0.5">{target.semester}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('change')}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                type === 'change'
                  ? 'border-accent bg-accent/5 text-accent'
                  : 'border-[#E8ECF6] text-gray-500 hover:bg-page-bg'
              }`}
            >
              <Megaphone size={16} /> Announce change
            </button>
            <button
              type="button"
              onClick={() => setType('cancellation')}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                type === 'cancellation'
                  ? 'border-red-300 bg-red-50 text-red-600'
                  : 'border-[#E8ECF6] text-gray-500 hover:bg-page-bg'
              }`}
            >
              <CalendarX size={16} /> Cancel a class
            </button>
          </div>

          {/* Cancellation: choose the course and (optionally) the session. */}
          {type === 'cancellation' && (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="cancel-course"
                  className="block text-sm font-semibold text-b-blue mb-1.5"
                >
                  Course to cancel
                </label>
                <select
                  id="cancel-course"
                  className={selectClass}
                  value={course}
                  onChange={(e) => {
                    const c = e.target.value;
                    setCourse(c);
                    const firstSess = sessions.find((s) => s.course === c);
                    setSession(firstSess ? `${firstSess.day}__${firstSess.time}` : ALL);
                    setMessageEdited(false);
                  }}
                >
                  {courses.length === 0 && <option value="">No courses on the timetable</option>}
                  {courses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {courseSessions.length > 1 && (
                <div>
                  <label
                    htmlFor="cancel-session"
                    className="block text-sm font-semibold text-b-blue mb-1.5"
                  >
                    Day it won&apos;t hold
                  </label>
                  <select
                    id="cancel-session"
                    className={selectClass}
                    value={session}
                    onChange={(e) => {
                      setSession(e.target.value);
                      setMessageEdited(false);
                    }}
                  >
                    <option value={ALL}>Every {course} session</option>
                    {courseSessions.map((s) => (
                      <option key={`${s.day}__${s.time}`} value={`${s.day}__${s.time}`}>
                        {s.day} · {s.time}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 leading-relaxed">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                {cancelNote}
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="alert-message"
              className="block text-sm font-semibold text-b-blue mb-1.5"
            >
              Message
            </label>
            <textarea
              id="alert-message"
              rows={4}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setMessageEdited(true);
              }}
              className="w-full border border-[#D8DEEC] rounded-[10px] px-3.5 py-3 bg-[#F7F9FD] text-sm text-b-blue focus:outline-none focus:border-accent focus:bg-white transition-colors resize-none"
              placeholder="What should the students and lecturers be told?"
            />
            <p className="text-[11px] text-gray-400 font-light mt-1.5">
              Sent by SMS and shown in the affected users&apos; portals.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="flex-1 rounded-xl py-3 font-semibold text-gray-600 bg-page-bg hover:bg-gray-100 transition disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !message.trim() || (type === 'cancellation' && !course)}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                type === 'cancellation'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-accent hover:brightness-105'
              }`}
            >
              {sending ? (
                'Sending…'
              ) : (
                <>
                  <Send size={15} />
                  {type === 'cancellation' ? 'Cancel & Notify' : 'Send Alert'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotifyDialog;
