import { describe, expect, test } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { createService, futureOpenDateStr, loginAsAdmin, signupAndLogin } from "../helpers/factories";

const app = createApp();

describe("admin route authorization", () => {
  test("a logged-in customer gets 403, not the data", async () => {
    const { agent } = await signupAndLogin(app);
    await agent.get("/admin/appointments").expect(403);
    await agent.get("/admin/customers").expect(403);
    await agent.get("/admin/services").expect(403);
  });

  test("an anonymous request gets 401 before authorization is even checked", async () => {
    await request(app).get("/admin/appointments").expect(401);
  });

  test("an admin can reach every admin route", async () => {
    const admin = await loginAsAdmin(app);
    await admin.get("/admin/appointments").expect(200);
    await admin.get("/admin/customers").expect(200);
    await admin.get("/admin/services").expect(200);
  });
});

describe("POST /admin/services", () => {
  test("creating a service with a name already in use 409s cleanly, not a raw 500", async () => {
    const admin = await loginAsAdmin(app);
    const payload = {
      name: "Signature Facial",
      category: "skin",
      durationMinutes: 60,
      price: 80,
    };
    await admin.post("/admin/services").send(payload).expect(201);

    const res = await admin.post("/admin/services").send(payload).expect(409);
    expect(res.body.error.code).toBe("SERVICE_NAME_TAKEN");
  });
});

describe("admin booking on a customer's behalf", () => {
  test("POST /admin/appointments books for the given userId, not the admin", async () => {
    const service = await createService();
    const { agent: customer, email } = await signupAndLogin(app);
    const admin = await loginAsAdmin(app);

    const meRes = await customer.get("/auth/me").expect(200);
    const customerId = meRes.body.user.id;

    const res = await admin
      .post("/admin/appointments")
      .send({
        userId: customerId,
        serviceId: service.id,
        scheduledAt: `${futureOpenDateStr()}T09:00:00.000Z`,
      })
      .expect(201);

    expect(res.body.appointment.userId).toBe(customerId);
    expect(res.body.appointment.user.email).toBe(email);

    // And the customer sees it in their own list.
    const listRes = await customer.get("/appointments").expect(200);
    expect(listRes.body.appointments).toHaveLength(1);
  });

  test("404s for a userId that doesn't exist", async () => {
    const service = await createService();
    const admin = await loginAsAdmin(app);
    await admin
      .post("/admin/appointments")
      .send({
        userId: "00000000-0000-0000-0000-000000000000",
        serviceId: service.id,
        scheduledAt: `${futureOpenDateStr()}T09:00:00.000Z`,
      })
      .expect(404);
  });
});

describe("PATCH /admin/appointments/:id", () => {
  test("confirming flips status to confirmed", async () => {
    const service = await createService();
    const { agent: customer } = await signupAndLogin(app);
    const admin = await loginAsAdmin(app);
    const created = await customer
      .post("/appointments")
      .send({ serviceId: service.id, scheduledAt: `${futureOpenDateStr()}T09:00:00.000Z` });

    const res = await admin
      .patch(`/admin/appointments/${created.body.appointment.id}`)
      .send({ status: "confirmed" })
      .expect(200);

    expect(res.body.appointment.status).toBe("confirmed");
  });

  test("cancelling with a reason stores it, and reconfirming clears it", async () => {
    const service = await createService();
    const { agent: customer } = await signupAndLogin(app);
    const admin = await loginAsAdmin(app);
    const created = await customer
      .post("/appointments")
      .send({ serviceId: service.id, scheduledAt: `${futureOpenDateStr()}T09:00:00.000Z` });
    const id = created.body.appointment.id;

    const cancelled = await admin
      .patch(`/admin/appointments/${id}`)
      .send({ status: "cancelled", reason: "Stylist called in sick" })
      .expect(200);
    expect(cancelled.body.appointment.cancellationReason).toBe("Stylist called in sick");

    const reconfirmed = await admin.patch(`/admin/appointments/${id}`).send({ status: "confirmed" }).expect(200);
    expect(reconfirmed.body.appointment.cancellationReason).toBeNull();
  });

  test("rejects an invalid status", async () => {
    const service = await createService();
    const { agent: customer } = await signupAndLogin(app);
    const admin = await loginAsAdmin(app);
    const created = await customer
      .post("/appointments")
      .send({ serviceId: service.id, scheduledAt: `${futureOpenDateStr()}T09:00:00.000Z` });

    await admin
      .patch(`/admin/appointments/${created.body.appointment.id}`)
      .send({ status: "bogus" })
      .expect(400);
  });
});
