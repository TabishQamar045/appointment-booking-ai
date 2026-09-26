import { env } from "../config/env";
import { AppError } from "../lib/AppError";

const MISTRAL_CHAT_URL = "https://api.mistral.ai/v1/chat/completions";

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

// The one contract this whole feature is built around: the AI never
// decides app behavior, it only ever returns this shape, and
// chat.controller.ts is the sole place that acts on it (see isComplete
// handling there). Keeping that decision out of this module is what the
// assessment brief calls out explicitly.
export interface BookingExtraction {
  intent: "book_appointment" | "cancel_appointment" | "general_inquiry" | "unclear";
  service: string | null;
  date: string | null; // ISO date, e.g. "2026-10-05"
  time: string | null; // 24h "HH:mm", e.g. "14:30"
  isComplete: boolean;
  assistantReply: string;
}

function buildSystemPrompt(serviceNames: string[]): string {
  return `You are a booking assistant for Glow Studio, a hair and beauty salon.

Your only job is to read the conversation and extract structured booking intent from it. You do not book anything yourself - you only extract information and draft a short, friendly reply.

Valid services (the "service" field must be one of these exactly, or null): ${serviceNames.join(", ")}.

Today's date is ${new Date().toISOString().slice(0, 10)}. Resolve relative dates ("tomorrow", "next Monday") into an absolute ISO date (YYYY-MM-DD) using this.

Always respond with ONLY a JSON object matching exactly this shape, no prose outside the JSON:
{
  "intent": "book_appointment" | "cancel_appointment" | "general_inquiry" | "unclear",
  "service": string | null,
  "date": string | null,
  "time": string | null,
  "isComplete": boolean,
  "assistantReply": string
}

Rules:
- "isComplete" is true only when intent is "book_appointment" AND service, date, and time are all known and unambiguous.
- If information is missing, set isComplete to false and use "assistantReply" to ask a short, specific question for exactly what's missing.
- "assistantReply" is what gets shown to the user in the chat - keep it conversational and brief (1-3 sentences).
- Never invent a date, time, or service that the user didn't state or clearly imply.`;
}

interface MistralResponse {
  choices: Array<{ message: { content: string } }>;
}

export async function extractBookingInfo(
  history: ChatHistoryMessage[],
  latestUserMessage: string,
  serviceNames: string[]
): Promise<BookingExtraction> {
  if (!env.mistralApiKey) {
    throw AppError.badRequest(
      "AI assistant is not configured (missing MISTRAL_API_KEY on the server)",
      "AI_NOT_CONFIGURED"
    );
  }

  const messages = [
    { role: "system" as const, content: buildSystemPrompt(serviceNames) },
    ...history.slice(-10),
    { role: "user" as const, content: latestUserMessage },
  ];

  console.log("[ai] request", { model: env.mistralModel, messageCount: messages.length });

  const response = await fetch(MISTRAL_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.mistralApiKey}`,
    },
    body: JSON.stringify({
      model: env.mistralModel,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error("[ai] mistral error", response.status, errorBody);
    throw new AppError("The AI assistant is temporarily unavailable", 502, "AI_UPSTREAM_ERROR");
  }

  const data = (await response.json()) as MistralResponse;
  const raw = data.choices?.[0]?.message?.content ?? "{}";

  console.log("[ai] response", raw);

  return parseExtraction(raw);
}

function parseExtraction(raw: string): BookingExtraction {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("[ai] failed to parse model output as JSON", err, raw);
    return fallbackExtraction("Sorry, I had trouble understanding that. Could you rephrase?");
  }

  if (typeof parsed !== "object" || parsed === null) {
    return fallbackExtraction("Sorry, I had trouble understanding that. Could you rephrase?");
  }

  const p = parsed as Record<string, unknown>;
  const intent = (["book_appointment", "cancel_appointment", "general_inquiry", "unclear"] as const).includes(
    p.intent as BookingExtraction["intent"]
  )
    ? (p.intent as BookingExtraction["intent"])
    : "unclear";

  return {
    intent,
    service: typeof p.service === "string" ? p.service : null,
    date: typeof p.date === "string" ? p.date : null,
    time: typeof p.time === "string" ? p.time : null,
    isComplete: Boolean(p.isComplete),
    assistantReply:
      typeof p.assistantReply === "string" && p.assistantReply.trim().length > 0
        ? p.assistantReply
        : "Got it - could you tell me a bit more about what you'd like to book?",
  };
}

function fallbackExtraction(assistantReply: string): BookingExtraction {
  return {
    intent: "unclear",
    service: null,
    date: null,
    time: null,
    isComplete: false,
    assistantReply,
  };
}
