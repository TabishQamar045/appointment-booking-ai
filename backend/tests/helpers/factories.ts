import bcrypt from "bcrypt";
import request from "supertest";
import type { Express } from "express";
import { prisma } from "../../src/lib/prisma";
import type { ServiceCategory } from "@prisma/client";

export async function createService(overrides: Partial<{
  name: string;
  category: ServiceCategory;
  durationMinutes: number;
  price: number;
  isActive: boolean;
}> = {}) {
  return prisma.service.create({
    data: {
      name: overrides.name ?? `Test Service ${Date.now()}-${Math.random().toString(36).slice(2)}`,
      category: overrides.category ?? "hair",
      durationMinutes: overrides.durationMinutes ?? 60,
      price: overrides.price ?? 50,
      isActive: overrides.isActive ?? true,
    },
  });
}

// Drives the real signup endpoint (not a direct prisma.user.create) so the
// returned supertest agent carries a genuine auth cookie, the same way a
// real browser would get one - these are integration tests of the whole
// request pipeline, not just the DB layer.
export async function signupAndLogin(app: Express) {
  const agent = request.agent(app);
  const email = `customer-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = "password123";
  const name = "Test Customer";
  await agent.post("/auth/signup").send({ email, password, name }).expect(201);
  return { agent, email, password, name };
}

export async function loginAsAdmin(app: Express) {
  const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2)}@glowstudio.com`;
  const password = "password123";
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, passwordHash, name: "Test Admin", role: "admin" },
  });
  const agent = request.agent(app);
  await agent.post("/auth/login").send({ email, password }).expect(200);
  return agent;
}

// A date guaranteed to fall Mon-Sat, i.e. inside the business hours
// resetDb() seeds every test with - avoids every test file re-deriving
// "some weekday" by hand.
export function futureOpenDateStr(daysAhead = 7): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  while (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
