'use client';

import React, { useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './Sidebar.css';
import { assets, sidebardata } from '../../assets/assets';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';
import { StoreContext } from '../../context/Storecontext';
import {
  LayoutDashboard,
  DoorOpen,
  BookOpen,
  GraduationCap,
  Clock,
  Presentation,
  Settings,
  LogOut,
} from 'lucide-react';

// Map each nav route to its lucide icon so the design stays in sync with
// the real admin pages defined in sidebardata.
const iconForLink: Record<string, React.ComponentType<any>> = {
  '/dashboard': LayoutDashboard,
  '/lecturerooms': DoorOpen,
  '/coursesavailable': BookOpen,
  '/lecturersavailable': GraduationCap,
  '/timeandschedule': Clock,
  '/classes': Presentation,
};

// Avatar initials from the first and last name (e.g. "Obed Ewudzie" → "OE").
const initialsFromName = (n: string) => {
  const parts = n.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'A';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Sidebar = ({
  initials: initialsProp,
  name: nameProp,
  lowerMobileNav = false,
}: {
  initials?: string;
  name?: string;
  // Dashboard-only: nudge the nav down on phones so the first (blue) button
  // lines up with its (lowered) search row instead of sitting tight to the logo.
  lowerMobileNav?: boolean;
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { url, token, setToken } = useContext(StoreContext);

  // When a parent (e.g. the dashboard) already has the admin's name it passes
  // it in; otherwise the sidebar fetches it itself so the profile stays
  // accurate on every admin page without duplicating the request.
  const [fetchedName, setFetchedName] = useState('');
  useEffect(() => {
    if (nameProp) return;
    let active = true;
    (async () => {
      try {
        const response = await axios.get(`${url}/api/admin/info`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (active && response.data.success) {
          setFetchedName(response.data.data.name || '');
        }
      } catch (error) {
        console.error('Error fetching admin info:', error);
      }
    })();
    return () => {
      active = false;
    };
  }, [nameProp, url, token]);

  const name = nameProp || fetchedName;
  const initials = initialsProp || initialsFromName(name);
  // Mobile: the slim rail has no room for the profile/logout details, so the
  // foot avatar and the logout icon each open their own modal — mirrors the
  // student sidebar's behaviour.
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const isMobileRail = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 768px)').matches;

  // Desktop logs out straight away; the mobile rail confirms first.
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

  return (
    <aside className="sidebar bg-white flex flex-col shrink-0">
      {/* Fixed-height band (py-6 + header height) so the logo's vertical centre
          lines up exactly with the "Dashboard" title in the main content area. */}
      <div className="brand flex items-center gap-3 px-6 h-[92px] max-sm:h-[64px] lg:h-[96px]">
        <img src={assets.logo} className="h-10 w-10 object-contain" alt="GCTU logo" />
        <div className="leading-tight">
          <p className="text-b-blue font-bold text-xl tracking-tight">ClasSync</p>
          <p className="text-[11px] text-gray-400 font-medium">GCTU Timetable</p>
        </div>
      </div>

      <nav className={`px-3 mt-2 flex-1 ${lowerMobileNav ? 'max-sm:mt-1.5' : 'max-sm:-mt-1.5'}`}>
        <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Menu
        </p>
        <ul className="space-y-1">
          {sidebardata.map((val, key) => {
            const isActive = pathname === val.link;
            const Icon = iconForLink[val.link] ?? LayoutDashboard;
            return (
              <li key={key}>
                <Link
                  href={val.link}
                  className={`nav-link flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${
                    isActive
                      ? 'bg-accent text-white font-semibold shadow-md shadow-accent/30'
                      : 'text-gray-500 font-medium hover:bg-blue-50 hover:text-accent'
                  }`}
                >
                  <Icon size={20} />
                  <span>{val.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Account */}
      <div className="px-3">
        <p className="account-label px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Account
        </p>
        <ul className="space-y-1">
          <li>
            <Link
              href="/settings"
              className={`nav-link flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors ${
                pathname === '/settings'
                  ? 'bg-accent text-white font-semibold shadow-md shadow-accent/30'
                  : 'text-gray-500 font-medium hover:bg-blue-50 hover:text-accent'
              }`}
            >
              <Settings size={20} />
              <span>Settings</span>
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={handleLogoutClick}
              className="nav-link flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </li>
        </ul>
      </div>

      <div className="px-5 pb-6 pt-5">
        <div className="rounded-2xl bg-b-blue text-white p-4">
          <p className="font-medium text-sm">Need a new schedule?</p>
          <p className="text-[11px] text-white/70 mt-1 leading-snug">
            Generate a fresh timetable from the dashboard in seconds.
          </p>
        </div>
      </div>

      {/* Mobile rail foot: profile avatar (opens the profile modal). */}
      <div className="hidden flex-col items-center gap-2 px-1.5 pb-5 pt-2.5 max-[768px]:flex">
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
                    {name ? name.toUpperCase() : 'Administrator'}
                  </p>
                  <p className="text-[13px] font-light text-gray-400">
                    Administrator
                  </p>
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

      {/* Mobile logout modal — confirm only. */}
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

export default Sidebar;
