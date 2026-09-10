'use client';

import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { StoreContext } from '../../context/Storecontext';
import { cohortLabel } from '../../lib/match';
import {
  BellRing,
  CalendarX,
  Megaphone,
  Info,
  Search,
  RotateCcw,
  X,
  CheckCheck,
  type LucideIcon,
} from 'lucide-react';

type Alert = {
  _id: string;
  type?: 'cancellation' | 'change' | 'info';
  className?: string;
  level?: number;
  course?: string;
  day?: string;
  semester?: string;
  message?: string;
  createdAt?: string;
  dismissed?: boolean;
};

const TYPE_STYLES: Record<
  string,
  { Icon: LucideIcon; label: string; wrap: string; badge: string }
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

const FILTERS = ['Active', 'Dismissed', 'All'] as const;
type Filter = (typeof FILTERS)[number];

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

/**
 * Full alert history with management controls, shared by the student and
 * lecturer areas. `basePath` is the role's API prefix (/api/student or
 * /api/lecturer) — dismissal is stored per user, so the alert documents
 * themselves are never changed here.
 */
const AlertsManager = ({
  basePath,
  heading,
  subheading,
}: {
  basePath: string;
  heading: string;
  subheading: string;
}) => {
  const { url, token } = useContext(StoreContext);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>('Active');
  const [search, setSearch] = useState('');

  const auth = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await axios.get(`${url}${basePath}/alerts`, auth);
        if (response.data.success) setAlerts(response.data.alerts || []);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, [url, basePath, auth]);

  // Optimistic: flip the flag straight away, roll back if the call fails.
  const setDismissed = async (ids: string[], dismissed: boolean) => {
    if (!ids.length) return;
    const previous = alerts;
    setAlerts((list) =>
      list.map((a) => (ids.includes(a._id) ? { ...a, dismissed } : a))
    );
    setBusy(true);
    try {
      const endpoint = `${url}${basePath}/alerts/dismiss`;
      if (dismissed) {
        await axios.post(endpoint, { alertIds: ids }, auth);
      } else {
        await axios.delete(endpoint, { ...auth, data: { alertIds: ids } });
      }
    } catch (error) {
      console.error('Error updating alerts:', error);
      setAlerts(previous);
      toast.error('Could not update that alert. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const term = search.trim().toLowerCase();
  const visible = alerts
    .filter((a) =>
      filter === 'All' ? true : filter === 'Dismissed' ? a.dismissed : !a.dismissed
    )
    .filter((a) =>
      term
        ? [a.message, a.className, a.course, a.day, a.semester, a.type]
            .join(' ')
            .toLowerCase()
            .includes(term)
        : true
    );

  const activeCount = alerts.filter((a) => !a.dismissed).length;
  const dismissedCount = alerts.length - activeCount;

  return (
    <div className="w-full min-w-0 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-b-blue sm:text-2xl lg:text-3xl">
            {heading}
          </h1>
          <p className="mt-1 text-sm font-light text-gray-400">{subheading}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex h-11 items-center gap-2.5 rounded-xl border border-[#E8ECF6] bg-white px-4">
            <Search size={18} className="shrink-0 text-gray-400" />
            <input
              type="text"
              placeholder="Search alerts"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search alerts"
              className="w-40 bg-transparent text-sm font-light text-gray-500 placeholder:text-gray-400 focus:outline-none sm:w-52"
            />
          </div>
        </div>
      </header>

      {/* Filters + bulk actions */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-[#E8ECF6] bg-white p-1">
          {FILTERS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setFilter(name)}
              className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                filter === name
                  ? 'bg-accent text-white'
                  : 'text-gray-500 hover:text-b-blue'
              }`}
            >
              {name}
              {name === 'Active' && activeCount > 0 && (
                <span className="ml-1.5 tabular-nums opacity-80">
                  {activeCount}
                </span>
              )}
              {name === 'Dismissed' && dismissedCount > 0 && (
                <span className="ml-1.5 tabular-nums opacity-80">
                  {dismissedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={busy || activeCount === 0}
          onClick={() =>
            setDismissed(
              alerts.filter((a) => !a.dismissed).map((a) => a._id),
              true
            )
          }
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E8ECF6] bg-white px-3.5 text-[13px] font-medium text-gray-500 transition-colors hover:text-b-blue disabled:opacity-50"
        >
          <CheckCheck size={15} />
          Clear all
        </button>
        <button
          type="button"
          disabled={busy || dismissedCount === 0}
          onClick={() =>
            setDismissed(
              alerts.filter((a) => a.dismissed).map((a) => a._id),
              false
            )
          }
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E8ECF6] bg-white px-3.5 text-[13px] font-medium text-gray-500 transition-colors hover:text-b-blue disabled:opacity-50"
        >
          <RotateCcw size={15} />
          Restore all
        </button>
      </div>

      {/* List */}
      <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        {loading ? (
          <p className="py-10 text-center text-sm font-light text-gray-400">
            Loading alerts…
          </p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-page-bg text-accent">
              <BellRing size={22} />
            </span>
            <p className="max-w-xs text-sm font-light text-gray-400">
              {alerts.length === 0
                ? 'No alerts yet. Class changes and cancellations will show up here.'
                : term
                ? `No alerts match “${search.trim()}”.`
                : filter === 'Dismissed'
                ? 'Nothing dismissed yet.'
                : 'All caught up — no active alerts.'}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {visible.map((a) => {
              const style = TYPE_STYLES[a.type || 'info'] || TYPE_STYLES.info;
              const { Icon } = style;
              return (
                <li
                  key={a._id}
                  className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-opacity ${
                    style.wrap
                  } ${a.dismissed ? 'opacity-60' : ''}`}
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
                      {a.dismissed && (
                        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                          Dismissed
                        </span>
                      )}
                      <span className="ml-auto text-[11px] font-light text-gray-400">
                        {formatDate(a.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-gray-600">
                      {a.message}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setDismissed([a._id], !a.dismissed)}
                    aria-label={a.dismissed ? 'Restore alert' : 'Dismiss alert'}
                    title={a.dismissed ? 'Restore' : 'Dismiss'}
                    className="-mr-1 mt-0.5 shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/70 hover:text-b-blue disabled:opacity-50"
                  >
                    {a.dismissed ? <RotateCcw size={15} /> : <X size={15} />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AlertsManager;
