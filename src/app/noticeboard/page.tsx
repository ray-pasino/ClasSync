'use client';

import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { assets, studentInfo } from '../../assets/assets';
import { StoreContext } from '../../context/Storecontext';
import {
  CalendarDays,
  ChevronDown,
  ChevronFirst,
  ChevronLast,
  CirclePlus,
  ClipboardList,
  Database,
  FileSearch,
  Folder,
  LayoutGrid,
  Power,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

const EVAL_ANIMATION_MS = 300;

type MenuItem = {
  label: string;
  Icon: LucideIcon;
  chevron?: boolean;
  active?: boolean;
  href?: string;
  logout?: boolean;
};

// Everything here is inert apart from "My Timetable", which is the one link
// that crosses over into the ClasSync side of the system.
const menuItems: MenuItem[] = [
  { label: 'Dashboard', Icon: LayoutGrid, active: true },
  { label: 'Profile', Icon: Users, chevron: true },
  { label: 'Course Registration', Icon: ClipboardList },
  { label: 'My Result Slip', Icon: FileSearch },
  { label: 'My Timetable', Icon: CalendarDays, href: '/studenttimetable' },
  { label: 'FAQs', Icon: Folder, chevron: true },
  { label: 'Contact Us', Icon: Folder, chevron: true },
];

const settingsItems: MenuItem[] = [
  { label: 'Change Password', Icon: Database },
  { label: 'Logout', Icon: Power, logout: true },
];

const actions = [
  { label: 'Register', className: 'bg-[#DDE4FF] text-[#2447D6]' },
  { label: 'Check Results', className: 'bg-[#1B4DE4] text-white' },
  { label: 'lecturers Evaluation', className: 'bg-[#FFC220] text-[#212529]' },
  { label: 'Resit', className: 'bg-[#FFC220] text-[#212529]' },
];

type StudentInfo = {
  name?: string;
  title?: string;
  id?: number;
  faculty?: string;
  department?: string;
  program?: string;
  level?: number;
  session?: string;
  campus?: string;
  phone?: string;
  cohort?: string;
  creditRequired?: number;
  creditTaken?: number;
};

const MenuList = ({
  onNavigate,
  onLogout,
}: {
  onNavigate?: () => void;
  onLogout: () => void;
}) => {
  const itemClass =
    'flex w-full items-center gap-3 px-6 py-[11px] text-left text-[15px] font-medium transition-colors';

  const renderItem = (item: MenuItem) => {
    const { label, Icon, chevron, active, href, logout } = item;
    const tone = active
      ? 'text-[#2563EB]'
      : 'text-[#1F2937] hover:bg-[#F3F4F6]';
    const body = (
      <>
        <Icon size={18} className="shrink-0" strokeWidth={1.9} />
        <span className="flex-1">{label}</span>
        {chevron && <ChevronDown size={16} className="text-gray-400" />}
      </>
    );

    if (href) {
      return (
        <Link
          key={label}
          href={href}
          onClick={onNavigate}
          className={`${itemClass} ${tone}`}
        >
          {body}
        </Link>
      );
    }

    return (
      <button
        key={label}
        type="button"
        onClick={
          logout
            ? () => {
                onNavigate?.();
                onLogout();
              }
            : undefined
        }
        className={`${itemClass} ${tone}`}
      >
        {body}
      </button>
    );
  };

  return (
    <nav className="py-5">
      <p className="px-6 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
        Menu
      </p>
      {menuItems.map(renderItem)}
      <p className="px-6 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
        Settings
      </p>
      {settingsItems.map(renderItem)}
    </nav>
  );
};

const Noticeboard = () => {
  const { url, token, setToken } = useContext(StoreContext);
  const router = useRouter();

  const [info, setInfo] = useState<StudentInfo>({});
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  // Deliberately not persisted: the portal shows this notice on every visit,
  // so a refresh brings it straight back.
  const [evalOpen, setEvalOpen] = useState(true);
  // Drives the slide/fade. It flips on one frame after mount so the panel has a
  // starting position to animate away from, and flips back before unmounting so
  // the closing animation has time to run.
  const [evalShown, setEvalShown] = useState(false);
  const evalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const response = await axios.get(`${url}/api/student/info`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.success) {
          setInfo(response.data.data);
        }
      } catch (error) {
        // An expired or missing token is the common case: send them back to
        // the SIP sign-in rather than showing an empty noticeboard.
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          router.replace('/siplogin');
          return;
        }
        console.error('Error fetching student info:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [url, token, router]);

  const handleLogout = async () => {
    try {
      await axios.post(
        `${url}/api/student/studentlogout`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Clear the session either way — a failed logout call should never leave
      // the student stuck signed in.
      setToken('');
      localStorage.removeItem('token');
      router.push('/siplogin');
    }
  };

  const closeEval = useCallback(() => {
    setEvalShown(false);
    evalTimer.current = setTimeout(() => setEvalOpen(false), EVAL_ANIMATION_MS);
  }, []);

  useEffect(() => {
    if (!evalOpen) return;
    // Two frames: the first lets the closed state paint, the second flips to
    // open so the browser has a "from" value to transition away from.
    let inner = 0;
    const frame = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEvalShown(true));
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeEval();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(inner);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [evalOpen, closeEval]);

  useEffect(
    () => () => {
      if (evalTimer.current) clearTimeout(evalTimer.current);
    },
    [],
  );

  const fullName = [info.title, info.name].filter(Boolean).join(' ');
  const displayName = fullName || (loading ? '' : 'Student');

  // The signed-in record wins; rows it has no value for fall back to the
  // sample profile in assets. Name and index number are never substituted —
  // those identify the student and must stay their own.
  const or = (value: unknown, fallback: unknown) =>
    value === undefined || value === null || value === '' ? fallback : value;

  // The portal prints the degree in front of the programme name. Records that
  // already carry one (BSc./MSc./BA…) are left alone rather than doubled up.
  const withDegree = (programme: unknown) => {
    const value = String(programme ?? '').trim();
    if (!value) return '';
    return /^(b|m)(sc|a|ed|eng|phil)\b\.?/i.test(value)
      ? value
      : `BSc. ${value}`;
  };

  const rows: [string, React.ReactNode][] = [
    ['Faculty', or(info.faculty, studentInfo.faculty)],
    ['Department', or(info.department, studentInfo.department)],
    ['Programme', withDegree(or(info.program, studentInfo.program))],
    ['Level', or(info.level, studentInfo.level)],
    ['Session', or(info.session, studentInfo.session)],
    ['Index Number', info.id],
    ['Campus', or(info.campus, studentInfo.campus)],
    ['Mobile Number', or(info.phone, studentInfo.phone)],
    ['Cohort', or(info.cohort, studentInfo.cohort)],
    ['Credit Required', or(info.creditRequired, studentInfo.creditRequired)],
    ['Credit Taken', or(info.creditTaken, studentInfo.creditTaken)],
  ] as [string, React.ReactNode][];

  return (
    <div className="flex w-full min-h-screen bg-[#FAFAFB] text-[#111827]">
      {/* Sidebar — permanent on desktop */}
      <aside className="hidden w-[250px] shrink-0 flex-col border-r border-[#E5E7EB] bg-white lg:flex">
        <div className="flex h-[68px] items-center gap-2.5 px-6">
          <img
            src={assets.logo}
            alt="GCTU logo"
            className="h-9 w-9 object-contain"
          />
          <span className="text-[19px] font-bold tracking-tight">GCTU</span>
        </div>
        <MenuList onLogout={handleLogout} />
      </aside>

      {/* Evaluation notice — shown on every visit to the noticeboard */}
      {evalOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          {/* Scrim — clicking it closes the notice */}
          <div
            onClick={closeEval}
            className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ease-out motion-reduce:transition-none ${
              evalShown ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div className="pointer-events-none relative flex min-h-full items-start justify-center p-4 sm:items-center">
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Student's evaluation of teaching and course"
              className={`pointer-events-auto w-full max-w-[500px] bg-white p-5 shadow-xl transition-all duration-300 ease-out motion-reduce:transition-none ${
                evalShown
                  ? 'translate-y-0 opacity-100'
                  : '-translate-y-12 opacity-0'
              }`}
            >
              <h2 className="text-[18px] font-bold leading-snug text-[#1F2937]">
                STUDENT&apos;S EVALUATION OF TEACHING AND COURSE
              </h2>

              <img
                src={assets.logo}
                alt="GCTU logo"
                className="mx-auto my-4 h-[140px] w-[140px] object-contain"
              />

              <p className="text-center text-[14px] leading-[1.4] text-[#1F2937]">
                The Student&apos;s Evaluation of Teaching and Course is part of
                GCTU&apos;s regular effort to maintain quality of instruction,
                improve students&apos; learning and promote quality education.
                Your honest and thoughtful evaluation would help us achieve the
                above goals. Your answers are anonymous; comments from students
                are not shown to lecturers in raw format. Raw data is analyzed
                and the statistical results presented to faculty for
                improvement.
              </p>

              <button
                type="button"
                className="mx-auto mt-9 block w-full max-w-[420px] rounded bg-[#34D3A6] px-4 py-3.5 text-[14px] font-bold text-[#1F2937]"
              >
                STUDENT&apos;S EVALUATION OF TEACHING AND COURSE
              </button>

              <div className="mt-2.5 flex justify-end">
                <button
                  type="button"
                  onClick={closeEval}
                  className="rounded bg-[#E8495F] px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#D63B51]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar — mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[270px] overflow-y-auto bg-white shadow-xl">
            <div className="flex h-[68px] items-center justify-between border-b border-[#E5E7EB] px-6">
              <span className="flex items-center gap-2.5">
                <img
                  src={assets.logo}
                  alt="GCTU logo"
                  className="h-8 w-8 object-contain"
                />
                <span className="text-[17px] font-bold tracking-tight">
                  GCTU
                </span>
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="text-gray-400 transition-colors hover:text-[#111827]"
              >
                <X size={20} />
              </button>
            </div>
            <MenuList
              onNavigate={() => setMenuOpen(false)}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-[68px] items-center justify-between border-b border-[#E5E7EB] bg-white px-4 sm:px-6">
          <span className="flex items-center gap-2.5">
            <span className="flex items-center gap-2.5 lg:hidden">
              <img
                src={assets.logo}
                alt="GCTU logo"
                className="h-9 w-9 object-contain"
              />
              <span className="text-[19px] font-bold tracking-tight">GCTU</span>
            </span>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="ml-1 text-[#111827] lg:hidden"
            >
              <ChevronLast size={20} />
            </button>
            <span className="hidden text-[#111827] lg:inline">
              <ChevronFirst size={20} />
            </span>
          </span>

          <span className="relative">
            <img
              src={assets.logo}
              alt="Profile"
              className="h-10 w-10 rounded-full border border-[#E5E7EB] object-contain"
            />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#22C55E]" />
          </span>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {/* Quick actions */}
          <div className="flex flex-wrap gap-2.5">
            {actions.map(({ label, className }) => (
              <button
                key={label}
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[14px] font-semibold ${className}`}
              >
                <CirclePlus size={15} strokeWidth={2} />
                {label}
              </button>
            ))}
          </div>

          <div className="mt-6 border-t border-[#E5E7EB]" />

          <h1 className="mt-8 text-[26px] font-bold leading-tight sm:text-[30px]">
            Welcome back, {displayName}
          </h1>

          <div className="mt-6 grid gap-6 lg:grid-cols-[520px_minmax(0,1fr)]">
            {/* Profile picture card */}
            <section className="rounded-lg border border-[#E5E7EB] bg-white">
              <div className="border-b border-[#E5E7EB] px-5 py-4 text-[15px]">
                Profile Picture <span className="font-bold">{displayName}</span>
              </div>
              <div className="flex min-h-[300px] items-center justify-center p-6">
                <span className="flex h-28 w-28 items-center justify-center rounded-full bg-[#F3F4F6] text-[28px] font-semibold text-gray-400">
                  {(info.name || '')
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </span>
              </div>
            </section>

            {/* Details card */}
            <section className="rounded-lg border border-[#E5E7EB] bg-white px-5 py-6 sm:px-7">
              {rows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-6 py-[9px]"
                >
                  <span className="text-[14px] font-bold">{label}:</span>
                  <span className="text-right text-[13px] text-[#1E3A8A]">
                    {value === undefined || value === null || value === ''
                      ? ''
                      : value}
                  </span>
                </div>
              ))}

              <button
                type="button"
                className="mt-6 rounded-md bg-[#1B4DE4] px-4 py-2.5 text-[15px] font-semibold text-white"
              >
                View Profile
              </button>
            </section>
          </div>
        </main>

        <footer className="border-t border-[#E5E7EB] bg-white px-4 py-4 text-[13px] text-gray-500 sm:px-6 lg:px-8">
          All rights reserved | © GCTU {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
};

export default Noticeboard;
