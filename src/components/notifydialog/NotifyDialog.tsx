'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Megaphone,
  CalendarX,
  AlertTriangle,
  Send,
  CalendarClock,
  Loader2,
} from 'lucide-react';
import { cohortLabel } from '../../lib/match';

export type NotifyTarget = {
  semester: string;
  className: string;
  level?: number;
  // The cohort's placed sessions, so cancellation can target a specific course
  // (and the exact day/time it won't hold), and a change can move one of them.
  sessions?: { course: string; day: string; time: string; room?: string }[];
};
export type AlertType = 'cancellation' | 'change';

// A day/time the cohort, its lecturer and at least one room are all free.
export type FreeSlot = {
  day: string;
  time: string;
  rooms: Array<{ roomname: string; capacity: number }>;
};

export type AlertPayload = {
  type: AlertType;
  message: string;
  // Which course, and optionally which single session: required for a
  // cancellation, and for a change that reschedules.
  course?: string;
  day?: string;
  time?: string;
  // Change only: move that session to this slot.
  moveTo?: { day: string; time: string; room?: string };
  // True when the move is for this week only and the timetable must be left
  // as it is; false when the session is moved on the timetable for good.
  oneOff?: boolean;
};

export type RescheduleKind = 'oneOff' | 'permanent';

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
  // Supplying this turns on rescheduling: the sender can move a session to a
  // free slot instead of only announcing that something changed. Left out, the
  // change tab is announcement-only — which is what the lecturer portal wants,
  // since moving a session rewrites the timetable everyone else reads.
  findFreeSlots?: (ref: {
    course: string;
    day: string;
    time: string;
  }) => Promise<FreeSlot[]>;
  // Which kinds of move this caller permits. A lecturer may only move a class
  // for the week; an administrator may also move it on the timetable for good.
  // Defaults to a one-off, the safer of the two.
  rescheduleKinds?: RescheduleKind[];
}

/**
 * Shared dialog for raising a class change/cancellation alert. Used by both the
 * admin dashboard and the lecturer schedule page; the caller owns the request
 * and toast via `onSend`.
 *
 * A cancellation is scoped to a single course of the cohort (not the whole
 * timetable), and optionally to one day's session of that course.
 *
 * A change can additionally move one session to a slot where the cohort, the
 * lecturer and a room are all free — the free slots come from the caller, which
 * asks the server rather than guessing from what the browser happens to hold.
 */
