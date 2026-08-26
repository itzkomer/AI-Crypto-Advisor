/**
 * Minimal structured logger. Deliberately dependency-free - in production it
 * emits one JSON object per line so Render/Railway log drains can parse it.
 */
import { env, isProduction } from '../config/env';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL: Level = env.NODE_ENV === 'test' ? 'error' : isProduction ? 'info' : 'debug';

const COLORS: Record<Level, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};
const RESET = '\x1b[0m';

const write = (level: Level, message: string, context?: Record<string, unknown>): void => {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;

  const timestamp = new Date().toISOString();

  if (isProduction) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ level, timestamp, message, ...context }));
    return;
  }

  const suffix = context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
  // eslint-disable-next-line no-console
  console.log(`${COLORS[level]}${level.toUpperCase().padEnd(5)}${RESET} ${message}${suffix}`);
};

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => write('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => write('error', message, context),
};
