import type { ReactNode } from 'react';
import { Header } from './Header';

/** Chrome for authenticated pages. */
export const AppShell = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-screen flex-col">
    <Header />
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {children}
    </main>
    <footer className="border-t border-white/[0.06] py-5">
      <p className="mx-auto max-w-7xl px-4 text-center text-xs text-ink-500 sm:px-6 lg:px-8">
        Moveo Coding Task · Market data from CoinGecko &amp; CryptoPanic · Insights are
        AI-generated and not financial advice.
      </p>
    </footer>
  </div>
);

/** Centered chrome for auth and onboarding screens. */
export const CenteredShell = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
    <div className="w-full max-w-md">{children}</div>
  </div>
);
