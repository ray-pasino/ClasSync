'use client';

import React, { useContext, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { assets } from '../../assets/assets';
import { StoreContext } from '../../context/Storecontext';
import {
  Eye,
  EyeOff,
  GraduationCap,
  Presentation,
  UserCog,
  ArrowRight,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';

type RoleKey = 'student' | 'lecturer' | 'administrator';

type RoleConfig = {
  label: string;
  short: string;
  article: string;
  Icon: LucideIcon;
  endpoint: string;
  redirect: string;
  idPlaceholder: string;
  reset: string;
};

const roles: Record<RoleKey, RoleConfig> = {
  student: {
    label: 'Student',
    short: 'Student',
    article: 'a',
    Icon: GraduationCap,
    endpoint: '/api/student/studentlogin',
    redirect: '/studenttimetable',
    idPlaceholder: 'Student ID',
    reset: '/verifystudentinfo',
  },
  lecturer: {
    label: 'Lecturer',
    short: 'Lecturer',
    article: 'a',
    Icon: Presentation,
    endpoint: '/api/lecturer/lecturerlogin',
    redirect: '/lecturerinfo',
    idPlaceholder: 'Lecturer ID',
    reset: '/verifylecturerinfo',
  },
  administrator: {
    label: 'Administrator',
    short: 'Admin',
    article: 'an',
    Icon: UserCog,
    endpoint: '/api/admin/administratorlogin',
    redirect: '/dashboard',
    idPlaceholder: 'Administrator ID',
    reset: '/verifyadministratorinfo',
  },
};

const roleOrder: RoleKey[] = ['student', 'lecturer', 'administrator'];

const isRoleKey = (value: string | null): value is RoleKey =>
  value === 'student' || value === 'lecturer' || value === 'administrator';

const LoginForm = () => {
  const { url, setToken } = useContext(StoreContext);
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');

  const [role, setRole] = useState<RoleKey>(
    isRoleKey(roleParam) ? roleParam : 'student'
  );
  const [data, setData] = useState({ id: '', password: '' });
  const [seePassword, setSeePassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const active = roles[role];

  const onChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const onSelectRole = (next: RoleKey) => {
    setRole(next);
    setErrorMessage('');
  };

  const onLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      const response = await axios.post(`${url}${active.endpoint}`, data, {
        timeout: 20000,
      });
      if (response.data.success) {
        setToken(response.data.token);
        localStorage.setItem('token', response.data.token);
        router.push(active.redirect);
      } else {
        setErrorMessage(response.data.message || 'Unable to sign in.');
      }
    } catch (error) {
      // Prefer the server's user-friendly message; fall back to a connection
      // message when the request never got a response (offline / timeout).
      const serverMessage =
        axios.isAxiosError(error) && error.response?.data?.message;
      setErrorMessage(
        serverMessage ||
          'We’re having trouble connecting to the server right now. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F7F8FB] lg:grid lg:grid-cols-2">
      {/* Brand / illustration panel (desktop) */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#EEF1F8] to-[#E4E9F6] px-12 py-10">
        <Link href="/" className="flex items-center gap-3">
          <img
            src={assets.logo}
            className="h-11 w-11 object-contain"
            alt="GCTU logo"
          />
          <div className="leading-tight">
            <p className="font-bold text-b-blue text-lg">GCTU ClasSync</p>
            <p className="text-xs text-gray-400 font-light">
              Class Timetable Platform
            </p>
          </div>
        </Link>

        <div className="flex flex-col items-center text-center">
          <img
            src="/assets/hero-illustration.svg"
            alt="Students reviewing their class timetable"
            className="w-full max-w-[420px]"
          />
          <h2 className="mt-8 text-2xl font-bold text-b-blue leading-tight">
            Smarter timetables, <span className="text-accent">synced</span> for
            everyone.
          </h2>
          <p className="mt-3 max-w-sm text-sm font-light leading-relaxed text-gray-500">
            One place for class schedules, with real-time updates and secure,
            role-based access for the whole campus.
          </p>
        </div>

        <div className="text-xs font-light text-gray-400">
          <p>
            © {new Date().getFullYear()} Ghana Communication Technology
            University · ClasSync
          </p>
          <p className="mt-1">Knowledge comes from learning.</p>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex min-h-screen flex-col px-5 pt-4 pb-5 sm:px-8 sm:pb-8 lg:min-h-0 lg:justify-center lg:px-16 lg:py-8">
        {/* Mobile top bar */}
        <div className="flex flex-col gap-3 lg:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-1 self-start -ml-2 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-b-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          <Link href="/" className="flex items-center gap-2.5 self-center">
            <img
              src={assets.logo}
              className="h-9 w-9 object-contain"
              alt="GCTU logo"
            />
            <span className="font-bold text-b-blue">GCTU ClasSync</span>
          </Link>
        </div>

        <div className="mx-auto w-full max-w-md">
          {/* Mobile illustration */}
          <img
            src="/assets/hero-illustration.svg"
            alt=""
            aria-hidden="true"
            className="mx-auto mt-6 w-full max-w-[200px] sm:max-w-[240px] lg:hidden"
          />

          <div className="mt-6 sm:mt-8 lg:mt-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-b-blue tracking-tight">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm font-light text-gray-500">
              Sign in to continue.
            </p>
          </div>

          {/* Role selector */}
          <div className="mt-5 sm:mt-7">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
              I am a
            </p>
            <div
              role="tablist"
              aria-label="Select your role"
              className="flex w-full gap-1 rounded-xl border border-black/8 bg-white p-1"
            >
              {roleOrder.map((key) => {
                const { short, Icon } = roles[key];
                const selected = key === role;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => onSelectRole(key)}
                    className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 motion-reduce:transition-none ${
                      selected
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-gray-500 hover:bg-page-bg hover:text-b-blue'
                    }`}
                  >
                    <Icon size={16} strokeWidth={2} className="shrink-0" />
                    {short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onLogin} className="mt-5 sm:mt-6">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-b-blue">
                {active.idPlaceholder}
              </span>
              <input
                type="text"
                name="id"
                inputMode="numeric"
                autoComplete="username"
                placeholder={`Enter your ${active.idPlaceholder.toLowerCase()}`}
                value={data.id}
                onChange={onChangeHandler}
                required
                className="w-full rounded-xl border border-black/8 bg-white px-4 py-2.5 sm:py-3 text-b-blue placeholder:text-gray-300 transition-shadow focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </label>

            <label className="mt-3.5 sm:mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-b-blue">
                Password
              </span>
              <div className="relative">
                <input
                  type={seePassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={data.password}
                  onChange={onChangeHandler}
                  required
                  className="w-full rounded-xl border border-black/8 bg-white px-4 py-2.5 sm:py-3 pr-12 text-b-blue placeholder:text-gray-300 transition-shadow focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
                <button
                  type="button"
                  onClick={() => setSeePassword((v) => !v)}
                  aria-label={seePassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:text-b-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  {seePassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </label>

            <div className="mt-2 sm:mt-2.5 flex justify-end text-sm">
              <Link
                href={active.reset}
                className="font-medium text-accent transition-colors hover:text-b-blue focus-visible:outline-none focus-visible:underline"
              >
                Forgot password?
              </Link>
            </div>

            {errorMessage && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group mt-5 sm:mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-accent px-7 py-3.5 font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FB] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              {loading
                ? 'Signing in…'
                : `Sign in as ${active.article} ${active.label}`}
              {!loading && (
                <ArrowRight
                  size={18}
                  className="transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                />
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

const Login = () => (
  <Suspense>
    <LoginForm />
  </Suspense>
);

export default Login;
