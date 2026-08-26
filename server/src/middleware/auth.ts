/**
 * JWT authentication middleware.
 *
 * Verifies the `Authorization: Bearer <token>` header, confirms the user still
 * exists (so deleting a user immediately invalidates outstanding tokens), and
 * attaches the principal to `req.user`.
 */
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { UnauthorizedError } from '../utils/errors';
import type { JwtPayload } from '../types';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

const extractBearerToken = (header: string | undefined): string | null => {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim() || null;
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === 'string' || !decoded.sub || typeof decoded.sub !== 'string') {
      throw new UnauthorizedError('Malformed token payload.');
    }
    return {
      sub: decoded.sub,
      email: typeof decoded['email'] === 'string' ? decoded['email'] : '',
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Session expired. Please sign in again.');
    }
    throw new UnauthorizedError('Invalid or malformed token.');
  }
};

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) throw new UnauthorizedError('Missing bearer token.');

    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true },
    });

    if (!user) throw new UnauthorizedError('Account no longer exists.');

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Narrows `req.user` for handlers mounted behind `authenticate`.
 * Throws rather than returning undefined so a routing mistake fails loudly.
 */
export const requireUser = (req: Request): AuthenticatedUser => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required.');
  }
  return req.user;
};
