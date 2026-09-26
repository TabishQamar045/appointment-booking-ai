import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/AppError";
import { env } from "../config/env";
import type { SignupInput, LoginInput } from "../schemas/auth.schema";

const BCRYPT_ROUNDS = 10;

export async function signup(input: SignupInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw AppError.conflict("An account with this email already exists", "EMAIL_TAKEN");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { email: input.email, passwordHash, name: input.name },
  });

  return toPublicUser(user);
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Same message whether there's no such user, the account is Google-only
  // (no passwordHash to compare against), or the password is wrong - don't
  // leak which one it was.
  if (!user || !user.passwordHash) {
    throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  return toPublicUser(user);
}

// Google's email comes back pre-verified by Google itself, so we trust it
// enough to link-or-create by email - the same email logging in via Google
// today and via password tomorrow lands on the same account. If a Google
// account by this email doesn't exist yet, one is created with no password
// (see login()'s !user.passwordHash guard for what that means for them).
export async function findOrCreateGoogleUser(profile: {
  googleId: string;
  email: string;
  name: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: profile.email } });
  if (existing) {
    return toPublicUser(existing);
  }

  const created = await prisma.user.create({
    data: {
      email: profile.email,
      name: profile.name,
      provider: "google",
      providerId: profile.googleId,
    },
  });
  return toPublicUser(created);
}

export function issueToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw AppError.unauthorized("User no longer exists");
  }
  return toPublicUser(user);
}

function toPublicUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
}) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt };
}
