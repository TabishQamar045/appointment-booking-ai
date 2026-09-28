import { describe, expect, test } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import bcrypt from "bcrypt";

const app = createApp();

describe("POST /auth/signup", () => {
  test("creates a customer account and sets an auth cookie", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "new@example.com", password: "password123", name: "New User" })
      .expect(201);

    expect(res.body.user.email).toBe("new@example.com");
    expect(res.body.user.role).toBe("customer");
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers["set-cookie"]?.[0]).toMatch(/auth_token=/);
  });

  test("rejects a duplicate email", async () => {
    await request(app)
      .post("/auth/signup")
      .send({ email: "dupe@example.com", password: "password123", name: "First" })
      .expect(201);

    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "dupe@example.com", password: "password123", name: "Second" })
      .expect(409);

    expect(res.body.error.code).toBeTruthy();
  });

  test("rejects a short password before it ever reaches the DB", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "short@example.com", password: "short", name: "Short" })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    const stillExists = await prisma.user.findUnique({ where: { email: "short@example.com" } });
    expect(stillExists).toBeNull();
  });
});

describe("POST /auth/login", () => {
  test("logs in with correct credentials", async () => {
    await request(app)
      .post("/auth/signup")
      .send({ email: "login@example.com", password: "password123", name: "Login Test" });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login@example.com", password: "password123" })
      .expect(200);

    expect(res.body.user.email).toBe("login@example.com");
  });

  test("rejects a wrong password with a generic message", async () => {
    await request(app)
      .post("/auth/signup")
      .send({ email: "wrongpw@example.com", password: "password123", name: "Wrong PW" });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "wrongpw@example.com", password: "not-the-password" })
      .expect(401);

    expect(res.body.error.message).toMatch(/invalid email or password/i);
  });

  test("rejects an unknown email with the SAME generic message (no user enumeration)", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "does-not-exist@example.com", password: "whatever123" })
      .expect(401);

    expect(res.body.error.message).toMatch(/invalid email or password/i);
  });

  // An OAuth-only account has passwordHash: null - login() has to guard
  // that explicitly, or bcrypt.compare(password, null) would throw a raw
  // 500 instead of the same clean "invalid credentials" response.
  test("rejects a password-login attempt on a Google-only account, same generic message", async () => {
    await prisma.user.create({
      data: {
        email: "oauth-only@example.com",
        name: "OAuth Only",
        provider: "google",
        providerId: "google-123",
        passwordHash: null,
      },
    });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "oauth-only@example.com", password: "anything123" })
      .expect(401);

    expect(res.body.error.message).toMatch(/invalid email or password/i);
  });
});

describe("GET /auth/me", () => {
  test("401s with no cookie", async () => {
    await request(app).get("/auth/me").expect(401);
  });

  test("returns the current user for a valid session", async () => {
    const agent = request.agent(app);
    await agent
      .post("/auth/signup")
      .send({ email: "me@example.com", password: "password123", name: "Me" });

    const res = await agent.get("/auth/me").expect(200);
    expect(res.body.user.email).toBe("me@example.com");
  });
});

describe("POST /auth/logout", () => {
  test("clears the cookie so a subsequent /auth/me 401s", async () => {
    const agent = request.agent(app);
    await agent
      .post("/auth/signup")
      .send({ email: "logout@example.com", password: "password123", name: "Logout" });
    await agent.get("/auth/me").expect(200);

    await agent.post("/auth/logout").expect(200);

    await agent.get("/auth/me").expect(401);
  });
});

// Sanity check on the seed-admin-account migration's actual bcrypt hash -
// not just that /auth/login works in the abstract, but that the specific
// credential the README hands out actually authenticates.
describe("the migrated-in admin account's hash", () => {
  test("password123 matches the hash baked into the migration", async () => {
    const hash = "$2b$10$ibcUubjvnwuTFN.e8HKVE.Xu3JUcZCFHhTXYGt2v0TihZ86S8Hb7S";
    await expect(bcrypt.compare("password123", hash)).resolves.toBe(true);
  });
});
