"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChatWindow } from "@/components/chat/chat-window";
import { api, ApiError } from "@/lib/api";
import type { ChatSession } from "@/lib/types";

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      try {
        // Reuse the most recent session if one exists, so refreshing the
        // page doesn't lose chat history; otherwise start a fresh one.
        const { sessions } = await api.get<{ sessions: ChatSession[] }>("/chat/sessions");
        if (cancelled) return;

        if (sessions.length > 0) {
          setSessionId(sessions[0].id);
        } else {
          const { session } = await api.post<{ session: ChatSession }>("/chat/sessions");
          if (!cancelled) setSessionId(session.id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not start a chat session.");
        }
      }
    }

    bootstrapSession();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Chat assistant</h1>
        <p className="text-sm text-muted-foreground">
          Tell it what you&apos;d like to book - it will ask for anything it&apos;s missing.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {sessionId && (
        <ChatWindow
          sessionId={sessionId}
          onAppointmentCreated={() => toast.info("Check the Appointments tab to see it")}
        />
      )}
      {!sessionId && !error && (
        <p className="text-sm text-muted-foreground">Starting chat session...</p>
      )}
    </div>
  );
}
