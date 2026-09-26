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
  if (!user) {
    // Same message for "no such user" and "wrong password" - don't leak
    // which one it was.
    throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  return toPublicUser(user);
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
