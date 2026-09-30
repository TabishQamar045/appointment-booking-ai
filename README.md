# BookIt — Appointment Booking with an AI Chat Assistant

A take-home assessment prototype: a full-stack appointment-booking app where
users can book through a normal form *or* by chatting naturally with an AI
assistant that extracts the booking details (service, date, time) and books
it for them.

Built in ~24 hours, prioritizing a working, coherent end-to-end slice over
completeness. Assumptions and cut corners are called out explicitly below
and in code comments near the relevant decision.

## Architecture

```
┌─────────────────────┐         ┌──────────────────────┐        ┌─────────────┐
│   Next.js frontend   │ fetch   │   Express backend     │        │  Mistral AI  │
│  (App Router, TS,    │ ──────> │  (TS, REST API)        │ ─────> │  chat API    │
│   Tailwind, shadcn)  │ <────── │                        │ <───── │              │
│  localhost:3000       │  JSON   │  localhost:4100         │        └─────────────┘
└─────────┬────────────┘  + cookie└──────────┬─────────────┘
          │                                   │
          │ polls every 2.5s for              │ Prisma
          │ new chat messages                 ▼
          │                        ┌──────────────────────┐
          └───────────────────────>│   PostgreSQL          │
                                   │   users / appointments │
                                   │   chat_sessions/messages│
                                   └──────────────────────┘
