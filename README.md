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
