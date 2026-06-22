'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { assets } from '../../assets/assets';
import { StoreContext } from '../../context/Storecontext';
import {
  ArrowLeft,
  Hash,
  Mail,
  Phone,
  Users,
  MapPin,
  LogOut,
  Bell,
  CalendarCheck,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';

type AdminInfo = {
  name?: string;
  id?: number | string;
  email?: string;
  phone?: number | string;
  team?: string;
  campus?: string;
};

const InfoRow = ({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value?: string | number;
}) => (
  <div className="flex items-center gap-4 px-5 py-4">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
      <Icon size={18} />
    </span>
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className="truncate font-medium text-b-blue">
        {value !== undefined && value !== '' ? value : '—'}
      </p>
    </div>
  </div>
);

// A single notification preference with an on/off switch.
const NotificationRow = ({
  Icon,
  label,
  description,
  checked,
  onToggle,
}: {
  Icon: LucideIcon;
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) => (
  <div className="flex items-center gap-4 px-5 py-4">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
      <Icon size={18} />
    </span>
    <div className="min-w-0 flex-1">
      <p className="font-medium text-b-blue">{label}</p>
      <p className="text-xs font-light text-gray-400">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`Toggle ${label}`}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 ${
        checked ? 'bg-accent' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

const Settings = () => {
  const { url, token, setToken } = useContext(StoreContext);
  const router = useRouter();
  const [info, setInfo] = useState<AdminInfo>({});
  const [loading, setLoading] = useState(true);
  // Notification preferences. Persisted locally so the choices survive a
  // refresh until a backend endpoint is wired up.
  const [notifGenerated, setNotifGenerated] = useState(true);
  const [notifConflicts, setNotifConflicts] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = JSON.parse(localStorage.getItem('adminNotifPrefs') || 'null');
    if (saved) {
      setNotifGenerated(saved.generated ?? true);
      setNotifConflicts(saved.conflicts ?? true);
      setNotifEmail(saved.email ?? false);
    }
  }, []);

  const persistPrefs = (next: {
    generated: boolean;
    conflicts: boolean;
    email: boolean;
  }) => {
    setNotifGenerated(next.generated);
    setNotifConflicts(next.conflicts);
    setNotifEmail(next.email);
    localStorage.setItem('adminNotifPrefs', JSON.stringify(next));
  };

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const response = await axios.get(`${url}/api/admin/info`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.success) {
          setInfo(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching admin info:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [url, token]);

  const handleLogout = async () => {
    try {
      await axios.post(
        `${url}/api/admin/administratorlogout`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setToken('');
      localStorage.removeItem('token');
      router.push('/login?role=administrator');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const name = info.name || '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length === 0
      ? 'A'
      : parts.length === 1
      ? parts[0][0].toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();

  return (
    <div className="min-h-screen w-full bg-[#F7F8FB]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-black/8 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img
              src={assets.logo}
              className="h-9 w-9 object-contain"
              alt="GCTU logo"
            />
            <div className="leading-tight">
              <p className="font-bold text-b-blue">GCTU ClasSync</p>
              <p className="hidden text-[11px] font-light text-gray-400 sm:block">
                Class Timetable Platform
              </p>
            </div>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-page-bg hover:text-b-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-b-blue sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1 text-sm font-light text-gray-500">
            Your account details and preferences.
          </p>
        </div>

        {/* Profile summary */}
        <div className="flex items-center gap-4 rounded-2xl border border-black/8 bg-white p-5 shadow-sm">
          {loading ? (
            <>
              <span className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-page-bg" />
              <div className="space-y-2">
                <span className="block h-4 w-40 animate-pulse rounded bg-page-bg" />
                <span className="block h-3 w-24 animate-pulse rounded bg-page-bg" />
              </div>
            </>
          ) : (
            <>
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gctu-gold text-xl font-bold text-white">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-b-blue">
                  {name ? name.toUpperCase() : 'Administrator'}
                </p>
                <p className="text-sm font-light text-gray-400">Administrator</p>
              </div>
            </>
          )}
        </div>

        {/* Account details */}
        <h2 className="mb-3 mt-8 text-xs font-medium uppercase tracking-wider text-gray-400">
          Account details
        </h2>
        <div className="divide-y divide-black/8 overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm">
          <InfoRow Icon={Hash} label="Administrator ID" value={info.id} />
          <InfoRow Icon={Mail} label="Email" value={info.email} />
          <InfoRow Icon={Phone} label="Phone" value={info.phone} />
          <InfoRow Icon={Users} label="Team" value={info.team} />
          <InfoRow Icon={MapPin} label="Campus" value={info.campus} />
        </div>

        {/* Notifications */}
        <h2 className="mb-3 mt-8 text-xs font-medium uppercase tracking-wider text-gray-400">
          Notifications
        </h2>
        <div className="divide-y divide-black/8 overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm">
          <NotificationRow
            Icon={CalendarCheck}
            label="Timetable generated"
            description="Get notified when a new timetable is generated."
            checked={notifGenerated}
            onToggle={() =>
              persistPrefs({
                generated: !notifGenerated,
                conflicts: notifConflicts,
                email: notifEmail,
              })
            }
          />
          <NotificationRow
            Icon={Megaphone}
            label="Schedule conflicts"
            description="Alert me when a clash is detected in a schedule."
            checked={notifConflicts}
            onToggle={() =>
              persistPrefs({
                generated: notifGenerated,
                conflicts: !notifConflicts,
                email: notifEmail,
              })
            }
          />
          <NotificationRow
            Icon={Bell}
            label="Email notifications"
            description="Also receive these updates by email."
            checked={notifEmail}
            onToggle={() =>
              persistPrefs({
                generated: notifGenerated,
                conflicts: notifConflicts,
                email: !notifEmail,
              })
            }
          />
        </div>

        {/* Account actions */}
        <h2 className="mb-3 mt-8 text-xs font-medium uppercase tracking-wider text-gray-400">
          Account
        </h2>
        <div className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <LogOut size={18} />
            </span>
            <div>
              <p className="font-medium text-red-600">Log out</p>
              <p className="text-xs font-light text-gray-400">
                Sign out of your ClasSync account.
              </p>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
};

export default Settings;
