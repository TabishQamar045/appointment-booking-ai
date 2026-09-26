-- Guarantees a working admin login exists on any database this migration
-- has run against, independent of whether `prisma db seed` was ever run
-- (seeding is a separate manual step; migrations replay automatically on
-- every `prisma migrate deploy`, including after a DB reset).
--
-- Password hash below is bcrypt(10) of "password123" - same convention as
-- prisma/seed.ts's other seeded accounts. Change this password after first
-- login in any real deployment.
--
-- ON CONFLICT (email) DO NOTHING makes this safe to replay against a
-- database that already has this row (e.g. from seed.ts).
INSERT INTO "users" (id, email, password_hash, name, role, provider, created_at)
VALUES (
  '2f8b6c3a-0000-4000-8000-000000000001',
  'admin@glowstudio.com',
  '$2b$10$ibcUubjvnwuTFN.e8HKVE.Xu3JUcZCFHhTXYGt2v0TihZ86S8Hb7S',
  'Glow Studio Admin',
  'admin',
  'local',
  now()
)
ON CONFLICT (email) DO NOTHING;
