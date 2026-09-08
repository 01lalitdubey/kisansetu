import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { ApiError } from '../utils/response';
import type { AuthUser } from '../types';

const SALT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

/** Build the JWT payload for a user, resolving the role-specific profile id. */
export async function toAuthUser(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { farmer: true, officer: true, admin: true },
  });
  if (!user) throw ApiError.notFound('User not found');

  const base: AuthUser = { userId: user.id, role: user.role, name: user.name };
  if (user.farmer) base.profileId = user.farmer.id;
  if (user.officer) {
    base.profileId = user.officer.id;
    base.centerId = user.officer.centerId;
  }
  if (user.admin) base.profileId = user.admin.id;
  return base;
}

export interface LoginResult {
  token: string;
  user: {
    id: string;
    name: string;
    role: Role;
    language: string;
    mobile: string;
    email: string | null;
    profileId?: string;
    centerId?: string;
  };
}

export async function login(identifier: string, password: string): Promise<LoginResult> {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier.toLowerCase() }, { mobile: identifier }] },
  });
  if (!user) throw ApiError.unauthorized('Invalid credentials');
  if (!user.passwordHash) {
    // Supabase-managed identity — must sign in through Supabase Auth
    throw ApiError.unauthorized('This account uses Supabase sign-in');
  }

  const good = await verifyPassword(password, user.passwordHash);
  if (!good) throw ApiError.unauthorized('Invalid credentials');

  const authUser = await toAuthUser(user.id);
  return {
    token: signToken(authUser),
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      language: user.language,
      mobile: user.mobile,
      email: user.email,
      profileId: authUser.profileId,
      centerId: authUser.centerId,
    },
  };
}

export interface RegisterInput {
  name: string;
  mobile: string;
  email?: string;
  password: string;
  language?: string;
  village: string;
  location: string;
  primaryCropId?: string;
  approxQuantity?: number;
}

/** Self-service farmer signup (used by the onboarding screen if wired). */
export async function registerFarmer(input: RegisterInput): Promise<LoginResult> {
  const exists = await prisma.user.findFirst({
    where: { OR: [{ mobile: input.mobile }, ...(input.email ? [{ email: input.email.toLowerCase() }] : [])] },
  });
  if (exists) throw ApiError.conflict('An account with this mobile or email already exists');

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      mobile: input.mobile,
      email: input.email?.toLowerCase() ?? null,
      passwordHash,
      role: 'FARMER',
      language: input.language ?? 'en',
      farmer: {
        create: {
          village: input.village,
          location: input.location,
          preferredLanguage: input.language ?? 'en',
          primaryCropId: input.primaryCropId ?? null,
          approxQuantity: input.approxQuantity ?? 0,
        },
      },
    },
  });

  const authUser = await toAuthUser(user.id);
  return {
    token: signToken(authUser),
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      language: user.language,
      mobile: user.mobile,
      email: user.email,
      profileId: authUser.profileId,
      centerId: authUser.centerId,
    },
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      farmer: { include: { primaryCrop: true } },
      officer: { include: { center: true } },
      admin: true,
    },
  });
  if (!user) throw ApiError.notFound('User not found');
  const { passwordHash, ...safe } = user;
  void passwordHash;
  return safe;
}
