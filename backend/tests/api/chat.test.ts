import { afterEach, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { createService, futureOpenDateStr, signupAndLogin } from "../helpers/factories";
import type { BookingExtraction } from "../../src/services/ai.service";

const app = createApp();

// Stands in for Groq's chat-completions response shape - extractBookingInfo
// only ever reads choices[0].message.content, so that's all this needs.
function mockGroqResponse(extraction: Partial<BookingExtraction>) {
  const full: BookingExtraction = {
    intent: "unclear",
    service: null,
    date: null,
    time: null,
    isComplete: false,
    assistantReply: "...",
    ...extraction,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(full) } }] }),
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

async function startSession(agent: ReturnType<typeof request.agent>) {
  const res = await agent.post("/chat/sessions").expect(201);
  return res.body.session.id as string;
}

// Every test here proves the same architectural rule: the model only ever
// recognizes INTENT. The actual answer/action always comes from this
// controller reading or writing the real database - never from whatever
// text the (mocked) model returned. That's what these tests hold constant
// no matter how the model is mocked to respond.
describe("chat: check_appointments never trusts the model's own claim", () => {
  test("substitutes the real appointment list, ignoring the model's assistantReply", async () => {
    const service = await createService();
    const { agent } = await signupAndLogin(app);
    await agent
      .post("/appointments")
      .send({ serviceId: service.id, scheduledAt: `${futureOpenDateStr()}T09:00:00.000Z` })
      .expect(201);
    const sessionId = await startSession(agent);

    mockGroqResponse({
      intent: "check_appointments",
      assistantReply: "Could you give me your name or phone number to look that up?",
    });

    const res = await agent
      .post(`/chat/sessions/${sessionId}/messages`)
      .send({ content: "do I have any appointment?" })
      .expect(200);

    expect(res.body.assistantMessage.content).toContain(service.name);
    expect(res.body.assistantMessage.content).not.toMatch(/phone number/i);
  });

  test("says so honestly when there are none", async () => {
    const { agent } = await signupAndLogin(app);
    const sessionId = await startSession(agent);
    mockGroqResponse({ intent: "check_appointments" });

    const res = await agent
      .post(`/chat/sessions/${sessionId}/messages`)
      .send({ content: "any bookings for me?" })
      .expect(200);

    expect(res.body.assistantMessage.content).toMatch(/don't have any appointments/i);
  });
});

describe("chat: check_availability substitutes real slots", () => {
  test("lists the real open times for a real service+date", async () => {
    const service = await createService({ durationMinutes: 60 });
    const { agent } = await signupAndLogin(app);
    const sessionId = await startSession(agent);
    const date = futureOpenDateStr();

    mockGroqResponse({
      intent: "check_availability",
      service: service.name,
      date,
      assistantReply: "made up times the model should never get to say",
    });

    const res = await agent
      .post(`/chat/sessions/${sessionId}/messages`)
      .send({ content: `what's open for ${service.name} on ${date}?` })
      .expect(200);

    expect(res.body.assistantMessage.content).toContain("09:00");
    expect(res.body.assistantMessage.content).not.toMatch(/made up times/i);
  });

  test("a service name outside the real catalog is rejected, not booked against", async () => {
    const { agent } = await signupAndLogin(app);
    const sessionId = await startSession(agent);
    mockGroqResponse({
      intent: "check_availability",
      service: "Definitely Not A Real Service",
      date: futureOpenDateStr(),
    });

    const res = await agent
      .post(`/chat/sessions/${sessionId}/messages`)
      .send({ content: "what's open for made up service?" })
      .expect(200);

    expect(res.body.assistantMessage.content).toMatch(/don't have/i);
  });
});

describe("chat: book_appointment only confirms what actually happened", () => {
  test("a complete, available request books for real and confirms with real details", async () => {
    const service = await createService({ durationMinutes: 60 });
    const { agent } = await signupAndLogin(app);
    const sessionId = await startSession(agent);
    const date = futureOpenDateStr();

    mockGroqResponse({
      intent: "book_appointment",
      service: service.name,
      date,
      time: "09:00",
      isComplete: true,
      assistantReply: "Sure thing!",
    });

    const res = await agent
      .post(`/chat/sessions/${sessionId}/messages`)
      .send({ content: `book me ${service.name} on ${date} at 9am` })
      .expect(200);

    expect(res.body.appointment).not.toBeNull();
    expect(res.body.appointment.service.id).toBe(service.id);
    expect(res.body.assistantMessage.content).toContain(service.name);
    expect(res.body.needsForm).toBe(false);

    const list = await agent.get("/appointments").expect(200);
    expect(list.body.appointments).toHaveLength(1);
  });

  test("never claims success when the slot is actually taken - the exact bug this boundary exists to prevent", async () => {
    const service = await createService({ durationMinutes: 60 });
    const { agent: other } = await signupAndLogin(app);
    const { agent } = await signupAndLogin(app);
    const sessionId = await startSession(agent);
    const date = futureOpenDateStr();

    // Someone else already has this exact slot.
    await other
      .post("/appointments")
      .send({ serviceId: service.id, scheduledAt: `${date}T09:00:00.000Z` })
      .expect(201);

    mockGroqResponse({
      intent: "book_appointment",
      service: service.name,
      date,
      time: "09:00",
      isComplete: true,
      assistantReply: "Done! All booked.", // what the model WOULD have said - must not survive
    });

    const res = await agent
      .post(`/chat/sessions/${sessionId}/messages`)
      .send({ content: `book me ${service.name} on ${date} at 9am` })
      .expect(200);

    expect(res.body.appointment).toBeNull();
    expect(res.body.needsForm).toBe(true);
    expect(res.body.assistantMessage.content).not.toMatch(/^done!/i);
    expect(res.body.assistantMessage.content).toMatch(/couldn't book/i);

    const list = await agent.get("/appointments").expect(200);
    expect(list.body.appointments).toHaveLength(0);
  });

  test("an incomplete request (missing time) asks for it and needsForm is true, nothing is booked", async () => {
    const service = await createService();
    const { agent } = await signupAndLogin(app);
    const sessionId = await startSession(agent);

    mockGroqResponse({
      intent: "book_appointment",
      service: service.name,
      date: futureOpenDateStr(),
      time: null,
      isComplete: false,
      assistantReply: "What time works for you?",
    });

    const res = await agent
      .post(`/chat/sessions/${sessionId}/messages`)
      .send({ content: `I want to book ${service.name}` })
      .expect(200);

    expect(res.body.appointment).toBeNull();
    expect(res.body.needsForm).toBe(true);
  });
});

describe("chat: degrades gracefully when the model itself misbehaves", () => {
  test("malformed JSON from the model doesn't crash the request", async () => {
    const { agent } = await signupAndLogin(app);
    const sessionId = await startSession(agent);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "not valid json" } }] }),
      })
    );

    const res = await agent
      .post(`/chat/sessions/${sessionId}/messages`)
      .send({ content: "hello" })
      .expect(200);

    expect(res.body.assistantMessage.content.length).toBeGreaterThan(0);
    expect(res.body.appointment).toBeNull();
  });

  test("the upstream API being down surfaces as a clean error, not a hang or a 500 stack trace", async () => {
    const { agent } = await signupAndLogin(app);
    const sessionId = await startSession(agent);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, text: async () => "upstream down" })
    );

    const res = await agent.post(`/chat/sessions/${sessionId}/messages`).send({ content: "hello" });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("AI_UPSTREAM_ERROR");
  });
});
