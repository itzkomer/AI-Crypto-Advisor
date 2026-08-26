/** Presentation helpers. Kept pure so components stay declarative. */

export const formatUsd = (value: number): string => {
  const fractionDigits = Math.abs(value) < 1 ? 4 : 2;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
};

export const formatCompactUsd = (value: number | null): string => {
  if (value === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

export const formatPercent = (value: number): string =>
  `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

/** "3h ago" / "2d ago" - avoids a date library for one use case. */
export const formatRelativeTime = (isoDate: string): string => {
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) return '';

  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';

  type Step = { unit: Intl.RelativeTimeFormatUnit; seconds: number };
  const smallest: Step = { unit: 'minute', seconds: 60 };
  const steps: Step[] = [
    smallest,
    { unit: 'hour', seconds: 3_600 },
    { unit: 'day', seconds: 86_400 },
    { unit: 'month', seconds: 2_592_000 },
    { unit: 'year', seconds: 31_536_000 },
  ];

  let chosen: Step = smallest;
  for (const step of steps) {
    if (seconds >= step.seconds) chosen = step;
  }

  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'narrow' });
  return formatter.format(-Math.round(seconds / chosen.seconds), chosen.unit);
};

export const formatDate = (isoDate: string): string => {
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) return isoDate;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(timestamp));
};
