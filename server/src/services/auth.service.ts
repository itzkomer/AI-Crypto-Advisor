/**
 * Registration, login and token issuance.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import type { AuthResponse, JwtPayload, PublicUser } from '../types';

interface UserRow {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  profile: { completedAt: Date | null } | null;
}

const toPublicUser = (user: UserRow): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  createdAt: user.createdAt.toISOString(),
  hasCompletedOnboarding: Boolean(user.profile?.completedAt),
});

const signToken = (payload: JwtPayload): string => {
  const options: jwt.SignOptions = {
    // JWT_EXPIRES_IN is a free-form duration string ("7d", "12h"); the typings
    // want a narrower literal union, so widen it here in one place.
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign({ sub: payload.sub, email: payload.email }, env.JWT_SECRET, options);
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

export const register = async (input: RegisterInput): Promise<AuthResponse> => {
  const email = normalizeEmail(input.email);

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new ConflictError('An account with that email already exists.');
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email, name: input.name.trim(), passwordHash },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      profile: { select: { completedAt: true } },
    },
  });

  return {
    token: signToken({ sub: user.id, email: user.email }),
    user: toPublicUser(user),
  };
};

export interface LoginInput {
  email: string;
  password: string;
}

export const login = async (input: LoginInput): Promise<AuthResponse> => {
  const email = normalizeEmail(input.email);

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      createdAt: true,
      profile: { select: { completedAt: true } },
    },
  });

  // Compare against a dummy hash when the user is missing so response timing
  // does not reveal whether an email is registered.
  const hash = user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const passwordMatches = await bcrypt.compare(input.password, hash);

  if (!user || !passwordMatches) {
    throw new UnauthorizedError('Incorrect email or password.');
  }

  return {
    token: signToken({ sub: user.id, email: user.email }),
    user: toPublicUser(user),
  };
};

export const getCurrentUser = async (userId: string): Promise<PublicUser> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      profile: { select: { completedAt: true } },
    },
  });

  if (!user) throw new UnauthorizedError('Account no longer exists.');

  return toPublicUser(user);
};
