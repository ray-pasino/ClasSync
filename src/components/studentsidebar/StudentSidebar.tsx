'use client';

import React, { useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
// Reuse the admin sidebar styles so the collapse behaviour matches exactly.
import '../sidebar/Sidebar.css';
import { assets } from '../../assets/assets';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-toastify';
import { StoreContext } from '../../context/Storecontext';
import { Bell, CalendarDays, LogOut } from 'lucide-react';

const studentNav = [
  { title: 'My Timetable', link: '/studenttimetable', Icon: CalendarDays },
];

const StudentSidebar = ({
  initials = 'ST',
  name = '',
}: {
  initials?: string;
  name?: string;
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { url, token, setToken } = useContext(StoreContext);
  // Reflects the stored preference. Starts true only as the optimistic value
  // for the first paint; the effect below replaces it with what the server
  // actually has, so the toggle stops claiming "on" for someone opted out.
  const [smsOn, setSmsOn] = useState(true);
  // Mobile: the collapsed rail has no room for the SMS card, so the bell
  // opens this modal with the same copy + toggle the desktop card shows.
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  // Mobile: the avatar and logout icon each open their own modal on the slim
  // rail — the avatar shows profile only, the logout icon confirms logout.
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const isMobileRail = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 768px)').matches;

  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      try {
        const response = await axios.get(`${url}/api/student/notify`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (active && response.data.success) setSmsOn(response.data.enabled);
      } catch (error) {
        // Leave the optimistic value in place — a failed read shouldn't make
        // the toggle jump around.
        console.error('Error reading notification preference:', error);
      }
    })();
    return () => {
      active = false;
    };
  }, [url, token]);

  // Toggle per-class SMS reminders. The preference is stored server-side and
  // is what the reminder job reads; the Arkesel API key never leaves the server.
  const handleSmsToggle = async () => {
    const next = !smsOn;
    setSmsOn(next);
    try {
      const response = await axios.post(
        `${url}/api/student/notify`,
        { enabled: next },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (next) {
        if (response.data.success) {
          toast.success(
            'You will now receive an SMS before each of your classes'
          );
        } else {
          // The preference saved even when the confirmation text couldn't be
          // sent, so report the reason rather than silently reverting.
          setSmsOn(Boolean(response.data.enabled));
          toast.error(
            response.data.message ?? 'Could not enable SMS reminders right now.'
          );
        }
      } else {
        toast.success('SMS reminders turned off');
      }
    } catch (error) {
      console.error('Error updating notification preference:', error);
      setSmsOn(!next);
      toast.error('Could not update SMS reminders right now.');
    }
  };

  // Desktop logs out straight away; mobile opens the account modal first.
  const handleLogoutClick = () => {
    if (isMobileRail()) {
      setLogoutModalOpen(true);
    } else {
      handleLogout();
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        `${url}/api/student/studentlogout`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setToken('');
      localStorage.removeItem('token');
      router.push('/login?role=student');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <aside className="sidebar student-sidebar flex shrink-0 flex-col bg-white">
      <div className="brand flex items-center gap-3 px-6 py-7 max-[768px]:py-5">
        <img
          src={assets.logo}
          className="h-10 w-10 object-contain max-[768px]:h-8 max-[768px]:w-8"
          alt="GCTU logo"
        />
        <div className="leading-tight">
          <p className="text-b-blue font-bold text-xl tracking-tight">
            ClasSync
          </p>
          <p className="text-[11px] text-gray-400 font-medium">GCTU Timetable</p>
        </div>
      </div>

      <nav className="px-3 mt-2 flex-1">
        <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Menu
        </p>
        <ul className="space-y-1">
          {studentNav.map(({ title, link, Icon }) => {
            const isActive = pathname === link;
            return (
              <li key={link}>
                <Link
                  href={link}
                  className={`nav-link flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors max-[768px]:py-2.5 ${
                    isActive
                      ? 'bg-accent text-white font-semibold shadow-md shadow-accent/30'
                      : 'text-gray-500 font-medium hover:bg-blue-50 hover:text-accent'
                  }`}
                >
                  <Icon size={20} className="max-[768px]:h-[18px] max-[768px]:w-[18px]" />
                  <span>{title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Account */}
      <div className="px-3 mt-2">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 max-[768px]:hidden">
          Account
        </p>
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={handleLogoutClick}
              className="nav-link flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 max-[768px]:py-2.5"
            >
              <LogOut size={20} className="max-[768px]:h-[18px] max-[768px]:w-[18px]" />
              <span>Logout</span>
            </button>
          </li>
        </ul>
      </div>

      <div className="px-5 pb-6 pt-5 space-y-3">
        <div
          className="group relative rounded-2xl border border-black/8 bg-page-bg/60 p-3.5"
          title="Get a text each day with the classes on your schedule."
        >
          {/* Hover tooltip */}
          <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-b-blue px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
            Get a daily text about your classes
            <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-b-blue" />
          </span>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Bell size={17} />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold text-b-blue">
                SMS reminders
              </p>
              <p className="text-[11px] font-light text-gray-400">
                Daily class texts
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={smsOn}
              aria-label="Toggle daily SMS reminders"
              onClick={handleSmsToggle}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 ${
                smsOn ? 'bg-accent' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  smsOn ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-b-blue text-white p-4">
          <p className="font-medium text-sm">Take it with you</p>
          <p className="text-[11px] text-white/70 mt-1 leading-snug">
            Export your timetable as a PDF or image from the Export button.
          </p>
        </div>
      </div>

      {/* Mobile foot: compact SMS toggle (icon rail only) + profile avatar.
          Keeps the notification reachable on phones without the bulky card. */}
      <div className="flex flex-col items-center gap-2 px-1.5 pb-5 pt-2.5 lg:hidden">
        <button
          type="button"
          onClick={() => setSmsModalOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={smsModalOpen}
          aria-label="SMS reminder settings"
          title="SMS reminders"
          className={`hidden h-9 w-9 items-center justify-center rounded-lg transition-colors max-[768px]:flex ${
            smsOn
              ? 'bg-accent/10 text-accent'
              : 'text-gray-400 hover:bg-gray-100'
          }`}
        >
          <Bell size={16} />
        </button>
        <button
          type="button"
          onClick={() => setProfileModalOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={profileModalOpen}
          aria-label="Profile"
          title="Profile"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gctu-gold text-[11px] font-bold text-white transition hover:brightness-105"
        >
          {initials}
        </button>
      </div>

      {/* Mobile SMS modal — surfaces the desktop card's copy + toggle.
          Portalled to <body> so it isn't trapped in the sidebar's stacking
          context (the scrolling timetable would otherwise paint over it). */}
      {smsModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="SMS reminders"
            onClick={() => setSmsModalOpen(false)}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 lg:hidden"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            >
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Bell size={20} />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-base font-semibold text-b-blue">
                  SMS reminders
                </p>
                <p className="mt-1 text-[13px] font-light leading-snug text-gray-500">
                  Get a text each day with the classes on your schedule.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-black/8 bg-page-bg/60 px-3.5 py-3">
              <span className="text-sm font-medium text-b-blue">
                Daily class texts
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={smsOn}
                aria-label="Toggle daily SMS reminders"
                onClick={handleSmsToggle}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 ${
                  smsOn ? 'bg-accent' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    smsOn ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSmsModalOpen(false)}
              className="mt-4 w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
            >
              Done
            </button>
            </div>
          </div>,
          document.body
        )}

      {/* Mobile profile modal — profile summary only (no logout). */}
      {profileModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Profile"
            onClick={() => setProfileModalOpen(false)}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 lg:hidden"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gctu-gold text-sm font-bold text-white">
                  {initials}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-base font-semibold text-b-blue">
                    {name ? name.toUpperCase() : 'Student'}
                  </p>
                  <p className="text-[13px] font-light text-gray-400">Student</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="mt-5 w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* Mobile logout modal — confirm only (no profile name). */}
      {logoutModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Log out"
            onClick={() => setLogoutModalOpen(false)}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 lg:hidden"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <LogOut size={20} />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-base font-semibold text-b-blue">Log out</p>
                  <p className="mt-1 text-[13px] font-light leading-snug text-gray-500">
                    You will be signed out of your account.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-5 w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Logout
              </button>

              <button
                type="button"
                onClick={() => setLogoutModalOpen(false)}
                className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium text-gray-500 transition hover:bg-page-bg"
              >
                Cancel
              </button>
            </div>
          </div>,
          document.body
        )}
    </aside>
  );
};

export default StudentSidebar;
