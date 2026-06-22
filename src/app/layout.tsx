import type { Metadata } from 'next';
import './globals.css';
import 'react-toastify/dist/ReactToastify.css';
import './toast-overrides.css';
import AppShell from './AppShell';
import StoreContextProvider from '../context/Storecontext';

export const metadata: Metadata = {
  title: 'GCTU ClasSync',
  icons: {
    // The ?v=2 query busts the browser's (very sticky) favicon cache.
    // Bump this number whenever you change favicon.ico.
    icon: '/favicon.ico?v=2',
    shortcut: '/favicon.ico?v=2',
    apple: '/favicon.ico?v=2',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreContextProvider>
          <AppShell>{children}</AppShell>
        </StoreContextProvider>
      </body>
    </html>
  );
}
