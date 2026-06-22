'use client';

import { createContext, useState, ReactNode } from 'react';

type StoreContextValue = {
  url: string;
  token: string;
  setToken: (token: string) => void;
};

export const StoreContext = createContext<StoreContextValue>({
  url: '',
  token: '',
  setToken: () => {},
});

const StoreContextProvider = (props: { children: ReactNode }) => {
  // Same-origin: the API now lives in this Next.js app under /api/*, so an
  // empty base makes requests resolve to the current host. Override with
  // NEXT_PUBLIC_API_URL only if the API is hosted elsewhere.
  const url = process.env.NEXT_PUBLIC_API_URL || '';
  const [token, setToken] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
  );

  const contextvalue: StoreContextValue = {
    url,
    token,
    setToken,
  };

  return (
    <StoreContext.Provider value={contextvalue}>
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreContextProvider;
