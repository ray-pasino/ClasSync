'use client';

import React, { useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { assets } from '../../assets/assets';
import { StoreContext } from '../../context/Storecontext';
import { Eye, EyeOff } from 'lucide-react';

const Siplogin = () => {
  const { url, setToken } = useContext(StoreContext);
  const router = useRouter();

  const [data, setData] = useState({ id: '', password: '' });
  const [seePassword, setSeePassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const onChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const onLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      const response = await axios.post(`${url}/api/student/studentlogin`, data, {
        timeout: 20000,
      });
      if (response.data.success) {
        setToken(response.data.token);
        localStorage.setItem('token', response.data.token);
        router.push('/noticeboard');
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

  // The SIP inputs and the sign-in button are all the same 38px-tall control.
  const fieldClass =
    'block h-[38px] w-full rounded-md border border-[#CED4DA] bg-white px-3 py-[7px] text-[15px] leading-[22px] text-[#212529] placeholder:text-[#8A9099] focus:border-[#E0A8D6] focus:outline-none focus:ring-2 focus:ring-[#E0A8D6]/40';

  return (
    <div className="min-h-screen w-full bg-white">
      {/* Campus hero */}
      <div className="p-3 pb-0 sm:p-4 sm:pb-0">
        <div className="relative h-[260px] overflow-hidden rounded-xl sm:h-[360px] lg:h-[445px]">
          <img
            src={assets.adminBlock2}
            alt="GCTU administration block"
            className="h-full w-full object-cover opacity-[0.88]"
          />
          <h1 className="absolute left-0 top-[23%] w-full text-center text-[32px] font-bold leading-none tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] sm:text-[42px] lg:text-[48px]">
            Welcome!
          </h1>
        </div>
      </div>

      {/* Sign-in card, overlapping the hero */}
      <div className="relative z-10 mx-auto -mt-16 w-full max-w-[438px] px-4 pb-16 sm:-mt-24 lg:-mt-[175px]">
        <div className="rounded-xl bg-white px-6 pb-5 pt-8 shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
          {/* University lockup */}
          <div className="flex items-center justify-center gap-2.5">
            <img
              src={assets.logo}
              alt="GCTU logo"
              className="h-[55px] w-[55px] shrink-0 object-contain"
            />
            <div className="leading-[1.2]">
              <p className="text-[13.5px] font-bold uppercase tracking-tight text-b-blue">
                Ghana Communication
              </p>
              <p className="text-[13.5px] font-bold uppercase tracking-tight text-b-blue">
                Technology University
              </p>
              <p className="mt-[3px] text-[6px] font-semibold uppercase tracking-wide text-gctu-gold">
                …Knowledge Comes From Learning
              </p>
            </div>
          </div>

          <h2 className="mt-2.5 text-center text-[21px] font-bold leading-[26px] text-[#212529]">
            Student Information Portal (SIP) Sign In
          </h2>

          <p className="mt-3 text-center text-[15.5px] font-bold leading-[26px] text-[#212529]">
            If you are in L100, L200 and Graduate Students{' '}
            <Link
              href="/siplogin"
              className="block font-bold text-[#E0350B] no-underline hover:no-underline"
            >
              click here
            </Link>
          </p>

          <form onSubmit={onLogin} className="mt-[60px]">
            <input
              type="text"
              name="id"
              inputMode="numeric"
              autoComplete="username"
              placeholder="Student ID"
              value={data.id}
              onChange={onChangeHandler}
              required
              className={fieldClass}
            />

            <div className="relative mt-[19px]">
              <input
                type={seePassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder="Password"
                value={data.password}
                onChange={onChangeHandler}
                required
                className={`pr-10 ${fieldClass}`}
              />
              <button
                type="button"
                onClick={() => setSeePassword((v) => !v)}
                aria-label={seePassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-[#8A9099] transition-colors hover:text-[#212529] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0A8D6]/50"
              >
                {seePassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {errorMessage && (
              <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-[43px] flex h-[38px] w-full items-center justify-center rounded-md bg-[#2B2F55] text-[13px] font-bold uppercase leading-4 tracking-[0.04em] text-white transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-[#1F2342] active:scale-100 motion-reduce:transition-none motion-reduce:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2F55]/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-[29px] text-[14px] leading-[21px] text-[#6C757D]">
            Forgot your password?{' '}
            <Link
              href="/verifystudentinfo"
              className="font-bold text-[#212529] no-underline hover:no-underline"
            >
              Click here
            </Link>{' '}
            to do a password reset.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Siplogin;
