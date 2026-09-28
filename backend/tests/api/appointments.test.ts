import { describe, expect, test } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { createService, futureOpenDateStr, signupAndLogin } from "../helpers/factories";

const app = createApp();

describe("POST /appointments", () => {
  test("books an open slot", async () => {
    const service = await createService({ durationMinutes: 60 });
    const { agent } = await signupAndLogin(app);
    const scheduledAt = `${futureOpenDateStr()}T09:00:00.000Z`;

    const res = await agent.post("/appointments").send({ serviceId: service.id, scheduledAt }).expect(201);

    expect(res.body.appointment.status).toBe("pending");
    expect(res.body.appointment.service.id).toBe(service.id);
  });

  test("409s on a slot that's already taken, doesn't 500", async () => {
    const service = await createService({ durationMinutes: 60 });
    const { agent: first } = await signupAndLogin(app);
    const { agent: second } = await signupAndLogin(app);
    const scheduledAt = `${futureOpenDateStr()}T09:00:00.000Z`;

    await first.post("/appointments").send({ serviceId: service.id, scheduledAt }).expect(201);
    const res = await second
      .post("/appointments")
      .send({ serviceId: service.id, scheduledAt })
      .expect(409);

    expect(res.body.error.code).toBe("SLOT_UNAVAILABLE");
  });

  test("404s for a service that doesn't exist", async () => {
    const { agent } = await signupAndLogin(app);
    await agent
      .post("/appointments")
      .send({ serviceId: "00000000-0000-0000-0000-000000000000", scheduledAt: `${futureOpenDateStr()}T09:00:00.000Z` })
      .expect(404);
  });

  test("404s for an inactive service - can't book something no longer offered", async () => {
    const service = await createService({ isActive: false });
    const { agent } = await signupAndLogin(app);
    await agent
      .post("/appointments")
      .send({ serviceId: service.id, scheduledAt: `${futureOpenDateStr()}T09:00:00.000Z` })
      .expect(404);
  });

  test("401s with no session", async () => {
    const service = await createService();
    const res = await request(app)
      .post("/appointments")
      .send({ serviceId: service.id, scheduledAt: `${futureOpenDateStr()}T09:00:00.000Z` });
    expect(res.status).toBe(401);
  });
});

describe("GET /appointments", () => {
  test("only ever returns the caller's own appointments", async () => {
    const service = await createService();
    const { agent: alice } = await signupAndLogin(app);
    const { agent: bob } = await signupAndLogin(app);

    await alice
      .post("/appointments")
      .send({ serviceId: service.id, scheduledAt: `${futureOpenDateStr()}T09:00:00.000Z` })
      .expect(201);
    await bob
      .post("/appointments")
      .send({ serviceId: service.id, scheduledAt: `${futureOpenDateStr()}T10:00:00.000Z` })
      .expect(201);

    const aliceRes = await alice.get("/appointments").expect(200);
    expect(aliceRes.body.appointments).toHaveLength(1);

    const bobRes = await bob.get("/appointments").expect(200);
    expect(bobRes.body.appointments).toHaveLength(1);
    expect(bobRes.body.appointments[0].id).not.toBe(aliceRes.body.appointments[0].id);
  });
});
