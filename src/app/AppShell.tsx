'use client';

import { ToastContainer, Slide } from 'react-toastify';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:flex">
      <ToastContainer
        position="bottom-right"
        autoClose={3500}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        hideProgressBar={false}
        theme="light"
        transition={Slide}
      />
      {children}
    </div>
  );
}
