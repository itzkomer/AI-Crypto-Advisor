import type { ReactNode } from 'react';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Info, WifiOff } from 'lucide-react';

type Tone = 'info' | 'warning' | 'error' | 'success';

const TONES: Record<Tone, { wrapper: string; icon: ReactNode }> = {
  info: {
    wrapper: 'border-brand-500/25 bg-brand-500/10 text-brand-300',
    icon: <Info className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  warning: {
    wrapper: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
    icon: <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  error: {
    wrapper: 'border-bear/30 bg-bear/10 text-red-300',
    icon: <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  success: {
    wrapper: 'border-bull/25 bg-bull/10 text-emerald-300',
    icon: <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
};

export interface AlertProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export const Alert = ({ tone = 'info', children, className, action }: AlertProps) => {
  const { wrapper, icon } = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={clsx(
        'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs leading-relaxed',
        wrapper,
        className,
      )}
    >
      <span className="mt-0.5">{icon}</span>
      <span className="flex-1">{children}</span>
      {action}
    </div>
  );
};
