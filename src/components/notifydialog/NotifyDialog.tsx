'use client';

import React, { useEffect, useState } from 'react';
import { Megaphone, CalendarX, AlertTriangle, Send } from 'lucide-react';
import { cohortLabel } from '../../lib/match';

export type NotifyTarget = {
  semester: string;
  className: string;
  level?: number;
};
export type AlertType = 'cancellation' | 'change';

// Default wording so the sender can dispatch in one click but still edit it.
export const defaultAlertMessage = (type: AlertType, className: string) =>
  type === 'cancellation'
    ? `Notice: classes for ${className} have been cancelled. Please check your timetable in the portal for details.`
    : `Notice: there is a change to the ${className} schedule. Please check your timetable in the portal for the update.`;

interface Props {
  // The class the alert targets; null keeps the dialog closed.
  target: NotifyTarget | null;
  onClose: () => void;
  // Dispatch the alert. Resolves true on success (dialog then closes), false
  // otherwise (dialog stays open so the sender can retry).
  onSend: (payload: { type: AlertType; message: string }) => Promise<boolean>;
  // Explains what "Cancel class" removes, since it differs by role
  // (admin: the whole class; lecturer: only their own sessions).
  cancelNote: string;
}

/**
 * Shared dialog for raising a class change/cancellation alert. Used by both the
 * admin dashboard and the lecturer schedule page; the caller owns the request
 * and toast via `onSend`.
 */
const NotifyDialog = ({ target, onClose, onSend, cancelNote }: Props) => {
  const [type, setType] = useState<AlertType>('change');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const label = target ? cohortLabel(target.className, target.level) : '';

  // Reset to sensible defaults each time the dialog opens on a new class.
  useEffect(() => {
    if (target) {
      setType('change');
      setMessage(defaultAlertMessage('change', cohortLabel(target.className, target.level)));
    }
  }, [target]);

  if (!target) return null;

  // Swap the default wording when the type changes, but only while the sender
  // hasn't customised the message.
  const handleTypeChange = (next: AlertType) => {
    setMessage((prev) =>
      prev === defaultAlertMessage(type, label)
        ? defaultAlertMessage(next, label)
        : prev
    );
    setType(next);
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const ok = await onSend({ type, message });
      if (ok) onClose();
    } finally {
      setSending(false);
    }
  };

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
              onClick={() => handleTypeChange('change')}
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
              onClick={() => handleTypeChange('cancellation')}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                type === 'cancellation'
                  ? 'border-red-300 bg-red-50 text-red-600'
                  : 'border-[#E8ECF6] text-gray-500 hover:bg-page-bg'
              }`}
            >
              <CalendarX size={16} /> Cancel class
            </button>
          </div>

          {type === 'cancellation' && (
            <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 leading-relaxed">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              {cancelNote}
            </p>
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
              onChange={(e) => setMessage(e.target.value)}
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
              disabled={sending || !message.trim()}
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
