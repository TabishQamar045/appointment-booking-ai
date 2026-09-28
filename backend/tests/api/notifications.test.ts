import { describe, expect, test } from "vitest";
import { createApp } from "../../src/app";
import { createService, futureOpenDateStr, loginAsAdmin, signupAndLogin } from "../helpers/factories";

const app = createApp();

describe("booking creates an admin notification", () => {
  test("a customer's booking notifies the admin, not the other way around", async () => {
    const service = await createService();
    const { agent: customer, name } = await signupAndLogin(app);
    const admin = await loginAsAdmin(app);

    await customer
      .post("/appointments")
      .send({ serviceId: service.id, scheduledAt: `${futureOpenDateStr()}T09:00:00.000Z` })
      .expect(201);

    const adminNotifs = await admin.get("/notifications").expect(200);
    expect(adminNotifs.body.unreadCount).toBe(1);
    expect(adminNotifs.body.notifications[0].type).toBe("booking_requested");
    expect(adminNotifs.body.notifications[0].message).toContain(name);
    expect(adminNotifs.body.notifications[0].message).toContain(service.name);

    // The customer who booked it doesn't get a notification about their
    // own action - only admins do.
    const customerNotifs = await customer.get("/notifications").expect(200);
    expect(customerNotifs.body.unreadCount).toBe(0);
  });

  test("an admin booking on a customer's behalf does NOT notify admins (they already know)", async () => {
    const service = await createService();
    const { agent: customer } = await signupAndLogin(app);
    const admin = await loginAsAdmin(app);
    const meRes = await customer.get("/auth/me");

    await admin
      .post("/admin/appointments")
      .send({
        userId: meRes.body.user.id,
        serviceId: service.id,
        scheduledAt: `${futureOpenDateStr()}T09:00:00.000Z`,
      })
      .expect(201);

    const adminNotifs = await admin.get("/notifications").expect(200);
    expect(adminNotifs.body.unreadCount).toBe(0);
  });
});

describe("status changes notify the customer", () => {
  test("cancelling with a reason puts that reason in the customer's notification", async () => {
    const service = await createService();
    const { agent: customer } = await signupAndLogin(app);
    const admin = await loginAsAdmin(app);
    const created = await customer
      .post("/appointments")
      .send({ serviceId: service.id, scheduledAt: `${futureOpenDateStr()}T09:00:00.000Z` });

    await admin
      .patch(`/admin/appointments/${created.body.appointment.id}`)
      .send({ status: "cancelled", reason: "Stylist called in sick" })
      .expect(200);

    const res = await customer.get("/notifications").expect(200);
    expect(res.body.unreadCount).toBe(1);
    expect(res.body.notifications[0].type).toBe("booking_cancelled");
    expect(res.body.notifications[0].message).toContain("Stylist called in sick");
  });

  test("confirming notifies the customer too, without a reason", async () => {
    const service = await createService();
    const { agent: customer } = await signupAndLogin(app);
    const admin = await loginAsAdmin(app);
    const created = await customer
      .post("/appointments")
      .send({ serviceId: service.id, scheduledAt: `${futureOpenDateStr()}T09:00:00.000Z` });

    await admin
      .patch(`/admin/appointments/${created.body.appointment.id}`)
      .send({ status: "confirmed" })
      .expect(200);

    const res = await customer.get("/notifications").expect(200);
    expect(res.body.notifications[0].type).toBe("booking_confirmed");
  });
});

describe("read state", () => {
  test("marking one notification read only affects that one", async () => {
    const service = await createService();
    const { agent: customerA } = await signupAndLogin(app);
    const { agent: customerB } = await signupAndLogin(app);
    const admin = await loginAsAdmin(app);

    await customerA
      .post("/appointments")
      .send({ serviceId: service.id, scheduledAt: `${futureOpenDateStr()}T09:00:00.000Z` });
    await customerB
      .post("/appointments")
      .send({ serviceId: service.id, scheduledAt: `${futureOpenDateStr()}T10:00:00.000Z` });

    const before = await admin.get("/notifications").expect(200);
    expect(before.body.unreadCount).toBe(2);

    await admin.post(`/notifications/${before.body.notifications[0].id}/read`).expect(204);

    const after = await admin.get("/notifications").expect(200);
    expect(after.body.unreadCount).toBe(1);
  });

  test("a user can't mark another user's notification as read", async () => {
    const service = await createService();
    const { agent: customer } = await signupAndLogin(app);
    const admin = await loginAsAdmin(app);
    await customer
      .post("/appointments")
      .send({ serviceId: service.id, scheduledAt: `${futureOpenDateStr()}T09:00:00.000Z` });

    const adminNotifs = await admin.get("/notifications").expect(200);
    const adminNotifId = adminNotifs.body.notifications[0].id;

    // Customer tries to mark the admin's notification as read via its id -
    // should silently no-op (scoped by userId in the UPDATE), not error.
    await customer.post(`/notifications/${adminNotifId}/read`).expect(204);

    const stillUnread = await admin.get("/notifications").expect(200);
    expect(stillUnread.body.unreadCount).toBe(1);
  });

  test("mark-all-read clears every unread notification for that user", async () => {
    const service = await createService();
    const { agent: customer } = await signupAndLogin(app);
    const admin = await loginAsAdmin(app);
    await customer
      .post("/appointments")
      .send({ serviceId: service.id, scheduledAt: `${futureOpenDateStr()}T09:00:00.000Z` });
    await customer
      .post("/appointments")
      .send({ serviceId: service.id, scheduledAt: `${futureOpenDateStr()}T11:00:00.000Z` });

    await admin.post("/notifications/read-all").expect(204);

    const res = await admin.get("/notifications").expect(200);
    expect(res.body.unreadCount).toBe(0);
  });
});
