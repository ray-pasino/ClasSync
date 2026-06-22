'use client';

import React, { useState, useContext, useEffect, useRef } from 'react';
import './Dashboard.css';
import Sidebar from '../../components/sidebar/Sidebar';
import { StoreContext } from '../../context/Storecontext';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'react-toastify';
import { toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';
import {
  Search,
  Mic,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  BookOpen,
  GraduationCap,
  Presentation,
  ArrowUpRight,
  CalendarPlus,
  Download,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Printer,
  X,
} from 'lucide-react';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Canonical weekday order used to lay out timetable columns.
const DAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// Parse the start of a time-slot label (e.g. "08:00 - 09:00", "8:00am - 9:00am")
// into minutes since midnight, used to sort slots chronologically.
const slotStartMinutes = (time: string) => {
  const start = (time.split('-')[0] || '').trim();
  const m = start.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return Number.MAX_SAFE_INTEGER;
  let hours = parseInt(m[1], 10);
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = m[3]?.toLowerCase();
  if (meridiem === 'pm' && hours !== 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

// Pivot a class's flat list of {time, day, ...} entries into a grid keyed by
// the days/times actually present in the data, so the table renders correctly
// regardless of what's stored in `selectedDays`. Time slots are ordered
// chronologically; cells stay keyed by the exact time+day so each entry remains
// aligned to its actual day and class.
const buildGrid = (items: any[]) => {
  const days = DAY_ORDER.filter((d) => items.some((it) => it.day === d));
  const times = Array.from(new Set(items.map((it) => it.time))).sort(
    (a, b) => slotStartMinutes(a) - slotStartMinutes(b)
  );
  const cell: Record<string, any> = {};
  items.forEach((it) => {
    cell[`${it.time}__${it.day}`] = it;
  });
  return { days, times, cell };
};

// Shimmering placeholder used while data is loading.
const Skeleton = ({ className = '' }: { className?: string }) => (
  <span className={`skeleton block ${className}`} aria-hidden="true" />
);

const Dashboard = () => {
  const { url, token } = useContext(StoreContext);

  const [buttonClicked, setButtonClicked] = useState(false);
  const [showTimetable, setShowTimetable] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Key of the per-class export menu that's currently open (null = none).
  const [cardMenu, setCardMenu] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  // Refs to each individual class card, keyed by `${semester}__${className}`.
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [lecturerCount, setLecturerCount] = useState(0);
  const [roomCount, setRoomCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [classCount, setClassCount] = useState(0);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [adminName, setAdminName] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [loadingTimetable, setLoadingTimetable] = useState(true);
  const [data, setData] = useState({
    name: '',
    semester: '',
    days:
      (typeof window !== 'undefined' &&
        JSON.parse(localStorage.getItem('selectedDays') || 'null')) ||
      [],
  });

  // Fetch resource counts
  const fetchCounts = async () => {
    try {
      const [lecturerRes, roomRes, courseRes, classRes] = await Promise.all([
        axios.get(`${url}/api/lecturer/count`),
        axios.get(`${url}/api/room/count`),
        axios.get(`${url}/api/course/count`),
        axios.get(`${url}/api/class/count`),
      ]);

      setLecturerCount(lecturerRes.data.count);
      setRoomCount(roomRes.data.count);
      setCourseCount(courseRes.data.count);
      setClassCount(classRes.data.count);
    } catch (error) {
      console.error('Error fetching counts:', error);
    } finally {
      setLoadingCounts(false);
    }
  };

  // Fetch timetable data
  const fetchTimetable = async () => {
    try {
      const response = await axios.get(`${url}/api/timetable/timetable`);
      setTimetable(response.data.timetable || []);
    } catch (error) {
      console.error('Error fetching timetable:', error);
    } finally {
      setLoadingTimetable(false);
    }
  };

  // Fetch the logged-in admin's name
  const fetchAdminInfo = async () => {
    try {
      const response = await axios.get(`${url}/api/admin/info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setAdminName(response.data.data.name);
      }
    } catch (error) {
      console.error('Error fetching admin info:', error);
    }
  };

  const onChangeHandler = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleDayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setData((prevData) => {
      const updatedDays = checked
        ? [...prevData.days, value]
        : prevData.days.filter((day: string) => day !== value);
      localStorage.setItem('selectedDays', JSON.stringify(updatedDays));
      return { ...prevData, days: updatedDays };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!data.name || !data.semester || data.days.length === 0) {
      toast.error('Please fill in all required fields.');
      return;
    }

    try {
      const response = await axios.post(`${url}/api/timetable/timetable`, data, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.data.success) {
        toast.success('Timetable generated successfully!');
        setButtonClicked(false);
        await fetchTimetable();
        setShowTimetable(true);
      } else {
        toast.error('Failed to generate timetable.');
        setButtonClicked(false);
      }
    } catch (error) {
      console.error('Error generating timetable:', error);
      toast.error('Error occurred while generating timetable.');
    }
  };

  // Flatten and group timetable data by semester -> class
  const groupedTimetable = timetable.flat().reduce((acc: any, item: any) => {
    const { Semester, className, ...rest } = item;
    if (!acc[Semester]) acc[Semester] = {};
    if (!acc[Semester][className]) acc[Semester][className] = [];
    acc[Semester][className].push(rest);
    return acc;
  }, {});
  const semesterCount = Object.keys(groupedTimetable).length;

  // ---- Export -------------------------------------------------------------
  // Turn a filename-friendly slug out of arbitrary label text.
  const slugify = (text: string) =>
    text
      .trim()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'timetable';

  // Render a DOM node to a PNG/PDF download. Shared by the "export all" header
  // control and the per-class export buttons.
  const exportNode = async (
    node: HTMLElement | null,
    type: 'pdf' | 'image',
    baseName: string
  ) => {
    if (!node) return;
    setExporting(true);
    try {
      const canvas = await toCanvas(node, {
        backgroundColor: '#FFFFFF',
        pixelRatio: 2,
        cacheBust: true,
      });
      const dataUrl = canvas.toDataURL('image/png');

      if (type === 'image') {
        const link = document.createElement('a');
        link.download = `${baseName}.png`;
        link.href = dataUrl;
        link.click();
        toast.success('Timetable image saved');
      } else {
        const orientation =
          canvas.width >= canvas.height ? 'landscape' : 'portrait';
        const pdf = new jsPDF({
          orientation,
          unit: 'px',
          format: [canvas.width, canvas.height],
        });
        pdf.addImage(dataUrl, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${baseName}.pdf`);
        toast.success('Timetable PDF saved');
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Could not export the timetable. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Export every timetable (the whole modal body).
  const handleExport = async (type: 'pdf' | 'image' | 'print') => {
    setExportOpen(false);
    if (type === 'print') {
      window.print();
      return;
    }
    await exportNode(printRef.current, type, 'timetables');
  };

  // Export a single class card.
  const handleCardExport = async (
    key: string,
    type: 'pdf' | 'image',
    baseName: string
  ) => {
    setCardMenu(null);
    await exportNode(cardRefs.current[key], type, slugify(baseName));
  };

  useEffect(() => {
    fetchCounts();
    fetchTimetable();
  }, []);

  useEffect(() => {
    fetchAdminInfo();
  }, [url, token]);

  const closeModal = () => setButtonClicked(false);

  // Avatar initials from the first and last name (e.g. "Obed Ewudzie" → "OE").
  const nameParts = adminName.trim().split(/\s+/).filter(Boolean);
  const initials =
    nameParts.length === 0
      ? 'A'
      : nameParts.length === 1
      ? nameParts[0][0].toUpperCase()
      : (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();

  // ---- KPI stat cards (real resource counts) ----
  const stats = [
    { label: 'Lecture Rooms', value: roomCount, Icon: DoorOpen, tone: 'gold', href: '/lecturerooms' },
    { label: 'Courses', value: courseCount, Icon: BookOpen, tone: 'gold', href: '/coursesavailable' },
    { label: 'Lecturers', value: lecturerCount, Icon: GraduationCap, tone: 'gold', href: '/lecturersavailable' },
    { label: 'Classes', value: classCount, Icon: Presentation, tone: 'blue', href: '/classes' },
  ];

  // ---- Resource composition donut (real counts) ----
  const segments = [
    { label: 'Lecture Rooms', value: roomCount, color: '#3B6EF6' },
    { label: 'Courses', value: courseCount, color: '#E7AD29' },
    { label: 'Lecturers', value: lecturerCount, color: '#252B5F' },
    { label: 'Classes', value: classCount, color: '#7A75C1' },
  ];
  const totalResources = segments.reduce((sum, s) => sum + s.value, 0);

  let cumulative = 0;
  const gradientStops = segments
    .map((s) => {
      const start = totalResources ? (cumulative / totalResources) * 100 : 0;
      cumulative += s.value;
      const end = totalResources ? (cumulative / totalResources) * 100 : 0;
      return `${s.color} ${start}% ${end}%`;
    })
    .join(', ');
  const donutBackground = totalResources
    ? `conic-gradient(${gradientStops})`
    : '#E2E8F4';

  // ---- Calendar (current month, today highlighted) ----
  const today = new Date();
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = calendarDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });
  const calendarCells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();
  const changeMonth = (delta: number) =>
    setCalendarDate(new Date(year, month + delta, 1));

  return (
    <div className="dashboard flex">
      <Sidebar initials={initials} name={adminName} lowerMobileNav />

      <main className="dashboard-main">
        <div className="flex flex-col xl:flex-row">
          {/* ===== Center column ===== */}
          <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">
            {/* Topbar — on mobile the search + mic stretch to the full content
                width so they share the same margins as the cards below. */}
            <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 mb-6 lg:mb-8">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-b-blue shrink-0 -mt-1.5 ml-2 sm:mt-0 sm:ml-0">
                Dashboard
              </h1>
              <div className="flex items-center gap-2.5 w-full sm:w-auto sm:shrink-0 max-sm:mt-3">
                <div className="flex items-center gap-2.5 bg-white rounded-xl px-4 h-11 lg:h-12 flex-1 sm:flex-none sm:w-56 md:w-64 lg:w-72 xl:w-96 border border-[#E8ECF6]">
                  <Search size={18} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search"
                    className="search-input bg-transparent text-sm w-full font-light text-gray-500 placeholder:text-gray-400"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Voice search"
                  className="bg-gctu-gold text-gold-ink rounded-xl h-11 w-11 lg:h-12 lg:w-12 flex items-center justify-center shrink-0 hover:brightness-105 transition-colors"
                >
                  <Mic size={18} />
                </button>
              </div>
            </header>

            {/* KPI cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 mb-5 lg:mb-6">
              {loadingCounts
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl p-4 lg:p-5 shadow-sm bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <Skeleton className="h-10 w-10 lg:h-11 lg:w-11 rounded-xl" />
                        <Skeleton className="h-5 w-5 rounded" />
                      </div>
                      <Skeleton className="h-7 lg:h-8 w-14 mt-3 lg:mt-4 rounded" />
                      <Skeleton className="h-4 w-24 mt-2 rounded" />
                    </div>
                  ))
                : stats.map(({ label, value, Icon, tone, href }) => (
                    <Link
                      key={label}
                      href={href}
                      className={`kpi-card rounded-2xl p-4 lg:p-5 shadow-sm ${
                        tone === 'blue'
                          ? 'bg-accent text-white'
                          : 'bg-gctu-gold text-gold-ink'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span
                          className={`h-10 w-10 lg:h-11 lg:w-11 rounded-xl flex items-center justify-center ${
                            tone === 'blue' ? 'bg-white/20' : 'bg-white/40'
                          }`}
                        >
                          <Icon size={20} />
                        </span>
                        <ArrowUpRight className="kpi-arrow opacity-70" size={20} />
                      </div>
                      <p className="text-2xl lg:text-3xl font-bold mt-3 lg:mt-4">
                        {value}
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          tone === 'blue' ? 'text-white/80' : 'text-gold-ink/80'
                        }`}
                      >
                        {label}
                      </p>
                    </Link>
                  ))}
            </div>

            {/* Resource overview + Generate action */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-5 lg:mb-6">
              {/* Donut */}
              <div className="bg-white rounded-2xl p-5 lg:p-6 shadow-sm">
                <h2 className="font-semibold text-b-blue text-lg mb-1">
                  Resource Overview
                </h2>
                <p className="text-xs text-gray-400 font-light mb-4">
                  Distribution of records across the system
                </p>
                <div className="flex flex-col items-center gap-5 lg:gap-6 2xl:flex-row 2xl:items-center">
                  {loadingCounts ? (
                    <Skeleton className="donut shrink-0 !rounded-full" />
                  ) : (
                    <div
                      className="donut flex items-center justify-center shrink-0"
                      style={{ background: donutBackground }}
                    >
                      <div className="donut-hole bg-white flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-b-blue">
                          {totalResources}
                        </span>
                        <span className="text-[11px] text-gray-400 font-light">
                          Total
                        </span>
                      </div>
                    </div>
                  )}
                  <ul className="grid grid-cols-2 2xl:grid-cols-1 gap-x-5 gap-y-3 w-full">
                    {loadingCounts
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Skeleton className="h-2.5 w-2.5 !rounded-full shrink-0" />
                            <Skeleton className="h-4 flex-1 rounded" />
                          </li>
                        ))
                      : segments.map((s) => (
                          <li
                            key={s.label}
                            className="flex items-center justify-between gap-2 text-sm min-w-0"
                          >
                            <span className="flex items-center gap-2 text-gray-500 min-w-0">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: s.color }}
                              />
                              <span className="truncate">{s.label}</span>
                            </span>
                            <span className="font-semibold text-b-blue shrink-0">
                              {s.value}
                            </span>
                          </li>
                        ))}
                  </ul>
                </div>
              </div>

              {/* Generate timetable */}
              <div className="bg-b-blue rounded-2xl p-5 lg:p-6 shadow-sm text-white flex flex-col justify-between">
                <div>
                  <span className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center mb-4">
                    <CalendarPlus size={24} />
                  </span>
                  <h2 className="font-semibold text-xl">Generate New Timetable</h2>
                  <p className="text-sm text-white/70 font-light mt-2 leading-relaxed max-w-sm">
                    Build a conflict-free class schedule from your rooms, courses,
                    lecturers and classes. Students are notified automatically.
                  </p>
                </div>
                <button
                  onClick={() => setButtonClicked(true)}
                  className="mt-6 bg-gctu-gold text-gold-ink font-semibold rounded-xl px-5 py-3 w-fit hover:brightness-105 transition"
                >
                  Create Timetable
                </button>
              </div>
            </div>

            {/* Generated timetables (preview + opens full view in a modal) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-b-blue text-lg">
                    Generated Timetables
                  </h2>
                  {loadingTimetable ? (
                    <Skeleton className="h-4 w-52 mt-2 rounded" />
                  ) : (
                    <p className="text-sm text-gray-400 font-light mt-1">
                      {timetable.length === 0
                        ? 'No timetables generated yet.'
                        : `${semesterCount} semester schedule${
                            semesterCount > 1 ? 's' : ''
                          } ready to view.`}
                    </p>
                  )}
                </div>
                {loadingTimetable ? (
                  <Skeleton className="h-12 w-40 rounded-xl shrink-0" />
                ) : timetable.length === 0 ? (
                  <button
                    onClick={() => setButtonClicked(true)}
                    className="rounded-xl px-5 py-3 font-semibold text-white bg-accent hover:brightness-105 transition w-fit"
                  >
                    Create Timetable
                  </button>
                ) : (
                  <button
                    onClick={() => setShowTimetable(true)}
                    className="rounded-xl px-5 py-3 font-semibold text-gold-ink bg-gctu-gold hover:brightness-105 transition w-fit"
                  >
                    View Timetables
                  </button>
                )}
              </div>

              {loadingTimetable ? (
                <div className="mt-5 pt-5 border-t border-page-bg flex flex-wrap gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-32 rounded-lg" />
                  ))}
                </div>
              ) : timetable.length === 0 ? (
                <div className="mt-5 pt-5 border-t border-page-bg flex flex-col items-center text-center py-6">
                  <span className="h-12 w-12 rounded-xl bg-page-bg flex items-center justify-center text-accent mb-3">
                    <CalendarPlus size={22} />
                  </span>
                  <p className="text-sm text-gray-400 font-light max-w-xs">
                    Once you generate a timetable, its classes will appear here for
                    a quick overview.
                  </p>
                </div>
              ) : (
                <div className="mt-5 pt-5 border-t border-page-bg space-y-4">
                  {Object.keys(groupedTimetable).map((semester) => (
                    <div key={semester}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-2 w-2 rounded-full bg-gctu-gold" />
                        <p className="text-sm font-semibold text-b-blue">
                          {semester}
                        </p>
                        <span className="text-xs text-gray-400 font-light">
                          · {Object.keys(groupedTimetable[semester]).length}{' '}
                          {Object.keys(groupedTimetable[semester]).length === 1
                            ? 'class'
                            : 'classes'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(groupedTimetable[semester]).map((className) => (
                          <span
                            key={className}
                            className="text-xs font-medium text-gray-600 bg-page-bg rounded-lg px-3 py-1.5"
                          >
                            {className}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ===== Right panel ===== */}
          <aside className="w-full xl:w-72 shrink-0 px-4 sm:px-6 lg:px-6 py-6 xl:pl-0">
            {/* Profile — desktop only; on the mobile rail the avatar lives at
                the foot of the sidebar instead. */}
            <div className="flex items-center gap-3 mb-6 max-[768px]:hidden">
              <span className="h-12 w-12 rounded-full bg-gctu-gold flex items-center justify-center text-white font-bold text-lg shrink-0">
                {initials}
              </span>
              <span className="text-left leading-tight">
                <span className="block font-semibold text-b-blue">
                  {adminName || 'Administrator'}
                </span>
                <span className="block text-xs text-gray-400 font-light">
                  Admin
                </span>
              </span>
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-b-blue">{monthLabel}</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => changeMonth(-1)}
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => changeMonth(1)}
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {WEEK_DAYS.map((d) => (
                  <span
                    key={d}
                    className="text-[11px] font-normal text-gray-400 py-1.5"
                  >
                    {d}
                  </span>
                ))}
                {calendarCells.map((day, i) => (
                  <span
                    key={i}
                    className={`text-sm py-2 rounded-lg ${
                      day === null
                        ? ''
                        : isToday(day)
                        ? 'bg-accent text-white font-semibold'
                        : 'text-gray-600 hover:bg-blue-50'
                    }`}
                  >
                    {day ?? ''}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="font-semibold text-b-blue mb-3">Quick Access</p>
              <ul className="space-y-1.5">
                {stats.map(({ label, value, Icon, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-blue-50 transition-colors group"
                    >
                      <span className="h-9 w-9 rounded-lg bg-page-bg flex items-center justify-center text-accent">
                        <Icon size={18} />
                      </span>
                      <span className="text-sm font-medium text-gray-600 group-hover:text-b-blue flex-1">
                        {label}
                      </span>
                      {loadingCounts ? (
                        <Skeleton className="h-4 w-6 rounded" />
                      ) : (
                        <span className="text-sm font-semibold text-b-blue">
                          {value}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>

      {/* Generate timetable modal */}
      {buttonClicked && (
        <>
          <div className="modal-overlay" onClick={closeModal}></div>
          <div className="modal-card bg-white rounded-2xl">
            <div className="bg-b-blue rounded-t-2xl px-6 py-5">
              <h2 className="text-white font-semibold text-lg">Create New Timetable</h2>
              <p className="text-white/60 text-xs mt-0.5">
                Fill in the details to generate a schedule
              </p>
            </div>
            <form className="p-6 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="time-table-name" className="block text-sm font-semibold text-b-blue mb-1.5">
                  Timetable Name
                </label>
                <input
                  type="text"
                  id="time-table-name"
                  className="modal-field"
                  name="name"
                  value={data.name}
                  onChange={onChangeHandler}
                  placeholder="e.g. 2025/2026 Semester 1"
                />
              </div>
              <div>
                <label htmlFor="semester" className="block text-sm font-semibold text-b-blue mb-1.5">
                  Academic Period
                </label>
                <select
                  name="semester"
                  id="semester"
                  className="modal-field"
                  value={data.semester}
                  onChange={onChangeHandler}
                >
                  <option value="">Select Academic Period</option>
                  <option value="Semester 1">Semester 1</option>
                  <option value="Semester 2">Semester 2</option>
                </select>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-b-blue mb-2">Select Days</h3>
                <div className="grid grid-cols-2 gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                    (day) => (
                      <label
                        key={day}
                        className="flex items-center gap-2 text-sm text-gray-600 bg-page-bg rounded-lg px-3 py-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          value={day}
                          checked={data.days.includes(day)}
                          className="h-4 w-4 accent-accent"
                          onChange={handleDayChange}
                        />
                        {day}
                      </label>
                    )
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="flex-1 rounded-xl py-3 font-semibold text-gray-600 bg-page-bg hover:bg-gray-100 transition"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl py-3 font-semibold text-white bg-accent hover:brightness-105 transition"
                >
                  Generate
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Generated timetables modal */}
      {showTimetable && (
        <>
          <div className="modal-overlay" onClick={() => setShowTimetable(false)}></div>
          <div className="modal-card-wide bg-white rounded-2xl">
            <div className="bg-b-blue rounded-t-2xl px-6 py-5 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="text-white font-semibold text-lg">Generated Timetables</h2>
                <p className="text-white/60 text-xs mt-0.5 font-light">
                  All class schedules
                </p>
              </div>
              <div className="flex items-center gap-3">
                {timetable.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setExportOpen((v) => !v)}
                      disabled={exporting}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/15 px-3.5 text-[13px] font-semibold text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Download size={13} />
                      <span>{exporting ? 'Exporting…' : 'Export'}</span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${
                          exportOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {exportOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setExportOpen(false)}
                        />
                        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-black/8 bg-white py-1 shadow-lg">
                          <button
                            type="button"
                            onClick={() => handleExport('pdf')}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-b-blue transition-colors hover:bg-page-bg"
                          >
                            <FileText size={16} className="text-accent" /> Save as
                            PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExport('image')}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-b-blue transition-colors hover:bg-page-bg"
                          >
                            <ImageIcon size={16} className="text-accent" /> Save as
                            Image
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExport('print')}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-b-blue transition-colors hover:bg-page-bg"
                          >
                            <Printer size={16} className="text-accent" /> Print
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setShowTimetable(false)}
                  aria-label="Close"
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X size={22} />
                </button>
              </div>
            </div>
            <div ref={printRef} className="p-6">
              {timetable.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p className="font-semibold">No timetables yet</p>
                  <p className="text-sm mt-1 font-light">
                    Create your first timetable to see it here.
                  </p>
                </div>
              ) : (
                Object.keys(groupedTimetable).map((semester, index) => (
                  <div key={index} className="mb-8 last:mb-0">
                    <h3 className="text-base font-semibold text-b-blue mb-3">
                      {semester}
                    </h3>
                    {Object.keys(groupedTimetable[semester]).map((className, idx) => {
                      const { days, times, cell } = buildGrid(
                        groupedTimetable[semester][className]
                      );
                      const cardKey = `${semester}__${className}`;
                      const cardOpen = cardMenu === cardKey;
                      const cardName = `${semester} ${className}`;
                      return (
                        <div key={idx} className="mb-5 flex items-start gap-2">
                          <div
                            ref={(el) => {
                              cardRefs.current[cardKey] = el;
                            }}
                            className="flex-1 min-w-0 bg-white"
                          >
                            <h4 className="font-medium text-gray-600 mb-2">
                              {className}
                            </h4>
                            <div className="overflow-x-auto rounded-xl border border-[#E8ECF6]">
                              <table className="timetable-table">
                                <thead>
                                  <tr>
                                    <th>Time</th>
                                    {days.map((day, dayIndex) => (
                                      <th key={dayIndex}>{day}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {times.map((time, i) => (
                                    <tr key={i}>
                                      <td>{time}</td>
                                      {days.map((day, dayIndex) => {
                                        const item = cell[`${time}__${day}`];
                                        return (
                                          <td key={dayIndex}>
                                            {item ? (
                                              <>
                                                <p className="font-semibold text-b-blue">
                                                  {item.course}
                                                </p>
                                                <p className="text-xs text-gray-500 font-light">
                                                  {item.room}
                                                </p>
                                                <p className="text-xs text-gray-500 font-light">
                                                  {item.lecturer}
                                                </p>
                                              </>
                                            ) : null}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Per-class export */}
                          <div className="relative shrink-0 mt-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                setCardMenu(cardOpen ? null : cardKey)
                              }
                              disabled={exporting}
                              aria-label={`Export ${className}`}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E8ECF6] bg-white px-3 text-xs font-semibold text-b-blue transition hover:bg-page-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Download size={13} />
                              <span className="max-sm:hidden">Export</span>
                              <ChevronDown
                                size={12}
                                className={`transition-transform ${
                                  cardOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                            {cardOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setCardMenu(null)}
                                />
                                <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-black/8 bg-white py-1 shadow-lg">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCardExport(cardKey, 'pdf', cardName)
                                    }
                                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-b-blue transition-colors hover:bg-page-bg"
                                  >
                                    <FileText size={16} className="text-accent" />{' '}
                                    Save as PDF
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCardExport(
                                        cardKey,
                                        'image',
                                        cardName
                                      )
                                    }
                                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-b-blue transition-colors hover:bg-page-bg"
                                  >
                                    <ImageIcon
                                      size={16}
                                      className="text-accent"
                                    />{' '}
                                    Save as Image
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
