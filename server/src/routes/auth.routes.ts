/**
 * POST /api/auth/register
 * POST /api/auth/login
 * GET  /api/auth/me
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../middleware/validate';
import { authenticate, requireUser } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import * as authService from '../services/auth.service';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be at most 72 characters.') // bcrypt truncates beyond 72 bytes.
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[0-9]/, 'Password must contain a number.');

const registerSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(255),
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const authRouter = Router();

authRouter.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body as z.infer<typeof registerSchema>);
    res.status(201).json(result);
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body as z.infer<typeof loginSchema>);
    res.status(200).json(result);
  }),
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = requireUser(req);
    res.status(200).json({ user: await authService.getCurrentUser(id) });
  }),
);
