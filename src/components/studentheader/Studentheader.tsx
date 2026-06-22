'use client';

import React, { useEffect, useContext, useState } from 'react';
import { assets } from '../../assets/assets';
import { StoreContext } from '../../context/Storecontext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { ChevronDown, LogOut } from 'lucide-react';

const Studentheader = () => {
  const [studentName, setStudentName] = useState('');
  const { url, token, setToken } = useContext(StoreContext);
  const [drop, setDrop] = useState(false);
  const router = useRouter();

  const toggleDropdown = () => setDrop((v) => !v);

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

  useEffect(() => {
    const fetchStudentInfo = async () => {
      try {
        const response = await axios.get(`${url}/api/student/info`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.success) {
          setStudentName(response.data.data.name);
        }
      } catch (error) {
        console.error('Error fetching student info:', error);
      }
    };
    fetchStudentInfo();
  }, [url, token]);

  const initials = studentName
    ? studentName
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'ST';

  return (
    <header className="sticky top-0 z-20 border-b border-black/8 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
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

        <div className="relative">
          <button
            type="button"
            onClick={toggleDropdown}
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-page-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
              {initials}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold leading-tight text-b-blue">
                {studentName ? studentName.toUpperCase() : 'Student'}
              </span>
              <span className="block text-[11px] text-gray-400">Student</span>
            </span>
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform duration-200 ${
                drop ? 'rotate-180' : ''
              }`}
            />
          </button>

          {drop && (
            <>
              {/* click-away layer */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDrop(false)}
              />
              <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-black/8 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Studentheader;
