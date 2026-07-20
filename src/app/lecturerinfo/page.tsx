'use client';

import React, { useState, useEffect, useContext, useRef } from 'react';
import LecturerSidebar from '../../components/lecturersidebar/LecturerSidebar';
import axios from 'axios';
import { StoreContext } from '../../context/Storecontext';
import { toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';
import {
  CalendarX2,
  MapPin,
  Users,
  Download,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Printer,
  CalendarDays,
  BookOpen,
  TrendingUp,
  Presentation,
  CalendarOff,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'react-toastify';
import AlertsFeed from '../../components/alertsfeed/AlertsFeed';
import NotifyDialog, {
  type NotifyTarget,
} from '../../components/notifydialog/NotifyDialog';
import { cohortLabel } from '../../lib/match';

const WEEK_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const Lecturerinfo = () => {
  const { url, token } = useContext(StoreContext);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [lecturer, setLecturer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Change/cancellation alert dialog: the class it targets (null = closed).
  const [notifyTarget, setNotifyTarget] = useState<NotifyTarget | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchTimetable = async () => {
    try {
      const response = await axios.get(`${url}/api/timetable/timetable`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTimetable(response.data.timetable || []);
    } catch (error) {
      console.error('Error fetching timetable:', error);
    }
  };

  const fetchLecturerInfo = async () => {
    try {
      const response = await axios.get(`${url}/api/lecturer/info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setLecturer(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching lecturer info:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${url}/api/lecturer/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  useEffect(() => {
    (async () => {
      await Promise.all([fetchTimetable(), fetchLecturerInfo(), fetchAlerts()]);
      setLoading(false);
    })();
  }, []);

  // Raise a change/cancellation alert for one of this lecturer's own classes.
  // Returns true so the dialog closes on success. A cancellation removes this
  // lecturer's sessions, so refresh the schedule and alerts afterwards.
  const sendAlert = async ({
    type,
    message,
  }: {
    type: 'cancellation' | 'change';
    message: string;
  }): Promise<boolean> => {
    if (!notifyTarget) return false;
    try {
      const response = await axios.post(
        `${url}/api/lecturer/alert`,
        {
          className: notifyTarget.className,
          semester: notifyTarget.semester,
          level: notifyTarget.level,
          type,
          message,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        const r = response.data.recipients || {};
        const sms = response.data.sms || {};
        const smsNote = sms.sent
          ? ` SMS sent to ${sms.count} number${sms.count === 1 ? '' : 's'}.`
          : ' Posted in-app (SMS not sent).';
        toast.success(
          `${
            type === 'cancellation' ? 'Class cancelled' : 'Change announced'
          } — notified ${r.students || 0} student${
            r.students === 1 ? '' : 's'
          }.${smsNote}`
        );
        await fetchAlerts();
        if (type === 'cancellation') await fetchTimetable();
        return true;
      }
      toast.error(response.data.message || 'Could not send the alert.');
      return false;
    } catch (error: any) {
      console.error('Error sending alert:', error);
      toast.error(
        error?.response?.data?.message || 'Error sending the alert. Please try again.'
      );
      return false;
    }
  };

  const lecturerName: string = lecturer?.name || '';

  // This lecturer's sessions across the whole timetable.
  const myItems = timetable
    .flat()
    .filter((item: any) => item?.lecturer === lecturerName);

  // Group sessions by semester → cohort (programme + level) so the lecturer can
  // read each cohort's grid independently and act on the right one.
  const grouped = myItems.reduce((acc: any, item: any) => {
    const { Semester, className, level, ...rest } = item;
    const label = cohortLabel(className, level);
    if (!acc[Semester]) acc[Semester] = {};
    if (!acc[Semester][label]) {
      acc[Semester][label] = { className, level, items: [] };
    }
    acc[Semester][label].items.push(rest);
    return acc;
  }, {});

  // Day columns derived from the lecturer's own sessions, ordered Mon→Sun.
  const daysPresent = new Set<string>();
  myItems.forEach((item: any) => item?.day && daysPresent.add(item.day));
  const days = WEEK_ORDER.filter((day) => daysPresent.has(day));

  const isEmpty = Object.keys(grouped).length === 0;

  // ---- Insights -----------------------------------------------------------
  const totalSessions = myItems.length;
  const courseCount = new Set(
    myItems.map((i: any) => i.course).filter(Boolean)
  ).size;
  const classCount = new Set(
    myItems.map((i: any) => i.className).filter(Boolean)
  ).size;

  const dayCounts: Record<string, number> = {};
  myItems.forEach((i: any) => {
    if (i.day) dayCounts[i.day] = (dayCounts[i.day] || 0) + 1;
  });
  let busiestDay = '—';
  let busiestCount = 0;
  WEEK_ORDER.forEach((d) => {
    if ((dayCounts[d] || 0) > busiestCount) {
      busiestCount = dayCounts[d];
      busiestDay = d;
    }
  });

  const insights: {
    label: string;
    value: string | number;
    Icon: LucideIcon;
    tone: 'blue' | 'gold';
  }[] = [
    { label: 'Weekly sessions', value: totalSessions, Icon: CalendarDays, tone: 'blue' },
    { label: 'Courses', value: courseCount, Icon: BookOpen, tone: 'gold' },
    { label: 'Classes', value: classCount, Icon: Presentation, tone: 'blue' },
    {
      label: 'Busiest day',
      value: busiestCount ? busiestDay.slice(0, 3) : '—',
      Icon: TrendingUp,
      tone: 'gold',
    },
  ];

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaysClasses = myItems.filter((i: any) => i.day === todayName);

  const firstName = lecturerName.trim().split(/\s+/)[0] || '';

  const nameParts = lecturerName.trim().split(/\s+/).filter(Boolean);
  const initials =
    nameParts.length === 0
      ? 'LC'
      : nameParts.length === 1
      ? nameParts[0][0].toUpperCase()
      : (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();

  const fileBase = `schedule-${(lecturerName || 'lecturer')
    .replace(/\s+/g, '-')
    .toLowerCase()}`;

  // ---- Export -------------------------------------------------------------
  const handleExport = async (type: 'pdf' | 'image' | 'print') => {
    setExportOpen(false);
    if (type === 'print') {
      window.print();
      return;
    }
    if (!printRef.current) return;
    setExporting(true);
    try {
      const canvas = await toCanvas(printRef.current, {
        backgroundColor: '#F7F8FB',
        pixelRatio: 2,
        cacheBust: true,
      });
      const dataUrl = canvas.toDataURL('image/png');

      if (type === 'image') {
        const link = document.createElement('a');
        link.download = `${fileBase}.png`;
        link.href = dataUrl;
        link.click();
        toast.success('Schedule image saved');
      } else {
        const orientation =
          canvas.width >= canvas.height ? 'landscape' : 'portrait';
        const pdf = new jsPDF({
          orientation,
          unit: 'px',
          format: [canvas.width, canvas.height],
        });
        pdf.addImage(dataUrl, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${fileBase}.pdf`);
        toast.success('Schedule PDF saved');
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Could not export the schedule. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#F7F8FB]">
      <LecturerSidebar initials={initials} name={lecturerName} />

      {/* The whole right side scrolls; the sidebar stays fixed. */}
      <main className="min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        <header className="mb-4 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold tracking-tight text-b-blue sm:text-3xl">
              My Schedule
            </h1>

            <div className="flex shrink-0 items-center gap-3 sm:gap-4">
              {!loading && !isEmpty && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setExportOpen((v) => !v)}
                    disabled={exporting}
                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-accent px-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 sm:gap-1.5 sm:px-3.5"
                  >
                    <Download size={13} />
                    <span className="hidden sm:inline">
                      {exporting ? 'Exporting…' : 'Export'}
                    </span>
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

              {/* Profile — desktop only; on mobile the avatar lives at the
                  bottom of the sidebar instead. */}
              <div className="hidden items-center gap-2.5 lg:flex">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gctu-gold text-xs font-bold text-white">
                  {initials}
                </span>
                <span className="text-left leading-tight">
                  <span className="block text-[13px] font-semibold text-b-blue">
                    {lecturerName ? lecturerName.toUpperCase() : 'Lecturer'}
                  </span>
                  <span className="block text-[11px] font-light text-gray-400">
                    Lecturer
                  </span>
                </span>
              </div>
            </div>
          </div>

          <p className="mt-1 truncate text-xs font-light text-gray-500 sm:text-sm">
            {firstName ? (
              <>
                Welcome back,{' '}
                <span className="font-medium text-b-blue">{firstName}</span>
              </>
            ) : (
              'Your weekly teaching schedule'
            )}
          </p>
        </header>

        {!loading && <AlertsFeed alerts={alerts} />}

        {loading ? (
          /* Skeleton — geometry mirrors the loaded layout. */
          <div className="animate-pulse motion-reduce:animate-none">
            <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-5 sm:gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-black/5 bg-white p-2 shadow-sm sm:p-3"
                >
                  <div className="h-6 w-6 rounded-lg bg-black/10 sm:h-8 sm:w-8" />
                  <div className="mt-2 h-5 w-12 rounded-md bg-black/10" />
                  <div className="mt-2 h-3 w-16 rounded bg-black/5" />
                </div>
              ))}
            </div>
            <div className="mb-2.5 h-4 w-36 rounded bg-black/10" />
            <div className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm">
              <div className="border-b border-black/8 bg-page-bg/50 px-4 py-3.5">
                <span className="block h-4 w-44 rounded bg-black/10" />
              </div>
              <div className="divide-y divide-black/5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3">
                    <span className="h-4 w-28 shrink-0 rounded bg-black/10" />
                    <span className="h-11 flex-1 rounded-lg bg-black/5" />
                    <span className="hidden h-11 flex-1 rounded-lg bg-black/5 sm:block" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Insight KPI cards. */}
            <div className="mb-4 grid shrink-0 grid-cols-2 gap-2 sm:mb-5 sm:gap-3 lg:grid-cols-4">
              {insights.map(({ label, value, Icon, tone }) => (
                <div
                  key={label}
                  className={`flex flex-col rounded-xl p-2 shadow-sm sm:p-3 ${
                    tone === 'blue'
                      ? 'bg-accent text-white'
                      : 'bg-gctu-gold text-gold-ink'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-lg sm:h-8 sm:w-8 ${
                      tone === 'blue' ? 'bg-white/20' : 'bg-white/40'
                    }`}
                  >
                    <Icon size={14} className="sm:h-[15px] sm:w-[15px]" />
                  </span>
                  <p className="mt-1.5 text-sm font-bold leading-none tracking-tight sm:mt-2 sm:text-lg">
                    {value}
                  </p>
                  <p
                    className={`mt-1 text-[9px] font-medium leading-tight sm:text-[11px] ${
                      tone === 'blue' ? 'text-white/85' : 'text-gold-ink/80'
                    }`}
                  >
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {/* Today */}
            <section className="mb-5 shrink-0 sm:mb-6">
              <div className="mb-2 flex items-center gap-2 sm:mb-2.5 sm:gap-2.5">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
                </span>
                <h2 className="text-[13px] font-semibold text-b-blue sm:text-base">
                  Today
                </h2>
                <span className="text-[13px] font-light text-gray-400 sm:text-base">
                  · {todayName}
                </span>
                <span className="ml-auto text-[11px] font-medium tabular-nums text-gray-400 sm:text-xs">
                  {todaysClasses.length}{' '}
                  {todaysClasses.length === 1 ? 'class' : 'classes'}
                </span>
              </div>

              {todaysClasses.length === 0 ? (
                <p className="flex items-center gap-2 text-[13px] font-light text-gray-500 sm:text-sm">
                  <CalendarOff size={14} className="shrink-0 text-gray-400" />
                  No classes scheduled today.
                </p>
              ) : (
                <ul className="divide-y divide-black/5 border-l-2 border-accent/25 pl-3 sm:pl-4">
                  {todaysClasses.map((c: any, i: number) => (
                    <li
                      key={i}
                      className="flex flex-col gap-0.5 py-1.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4 sm:py-2"
                    >
                      <span className="min-w-[6.5rem] whitespace-nowrap text-xs font-semibold tabular-nums text-accent sm:text-[13px]">
                        {c.time}
                      </span>
                      <span className="flex-1 text-[13px] font-medium text-b-blue sm:text-sm">
                        {c.course}
                      </span>
                      <span className="flex items-center gap-2.5 text-[11px] text-gray-500 sm:gap-3 sm:text-xs">
                        <span className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-accent" />
                          {c.room}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users size={12} className="text-accent" />
                          {c.className}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {isEmpty ? (
              <div className="flex flex-col items-center rounded-2xl border border-black/8 bg-white px-6 py-16 text-center shadow-sm">
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <CalendarX2 size={28} />
                </span>
                <h3 className="text-lg font-semibold text-b-blue">
                  No classes assigned yet
                </h3>
                <p className="mt-1.5 max-w-sm text-sm font-light text-gray-500">
                  You have no sessions on the published timetable right now.
                  Please check back once a new timetable is generated.
                </p>
              </div>
            ) : (
              /* Printable schedule document. */
              <div className="px-0.5 pt-0.5">
                <div ref={printRef} className="bg-[#F7F8FB]">
                  <div className="flex flex-col gap-5">
                    {Object.keys(grouped).map((semester, index) => (
                      <section key={index}>
                        <div className="mb-2.5 flex items-center gap-3">
                          <h2 className="text-sm font-bold uppercase tracking-wide text-b-blue">
                            {semester}
                          </h2>
                          <span className="h-px flex-1 bg-black/8" />
                        </div>

                        <div className="flex flex-col gap-3">
                          {Object.keys(grouped[semester]).map(
                            (label, idx) => {
                              const cohort = grouped[semester][label];
                              return (
                              <div
                                key={idx}
                                className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm"
                              >
                                <div className="flex items-center gap-2 border-b border-black/8 bg-page-bg/50 px-4 py-2.5">
                                  <Users size={14} className="text-accent" />
                                  <h3 className="text-sm font-semibold text-b-blue">
                                    {label}
                                  </h3>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setNotifyTarget({
                                        semester,
                                        className: cohort.className,
                                        level: cohort.level,
                                      })
                                    }
                                    aria-label={`Notify or cancel ${label}`}
                                    title="Notify students of a change or cancel"
                                    className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-lg border border-[#E8ECF6] bg-white px-2.5 text-xs font-semibold text-accent transition hover:bg-page-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                                  >
                                    <Megaphone size={13} />
                                    <span className="max-sm:hidden">Notify</span>
                                  </button>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse text-xs sm:text-[13px]">
                                    <thead>
                                      <tr className="bg-page-bg text-left">
                                        <th className="sticky left-0 z-10 whitespace-nowrap border-r border-black/5 bg-page-bg px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 sm:px-4 sm:py-2.5 sm:text-xs">
                                          Time
                                        </th>
                                        {days.map(
                                          (day: string, dayIndex: number) => (
                                            <th
                                              key={dayIndex}
                                              className="whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 sm:px-4 sm:py-2.5 sm:text-xs"
                                            >
                                              {day}
                                            </th>
                                          )
                                        )}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {cohort.items.map(
                                        (item: any, index: number) => (
                                          <tr
                                            key={index}
                                            className="border-t border-black/8 transition-colors hover:bg-page-bg/40"
                                          >
                                            <td className="sticky left-0 z-10 whitespace-nowrap border-r border-black/5 bg-white px-2.5 py-1.5 align-middle text-[11px] font-medium text-gray-500 sm:px-4 sm:py-2 sm:text-[13px]">
                                              {item.time}
                                            </td>
                                            {days.map(
                                              (day: string, dayIndex: number) => (
                                                <td
                                                  key={dayIndex}
                                                  className="px-1.5 py-1.5 align-middle sm:px-3 sm:py-2"
                                                >
                                                  {item.day === day ? (
                                                    <div className="flex min-w-[5.5rem] flex-col gap-0.5 rounded-lg bg-accent/5 px-1.5 py-1 sm:min-w-[7.5rem] sm:px-2.5 sm:py-2">
                                                      <span className="text-[11px] font-semibold leading-tight text-b-blue sm:text-[13px]">
                                                        {item.course}
                                                      </span>
                                                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-gray-500 sm:gap-x-3 sm:text-[11px]">
                                                        <span className="flex items-center gap-1">
                                                          <MapPin
                                                            size={10}
                                                            className="shrink-0 text-accent sm:h-[11px] sm:w-[11px]"
                                                          />
                                                          {item.room}
                                                        </span>
                                                      </span>
                                                    </div>
                                                  ) : (
                                                    <span className="text-gray-300">
                                                      —
                                                    </span>
                                                  )}
                                                </td>
                                              )
                                            )}
                                          </tr>
                                        )
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Change / cancellation alert dialog for the lecturer's own classes. */}
      <NotifyDialog
        target={notifyTarget}
        onClose={() => setNotifyTarget(null)}
        onSend={sendAlert}
        cancelNote={`This cancels your sessions for ${
          notifyTarget
            ? cohortLabel(notifyTarget.className, notifyTarget.level)
            : 'the class'
        } and notifies its students. Other lecturers' sessions on this class are not affected.`}
      />
    </div>
  );
};

export default Lecturerinfo;