const NotifyDialog = ({
  target,
  onClose,
  onSend,
  cancelNote,
  findFreeSlots,
  rescheduleKinds = ['oneOff'],
}: Props) => {
  const [type, setType] = useState<AlertType>('change');
  const [message, setMessage] = useState('');
  const [messageEdited, setMessageEdited] = useState(false);
  const [course, setCourse] = useState('');
  const [session, setSession] = useState<string>(ALL);
  const [sending, setSending] = useState(false);

  // Reschedule state.
  const [reschedule, setReschedule] = useState(false);
  const [slots, setSlots] = useState<FreeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState('');
  const [newDay, setNewDay] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newRoom, setNewRoom] = useState('');
  // A plain string, so the reset effect below can depend on it without
  // re-running on every render the way an array prop would.
  const defaultKind = rescheduleKinds[0];
  const [kind, setKind] = useState<RescheduleKind>(defaultKind);

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
  const chosen =
    session === ALL
      ? null
      : courseSessions.find((s) => `${s.day}__${s.time}` === session);

  // Free slots, narrowed by what has been picked so far.
  const freeDays = useMemo(
    () => Array.from(new Set(slots.map((s) => s.day))),
    [slots]
  );
  const freeTimes = useMemo(
    () => slots.filter((s) => s.day === newDay).map((s) => s.time),
    [slots, newDay]
  );
  const freeRooms = useMemo(
    () => slots.find((s) => s.day === newDay && s.time === newTime)?.rooms ?? [],
    [slots, newDay, newTime]
  );

  const canReschedule = Boolean(findFreeSlots) && type === 'change';
  const moving = reschedule && Boolean(chosen && newDay && newTime);
  const oneOff = kind === 'oneOff';

  // Compose the default wording from the current selection.
  const autoMessage = (): string => {
    if (type === 'change') {
      if (moving && chosen) {
        const where = newRoom ? ` in ${newRoom}` : '';
        return oneOff
          ? `Notice: ${course} for ${label} will not hold on ${chosen.day} (${chosen.time}) this week. It holds on ${newDay} (${newTime})${where} instead, and returns to its normal slot next week.`
          : `Notice: ${course} for ${label} has moved from ${chosen.day} (${chosen.time}) to ${newDay} (${newTime})${where}. Please check your timetable in the portal.`;
      }
      return `Notice: there is a change to the ${label} schedule. Please check your timetable in the portal for the update.`;
    }
    const c = course || 'class';
    const when = chosen ? ` on ${chosen.day} (${chosen.time})` : '';
    return `Notice: the ${c} class for ${label} will not hold${when}. Please check your timetable in the portal.`;
  };

  // Reset everything when the dialog opens on a new cohort. Default to the first
  // course and its first session (the specific day it won't hold / would move).
  useEffect(() => {
    if (!target) return;
    setType('change');
    setMessageEdited(false);
    setReschedule(false);
    setKind(defaultKind);
    setSlots([]);
    setSlotError('');
    setNewDay('');
    setNewTime('');
    setNewRoom('');
    const all = target.sessions ?? [];
    const firstCourse = all[0]?.course ?? '';
    setCourse(firstCourse);
    const firstSess = all.find((s) => s.course === firstCourse);
    setSession(firstSess ? `${firstSess.day}__${firstSess.time}` : ALL);
  }, [target, defaultKind]);

  // Load the free slots for whichever session is selected. Re-runs when the
  // selection changes so the list never describes a different session.
  useEffect(() => {
    if (!reschedule || !findFreeSlots || !chosen) {
      return;
    }
    let live = true;
    setLoadingSlots(true);
    setSlotError('');
    setSlots([]);
    setNewDay('');
    setNewTime('');
    setNewRoom('');
    findFreeSlots({ course, day: chosen.day, time: chosen.time })
      .then((found) => {
        if (!live) return;
        setSlots(found);
        if (found.length === 0) {
          setSlotError('No free slot is available for this class right now.');
        }
      })
      .catch(() => {
        if (live) setSlotError('Could not load free slots. Please try again.');
      })
      .finally(() => {
        if (live) setLoadingSlots(false);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reschedule, course, session]);

  // Keep the message in sync with the selection until the sender edits it.
  useEffect(() => {
    if (!target || messageEdited) return;
    setMessage(autoMessage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    target,
    type,
    course,
    session,
    messageEdited,
    reschedule,
    kind,
    newDay,
    newTime,
    newRoom,
  ]);

  if (!target) return null;

  const handleSend = async () => {
    if (!message.trim()) return;
    if (type === 'cancellation' && !course) return;
    if (reschedule && !moving) return;
    setSending(true);
    try {
      const payload: AlertPayload = { type, message };
      if (type === 'cancellation') {
        payload.course = course;
        if (chosen) {
          payload.day = chosen.day;
          payload.time = chosen.time;
        }
      } else if (moving && chosen) {
        payload.course = course;
        payload.day = chosen.day;
        payload.time = chosen.time;
        payload.moveTo = {
          day: newDay,
          time: newTime,
          room: newRoom || undefined,
        };
        payload.oneOff = oneOff;
      }
      const ok = await onSend(payload);
      if (ok) onClose();
    } finally {
      setSending(false);
    }
  };

  const selectClass =
    'w-full border border-[#D8DEEC] rounded-[10px] px-3.5 py-2.5 bg-[#F7F9FD] text-sm text-b-blue focus:outline-none focus:border-accent focus:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
  const labelClass = 'block text-sm font-semibold text-b-blue mb-1.5';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[rgba(15,18,45,0.55)] backdrop-blur-sm"
      onClick={() => !sending && onClose()}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl"
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
              onClick={() => {
                setType('cancellation');
                setReschedule(false);
              }}
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
                <label htmlFor="cancel-course" className={labelClass}>
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
                    setSession(
                      firstSess ? `${firstSess.day}__${firstSess.time}` : ALL
                    );
                    setMessageEdited(false);
                  }}
                >
                  {courses.length === 0 && (
                    <option value="">No courses on the timetable</option>
                  )}
                  {courses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {courseSessions.length > 1 && (
                <div>
                  <label htmlFor="cancel-session" className={labelClass}>
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
                      <option
                        key={`${s.day}__${s.time}`}
                        value={`${s.day}__${s.time}`}
                      >
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

          {/* Change: pick the session, and optionally move it to a free slot. */}
          {canReschedule && (
            <div className="space-y-3">
              <div>
                <label htmlFor="change-course" className={labelClass}>
                  Course affected
                </label>
                <select
                  id="change-course"
                  className={selectClass}
                  value={course}
                  onChange={(e) => {
                    const c = e.target.value;
                    setCourse(c);
                    const firstSess = sessions.find((s) => s.course === c);
                    setSession(
                      firstSess ? `${firstSess.day}__${firstSess.time}` : ALL
                    );
                    setMessageEdited(false);
                  }}
                >
                  {courses.length === 0 && (
                    <option value="">No courses on the timetable</option>
                  )}
                  {courses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {courseSessions.length > 1 && (
                <div>
                  <label htmlFor="change-session" className={labelClass}>
                    Session affected
                  </label>
                  <select
                    id="change-session"
                    className={selectClass}
                    value={session}
                    onChange={(e) => {
                      setSession(e.target.value);
                      setMessageEdited(false);
                    }}
                  >
                    {courseSessions.map((s) => (
                      <option
                        key={`${s.day}__${s.time}`}
                        value={`${s.day}__${s.time}`}
                      >
                        {s.day} · {s.time}
                        {s.room ? ` · ${s.room}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <label className="flex items-start gap-2.5 rounded-xl border border-[#E8ECF6] bg-page-bg px-3.5 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[#3B6EF6]"
                  checked={reschedule}
                  disabled={!chosen}
                  onChange={(e) => {
                    setReschedule(e.target.checked);
                    setMessageEdited(false);
                  }}
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-b-blue">
                    <CalendarClock size={15} /> Move it to a free slot
                  </span>
                  <span className="block text-[11px] text-gray-500 font-light leading-relaxed mt-0.5">
                    Shows the days, times and rooms nothing is timetabled in yet.
                  </span>
                </span>
              </label>

              {/* One-off vs permanent, when the sender is allowed both. */}
              {reschedule && rescheduleKinds.length > 1 && (
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['oneOff', 'Just this week', 'Timetable unchanged'],
                      ['permanent', 'Permanently', 'Updates the timetable'],
                    ] as Array<[RescheduleKind, string, string]>
                  )
                    .filter(([k]) => rescheduleKinds.includes(k))
                    .map(([k, title, hint]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          setKind(k);
                          setMessageEdited(false);
                        }}
                        className={`rounded-xl border px-3 py-2 text-left transition ${
                          kind === k
                            ? 'border-accent bg-accent/5'
                            : 'border-[#E8ECF6] hover:bg-page-bg'
                        }`}
                      >
                        <span
                          className={`block text-xs font-semibold ${
                            kind === k ? 'text-accent' : 'text-b-blue'
                          }`}
                        >
                          {title}
                        </span>
                        <span className="block text-[10px] text-gray-500 font-light mt-0.5">
                          {hint}
                        </span>
                      </button>
                    ))}
                </div>
              )}

              {reschedule && (
                <div className="space-y-3 rounded-xl border border-[#D8DEEC] p-3.5">
                  {loadingSlots && (
                    <p className="flex items-center gap-2 text-sm text-gray-500 font-light">
                      <Loader2 size={15} className="animate-spin" />
                      Checking what&apos;s free…
                    </p>
                  )}

                  {!loadingSlots && slotError && (
                    <p className="text-sm text-red-600 font-light">{slotError}</p>
                  )}

                  {!loadingSlots && !slotError && slots.length > 0 && (
                    <>
                      <p className="text-[11px] text-gray-500 font-light">
                        {slots.length} free slot{slots.length === 1 ? '' : 's'}{' '}
                        where this cohort, its lecturer and a room are all
                        available.
                      </p>

                      <div>
                        <label htmlFor="new-day" className={labelClass}>
                          New day
                        </label>
                        <select
                          id="new-day"
                          className={selectClass}
                          value={newDay}
                          onChange={(e) => {
                            setNewDay(e.target.value);
                            setNewTime('');
                            setNewRoom('');
                            setMessageEdited(false);
                          }}
                        >
                          <option value="">Select a day</option>
                          {freeDays.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="new-time" className={labelClass}>
                          New time
                        </label>
                        <select
                          id="new-time"
                          className={selectClass}
                          value={newTime}
                          disabled={!newDay}
                          onChange={(e) => {
                            setNewTime(e.target.value);
                            setNewRoom('');
                            setMessageEdited(false);
                          }}
                        >
                          <option value="">
                            {newDay ? 'Select a time' : 'Pick a day first'}
                          </option>
                          {freeTimes.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="new-room" className={labelClass}>
                          Venue
                        </label>
                        <select
                          id="new-room"
                          className={selectClass}
                          value={newRoom}
                          disabled={!newTime}
                          onChange={(e) => {
                            setNewRoom(e.target.value);
                            setMessageEdited(false);
                          }}
                        >
                          <option value="">
                            {newTime ? 'Keep the current venue' : 'Pick a time first'}
                          </option>
                          {freeRooms.map((r) => (
                            <option key={r.roomname} value={r.roomname}>
                              {r.roomname} · seats {r.capacity}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="alert-message" className={labelClass}>
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
              {moving
                ? oneOff
                  ? 'This week only: the class returns to its normal slot next week. Sent now if the reminder has already gone out; otherwise this week’s reminder carries it.'
                  : 'Sent now if the class reminder has already gone out; otherwise the reminder carries the new details.'
                : 'Sent by SMS and shown in the affected users’ portals.'}
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
              disabled={
                sending ||
                !message.trim() ||
                (type === 'cancellation' && !course) ||
                (reschedule && !moving)
              }
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
                  {type === 'cancellation'
                    ? 'Cancel & Notify'
                    : moving
                    ? oneOff
                      ? 'Move for this week'
                      : 'Move & Notify'
                    : 'Send Alert'}
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
