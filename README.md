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
```

- **Frontend and backend are separate deployable apps** (`/frontend`,
  `/backend`), talking only over HTTP. The frontend never calls Mistral
  directly — only the backend's `ai.service.ts` does.
- **Auth**: JWT signed by the backend, stored in an `httpOnly` cookie
  (`auth_token`). The frontend never reads the token itself — it just
  sends the cookie along with every request (`credentials: "include"`)
  and reacts to 401s.
- **Chat transport is polling**, not WebSockets (see [Design
  decisions](#design-decisions--tradeoffs)).
- **The AI never touches the database.** `ai.service.ts` takes message
  history in, returns a structured JSON extraction out. `chat.controller.ts`
  is the only place that decides what that extraction *means* for the app
  (save a message, auto-book an appointment, or tell the frontend to render
  a fallback form).

## Project structure

```
interview_proj/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # users, appointments, chat_sessions, chat_messages
│   │   └── seed.ts             # 2 users, 3 sample appointments
│   └── src/
│       ├── config/env.ts
│       ├── middleware/         # auth, validate(zod), rateLimiter, requestLogger, errorHandler
│       ├── schemas/            # zod request schemas
│       ├── services/           # auth, appointments, chat, ai (the isolated AI module)
│       ├── controllers/
│       ├── routes/
│       ├── app.ts / index.ts
└── frontend/
    └── src/
        ├── app/
        │   ├── login/, signup/
        │   └── dashboard/
        │       ├── page.tsx        # appointments list + manual booking form
        │       └── chat/page.tsx   # AI chat
        ├── components/
        │   ├── auth/, appointments/, chat/
        │   └── ui/              # shadcn/ui primitives
        ├── contexts/auth-context.tsx
        ├── lib/api.ts           # fetch wrapper (credentials: include, typed errors)
        └── proxy.ts             # route protection (Next.js 16's renamed "middleware")
```

## Local setup

### Prerequisites

- Node.js 20.9+ (required by Next.js 16)
- A running PostgreSQL instance
- A [Mistral API key](https://console.mistral.ai/) (only needed to test the
  chat assistant — everything else works without it)

### 1. Database

Create a database, e.g.:

```bash
createdb appointment_booking
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# edit .env: set DATABASE_URL to your Postgres connection string,
# set MISTRAL_API_KEY when you're ready to test chat

npm install
npx prisma migrate dev   # creates tables
npm run seed              # seeds 2 users + 3 appointments
npm run dev                # starts on http://localhost:4100
```

Seeded accounts (password for both: `password123`):

- `alice@example.com`
- `bob@example.com`

### 3. Frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env.local   # BACKEND_URL should match backend's port
npm install
npm run dev                   # starts on http://localhost:3000
```

Open `http://localhost:3000`, log in with a seeded account (or sign up),
and you're in.

> **Port note**: if port 3000 or 4100 is already taken on your machine, either
> app will pick the next free port. If the frontend doesn't land on 3000,
> update `backend/.env`'s `FRONTEND_ORIGIN` to match (it's used for the CORS
> allow-list), or update `BACKEND_URL` in `frontend/.env.local` if the
> backend moves instead.
>
> **Why a proxy, not a direct cross-origin call**: the frontend's
> `next.config.ts` rewrites `/auth`, `/appointments`, and `/chat` requests
> through its own domain to the backend (`BACKEND_URL`), rather than the
> browser calling the backend directly. This keeps the httpOnly auth cookie
> first-party from the browser's perspective - necessary once frontend and
> backend are deployed on different domains, since browsers increasingly
> block third-party cookies outright (a plain `SameSite=None; Secure` cookie
> is not enough on its own).

## Design decisions & tradeoffs

**Polling instead of WebSockets.** The brief asked for polling, but even on
its own merits it's the right call for this shape of feature: every chat
response in this app is already synchronous (the backend calls Mistral
inline and returns the assistant's reply in the same HTTP response), so
there's no long-lived async job that needs a push channel. Polling
`GET /chat/sessions/:id/messages` every 2.5s is simpler to build, simpler to
reason about, and works everywhere (including behind reverse proxies that
mishandle WebSocket upgrades) — a WebSocket layer would add real
infrastructure (a socket server, reconnect/backoff logic, auth over the
socket handshake) for no user-visible benefit here. It would start to matter
if message generation became a background job or if this needed multi-user
live presence, neither of which is in scope.

**Auto-booking on `isComplete: true`.** The brief specifies the contract
(`{intent, service, date, time, isComplete, assistantReply}`) and says the
route handler decides what to do when `isComplete` is `false` (show the
fallback form). It doesn't say what to do when `isComplete` is `true` — the
reasonable inference is that the whole point of a booking assistant is to
finish the booking once it has everything, so `chat.controller.ts` calls the
same `appointments.service.ts` used by the manual form to create the
appointment immediately, and returns it in the response so the frontend can
toast a confirmation. If the extracted `service` isn't one of the fixed
`SERVICE_OPTIONS`, auto-booking is skipped and nothing is silently created
with bad data.

**Fixed service list instead of a `services` table.** Five hardcoded
options (`backend/src/schemas/appointment.schema.ts`) rather than a proper
services table with its own CRUD. A real product would need admin-managed
services; this prototype doesn't, so the extra table/endpoints/UI weren't
worth building against the 24-hour budget.

**No appointment confirm/cancel flow.** Appointments are created as
`pending`. The `status` enum (`pending/confirmed/cancelled`) exists on the
model and is rendered as a badge, but there's no endpoint to transition it —
that would belong to a staff/admin view, which is out of scope for a
user-facing booking prototype.

**Route protection is cookie-presence-based, not JWT-verified, in the
frontend.** `frontend/src/proxy.ts` (Next.js 16 renamed `middleware.ts` to
`proxy.ts`) only checks whether the `auth_token` cookie exists to decide
whether to redirect — it doesn't verify the JWT signature, because doing
that would mean duplicating `JWT_SECRET` into the frontend. The actual
security boundary is the backend: every API call carries the cookie, the
backend independently verifies it and returns 401 if it's invalid or
expired, and the frontend's `AuthProvider` reacts to that by treating the
user as logged out. The proxy check is a UX nicety (fast redirect, no
flash of protected content) layered on top of that, not the real gate.

**Chat session reuse, not one-thread-per-visit.** The frontend's chat page
looks for the user's most recent `chat_session` and reuses it, only
creating a new one if none exists. Keeps conversation context across page
reloads without needing a "conversation list" UI, which felt like scope
creep for this brief.

**Native `<input type="date">` / `<input type="time">` instead of a custom
calendar widget.** Satisfies "date/time picker" with zero extra
dependencies and no timezone-math edge cases to get wrong under time
pressure. `BookingForm` (`frontend/src/components/appointments/booking-form.tsx`)
is shared by both the manual "Book directly" flow and the AI's fallback
form, pre-filled with whatever the AI already extracted.

**Everything scoped out by the brief was actually left out**: no
WebSockets, no `business_id`/multi-tenancy, no demo video, no rate-limiting
beyond a sensible global + auth-specific limit via `express-rate-limit`
defaults, no custom design system beyond shadcn/ui's defaults.
