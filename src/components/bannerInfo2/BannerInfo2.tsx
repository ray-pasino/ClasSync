'use client';

import React from 'react';
import './BannerInfo2.css';
import { assets } from '../../assets/assets';
import Link from 'next/link';
import { ArrowRight, UserRound, Check } from 'lucide-react';

const SignInButton = ({ className = '' }: { className?: string }) => (
  <Link
    href="/login"
    className={`group inline-flex items-center justify-center gap-2.5 rounded-xl bg-accent px-7 py-3.5 font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FB] active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${className}`}
  >
    <UserRound size={20} />
    Sign In
    <ArrowRight
      size={18}
      className="transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
    />
  </Link>
);

const BannerInfo2 = () => {
  return (
    <div className="landing relative min-h-screen w-full overflow-hidden bg-[#F7F8FB] flex flex-col">
      <div className="relative max-w-7xl w-full mx-auto px-4 sm:px-8 lg:px-10 py-5 sm:py-6 flex-1 flex flex-col">
        {/* Nav */}
        <nav className="flex items-center justify-center sm:justify-between gap-4">
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
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/login?role=student"
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-b-blue hover:bg-white transition-colors"
            >
              Student
            </Link>
            <Link
              href="/login?role=lecturer"
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-b-blue hover:bg-white transition-colors"
            >
              Lecturer
            </Link>
            <Link
              href="/login?role=administrator"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-b-blue hover:brightness-110 transition"
            >
              Admin Login
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="flex-1 flex items-center">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-10 lg:gap-14 items-center w-full py-4 sm:py-10 lg:py-12">
          {/* Text column (headline always; paragraph, desktop buttons & bullets on lg+) */}
          <div className="min-w-0 text-center lg:text-left order-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-b-blue leading-[1.12]">
              Smarter timetables,{' '}
              <span className="text-accent">synced</span> for everyone.
            </h1>
            <p className="hidden lg:block text-gray-500 font-light text-base sm:text-lg mt-5 max-w-xl leading-relaxed">
              Create, share, and access class schedules in one place with
              real-time updates and secure, role-based access for the entire
              campus.
            </p>

            {/* Desktop sign in */}
            <div className="hidden lg:block mt-8">
              <SignInButton className="min-w-[220px]" />
            </div>

            <div className="hidden lg:flex flex-wrap items-center gap-x-7 gap-y-3 mt-10">
              {[
                'Conflict-free scheduling',
                'Real-time updates',
                'Secure access',
              ].map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-2 text-sm text-gray-500 font-light"
                >
                  <Check size={18} className="text-accent/50" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Hero illustration */}
          <div className="flex justify-center lg:justify-end order-2">
            <img
              src="/assets/hero-illustration.svg"
              alt="Students reviewing their class timetable"
              className="w-full max-w-[240px] sm:max-w-[460px] lg:max-w-[540px]"
            />
          </div>

          {/* Mobile sign in (under the illustration) */}
          <div className="order-3 lg:hidden w-full max-w-sm mx-auto mt-10">
            <SignInButton className="w-full" />
          </div>
        </section>
        </div>

        {/* Footer note */}
        <footer className="pt-4 sm:pt-6 border-t border-[#E6EAF2] flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-3 text-center sm:text-left">
          <p className="whitespace-nowrap text-[10px] sm:text-sm text-gray-400 font-light">
            © {new Date().getFullYear()} Ghana Communication Technology
            University · ClasSync
          </p>
          <p className="text-[11px] sm:text-sm text-gray-400 font-light">
            Knowledge comes from learning.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default BannerInfo2;
