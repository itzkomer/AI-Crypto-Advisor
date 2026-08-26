import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LineChart, LogOut, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

export const Header = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape - a menu that traps the user is worse than none.
  useEffect(() => {
    if (!isMenuOpen) return;

    const onPointerDown = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-surface-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="flex items-center gap-2.5 rounded-md">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/15 ring-1 ring-brand-500/30">
            <LineChart className="h-4 w-4 text-brand-400" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-ink-100">
            AI Crypto Advisor
          </span>
        </Link>

        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-2.5 text-sm transition-colors hover:border-white/20 hover:bg-white/[0.06]"
            >
              <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-brand-500 to-accent-500 text-[11px] font-bold text-surface-950">
                {initials(user.name)}
              </span>
              <span className="hidden max-w-[10rem] truncate text-ink-300 sm:block">
                {user.name}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-ink-500" aria-hidden="true" />
            </button>

            {isMenuOpen ? (
              <div
                role="menu"
                className="panel absolute right-0 mt-2 w-56 overflow-hidden p-1.5"
              >
                <div className="border-b border-white/[0.06] px-2.5 pb-2 pt-1.5">
                  <p className="truncate text-sm font-medium text-ink-100">{user.name}</p>
                  <p className="truncate text-xs text-ink-500">{user.email}</p>
                </div>

                <Link
                  to="/onboarding"
                  role="menuitem"
                  onClick={() => setIsMenuOpen(false)}
                  className="mt-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-ink-300 transition-colors hover:bg-white/[0.06] hover:text-ink-100"
                >
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  Edit preferences
                </Link>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-ink-300 transition-colors hover:bg-bear/10 hover:text-red-300"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
};
