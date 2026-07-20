'use client';

import React from 'react';
import { BellRing, CalendarX, Megaphone, Info } from 'lucide-react';
import { cohortLabel } from '../../lib/match';

type Alert = {
  _id?: string;
  type?: 'cancellation' | 'change' | 'info';
  className?: string;
  level?: number;
  course?: string;
  day?: string;
  message?: string;
  createdAt?: string;
};

// Compact "x ago" from an ISO timestamp, degrading gracefully.
const timeAgo = (iso?: string) => {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const TYPE_STYLES: Record<
  string,
  { Icon: typeof BellRing; label: string; wrap: string; badge: string }
> = {
  cancellation: {
    Icon: CalendarX,
    label: 'Cancelled',
    wrap: 'border-red-200 bg-red-50',
    badge: 'bg-red-100 text-red-700',
  },
  change: {
    Icon: Megaphone,
    label: 'Schedule change',
    wrap: 'border-amber-200 bg-amber-50',
    badge: 'bg-amber-100 text-amber-800',
  },
  info: {
    Icon: Info,
    label: 'Notice',
    wrap: 'border-blue-200 bg-blue-50',
    badge: 'bg-blue-100 text-accent',
  },
};

/**
 * Renders a list of recent class change/cancellation alerts. Shows nothing when
 * there are no alerts, so it can sit unconditionally in a page.
 */
const AlertsFeed = ({ alerts }: { alerts: Alert[] }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <section className="mb-5 shrink-0 sm:mb-6">
      <div className="mb-2 flex items-center gap-2 sm:mb-2.5 sm:gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <BellRing size={14} />
        </span>
        <h2 className="text-[13px] font-semibold text-b-blue sm:text-base">
          Alerts
        </h2>
        <span className="ml-auto text-[11px] font-medium tabular-nums text-gray-400 sm:text-xs">
          {alerts.length} recent
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {alerts.map((a, i) => {
          const style = TYPE_STYLES[a.type || 'info'] || TYPE_STYLES.info;
          const { Icon } = style;
          return (
            <li
              key={a._id || i}
              className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 ${style.wrap}`}
            >
              <span className="mt-0.5 shrink-0 text-gray-500">
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}
                  >
                    {style.label}
                  </span>
                  {a.className && (
                    <span className="text-[13px] font-semibold text-b-blue">
                      {cohortLabel(a.className, a.level)}
                    </span>
                  )}
                  {(a.course || a.day) && (
                    <span className="text-[11px] font-medium text-gray-500">
                      {[a.course, a.day].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  <span className="ml-auto text-[11px] font-light text-gray-400">
                    {timeAgo(a.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-gray-600">
                  {a.message}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default AlertsFeed;
