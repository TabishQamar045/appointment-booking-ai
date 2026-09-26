"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { BookingForm } from "@/components/appointments/booking-form";
import { api, ApiError } from "@/lib/api";
import type { Appointment, BookingExtractionSummary, ChatMessage } from "@/lib/types";

const POLL_INTERVAL_MS = 2500;

interface ChatWindowProps {
  sessionId: string;
  onAppointmentCreated: (appointment: Appointment) => void;
}

// Polling-based chat, per the assessment's transport requirement (no
// WebSockets). Every POST already returns the assistant's reply
// synchronously in this implementation, but we still poll GET
// /messages on an interval and treat it as the source of truth - that
// keeps this component correct even if message generation ever became
// asynchronous (e.g. queued), and covers multi-tab usage.
export function ChatWindow({ sessionId, onAppointmentCreated }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingForm, setPendingForm] = useState<BookingExtractionSummary | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      // Don't let a poll tick overwrite state while a send is in flight -
      // the POST response is the freshest data at that moment.
      if (isSendingRef.current) return;
      try {
        const res = await api.get<{ messages: ChatMessage[] }>(
          `/chat/sessions/${sessionId}/messages`
        );
        if (!cancelled) setMessages(res.messages);
      } catch {
        // Silent - a single failed poll tick isn't worth surfacing to the
        // user, it'll just retry in POLL_INTERVAL_MS.
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;

    setError(null);
    setInput("");
    setIsSending(true);
    isSendingRef.current = true;
    setPendingForm(null);

    try {
      const res = await api.post<{
        userMessage: ChatMessage;
        assistantMessage: ChatMessage;
        needsForm: boolean;
        extraction: BookingExtractionSummary;
        appointment: Appointment | null;
      }>(`/chat/sessions/${sessionId}/messages`, { content });

      setMessages((prev) => [...prev, res.userMessage, res.assistantMessage]);

      if (res.needsForm) {
        setPendingForm(res.extraction);
      }
      if (res.appointment) {
        onAppointmentCreated(res.appointment);
        toast.success("Appointment booked via chat");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send message.");
      setInput(content); // give the user their text back so nothing is lost
    } finally {
      setIsSending(false);
      isSendingRef.current = false;
    }
  }

  return (
    <div className="flex h-[70vh] flex-col overflow-hidden rounded-lg border bg-background">
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-3">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Say something like &ldquo;Book me a haircut next Tuesday at 2pm&rdquo; to get
              started.
            </p>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-2 text-sm text-muted-foreground">
                Thinking...
              </div>
            </div>
          )}
          <div ref={scrollAnchorRef} />
        </div>
      </ScrollArea>

      {pendingForm && (
        <div className="border-t p-4">
          <BookingForm
            title="Let's finish booking"
            description="The assistant needs a bit more info - confirm or adjust below."
            initialServiceName={pendingForm.service}
            initialDate={pendingForm.date}
            initialTime={pendingForm.time}
            onCreated={(appointment) => {
              onAppointmentCreated(appointment);
              setPendingForm(null);
              toast.success("Appointment booked");
            }}
            onCancel={() => setPendingForm(null)}
          />
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isSending}
        />
        <Button type="submit" disabled={isSending || !input.trim()}>
          Send
        </Button>
      </form>
      {error && <p className="px-3 pb-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
