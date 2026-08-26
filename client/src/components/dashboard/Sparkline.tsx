/**
 * Dependency-free 7-day sparkline. A charting library would be ~40kB for one
 * polyline; this is ~30 lines and renders crisply at any size.
 */
import { useId } from 'react';

export interface SparklineProps {
  points: number[];
  isPositive: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export const Sparkline = ({
  points,
  isPositive,
  width = 72,
  height = 28,
  className,
}: SparklineProps) => {
  const gradientId = useId();

  if (points.length < 2) {
    return <div style={{ width, height }} className={className} aria-hidden="true" />;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  // Guard against a flat series producing a divide-by-zero.
  const range = max - min || 1;
  const padding = 2;
  const usableHeight = height - padding * 2;

  const coordinates = points.map((value, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = padding + usableHeight - ((value - min) / range) * usableHeight;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const stroke = isPositive ? '#22c55e' : '#ef4444';
  const line = coordinates.join(' ');
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={`7 day trend, ${isPositive ? 'up' : 'down'}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
