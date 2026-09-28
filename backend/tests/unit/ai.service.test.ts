import { describe, expect, test } from "vitest";
import { parseExtraction } from "../../src/services/ai.service";

// parseExtraction is the boundary between "whatever the LLM felt like
// returning" and the strongly-typed BookingExtraction the rest of the app
// trusts. It's a pure function (string in, object out) - no network, no DB -
// which is exactly why it's worth pinning down with real edge cases instead
// of only ever exercising it through a live model call.
describe("parseExtraction", () => {
  test("parses a well-formed model response", () => {
    const result = parseExtraction(
      JSON.stringify({
        intent: "book_appointment",
        service: "Haircuts and Styling",
        date: "2026-10-05",
        time: "14:30",
        isComplete: true,
        assistantReply: "Booking that now.",
      })
    );
    expect(result).toEqual({
      intent: "book_appointment",
      service: "Haircuts and Styling",
      date: "2026-10-05",
      time: "14:30",
      isComplete: true,
      assistantReply: "Booking that now.",
    });
  });

  test("falls back to 'unclear' on unparseable JSON", () => {
    const result = parseExtraction("not json at all");
    expect(result.intent).toBe("unclear");
    expect(result.isComplete).toBe(false);
    expect(result.assistantReply.length).toBeGreaterThan(0);
  });

  test("falls back to 'unclear' when the top-level value isn't an object", () => {
    const result = parseExtraction("42");
    expect(result.intent).toBe("unclear");
  });

  test("rejects an intent outside the known set instead of trusting it", () => {
    const result = parseExtraction(JSON.stringify({ intent: "do_something_weird" }));
    expect(result.intent).toBe("unclear");
  });

  test("recognizes check_appointments and check_availability as valid intents", () => {
    expect(parseExtraction(JSON.stringify({ intent: "check_appointments" })).intent).toBe(
      "check_appointments"
    );
    expect(parseExtraction(JSON.stringify({ intent: "check_availability" })).intent).toBe(
      "check_availability"
    );
  });

  test("coerces non-string service/date/time fields to null rather than throwing", () => {
    const result = parseExtraction(
      JSON.stringify({ intent: "book_appointment", service: 123, date: true, time: {} })
    );
    expect(result.service).toBeNull();
    expect(result.date).toBeNull();
    expect(result.time).toBeNull();
  });

  test("falls back to a default assistantReply when the model leaves it blank", () => {
    const result = parseExtraction(JSON.stringify({ intent: "unclear", assistantReply: "   " }));
    expect(result.assistantReply.trim().length).toBeGreaterThan(0);
  });

  test("isComplete is coerced to a real boolean", () => {
    expect(parseExtraction(JSON.stringify({ isComplete: "true" })).isComplete).toBe(true);
    expect(parseExtraction(JSON.stringify({ isComplete: 0 })).isComplete).toBe(false);
  });
});
