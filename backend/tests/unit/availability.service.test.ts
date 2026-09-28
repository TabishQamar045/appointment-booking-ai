import { describe, expect, test } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { getAvailableSlots, assertSlotAvailable } from "../../src/services/availability.service";
import { AppError } from "../../src/lib/AppError";
import { createService, futureOpenDateStr } from "../helpers/factories";

describe("getAvailableSlots", () => {
  test("returns 15-minute slots across the full business-hours window", async () => {
    const service = await createService({ durationMinutes: 60 });
    const date = futureOpenDateStr();

    const slots = await getAvailableSlots(service.id, date);

    expect(slots[0]).toBe("09:00");
    // Business hours close at 19:00 and the service is 60 minutes, so the
    // last bookable start is 18:00 - nothing later should leave enough room.
    expect(slots).toContain("18:00");
    expect(slots).not.toContain("18:15");
  });

  test("excludes times that would overlap an existing appointment", async () => {
    const service = await createService({ durationMinutes: 60 });
    const date = futureOpenDateStr();
    const otherCustomer = await prisma.user.create({
      data: { email: `taken-${Date.now()}@example.com`, name: "Someone Else", passwordHash: "x" },
    });
    await prisma.appointment.create({
      data: {
        userId: otherCustomer.id,
        serviceId: service.id,
        scheduledAt: new Date(`${date}T10:00:00.000Z`),
        status: "pending",
      },
    });

    const slots = await getAvailableSlots(service.id, date);

    // A 60-minute booking at 10:00 occupies 10:00-11:00; anything that would
    // overlap that window must be gone, anything outside it must remain.
    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("10:30");
    expect(slots).not.toContain("09:30"); // would run 09:30-10:30, overlaps
    expect(slots).toContain("09:00");
    expect(slots).toContain("11:00");
  });

  test("a cancelled appointment does not block its old slot", async () => {
    const service = await createService({ durationMinutes: 30 });
    const date = futureOpenDateStr();
    const customer = await prisma.user.create({
      data: { email: `cancelled-${Date.now()}@example.com`, name: "Cancelled Customer", passwordHash: "x" },
    });
    await prisma.appointment.create({
      data: {
        userId: customer.id,
        serviceId: service.id,
        scheduledAt: new Date(`${date}T09:00:00.000Z`),
        status: "cancelled",
      },
    });

    const slots = await getAvailableSlots(service.id, date);
    expect(slots).toContain("09:00");
  });

  test("returns no slots on a day the salon is closed", async () => {
    const service = await createService();
    const closedDay = await prisma.businessHours.findFirst({ where: { isClosed: true } });
    if (!closedDay) throw new Error("expected resetDb() to seed a closed day");

    // Find the next date that actually falls on the closed weekday.
    const d = new Date();
    while (d.getUTCDay() !== closedDay.dayOfWeek) d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCDate(d.getUTCDate() + 7); // push into the future, not today
    const dateStr = d.toISOString().slice(0, 10);

    const slots = await getAvailableSlots(service.id, dateStr);
    expect(slots).toEqual([]);
  });

  test("throws for an inactive service, same as a missing one", async () => {
    const service = await createService({ isActive: false });
    await expect(getAvailableSlots(service.id, futureOpenDateStr())).rejects.toBeInstanceOf(
      AppError
    );
  });
});

describe("assertSlotAvailable", () => {
  test("resolves for an open slot and throws a 409 for a taken one", async () => {
    const service = await createService({ durationMinutes: 60 });
    const date = futureOpenDateStr();
    const scheduledAt = new Date(`${date}T09:00:00.000Z`);

    await expect(assertSlotAvailable(service.id, scheduledAt)).resolves.toBeUndefined();

    const customer = await prisma.user.create({
      data: { email: `booked-${Date.now()}@example.com`, name: "Booked Customer", passwordHash: "x" },
    });
    await prisma.appointment.create({
      data: { userId: customer.id, serviceId: service.id, scheduledAt, status: "pending" },
    });

    await expect(assertSlotAvailable(service.id, scheduledAt)).rejects.toMatchObject({
      statusCode: 409,
      code: "SLOT_UNAVAILABLE",
    });
  });
});
