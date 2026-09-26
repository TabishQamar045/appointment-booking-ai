import type { NextConfig } from "next";

// Server-side only (not NEXT_PUBLIC_): the frontend proxies API calls through
// its own domain so the auth cookie is always first-party to the browser,
// regardless of where the backend is actually hosted. Without this, a
// frontend and backend on different domains (e.g. vercel.app / railway.app)
// hit browsers' third-party cookie blocking even with SameSite=None.
//
// Everything lives under /api/* (not e.g. bare /services or /admin) because
// those exact paths are also real page routes (the services catalog page,
// the admin dashboard) - a page route and a rewrite can't share one path.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4100";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/auth/:path*", destination: `${BACKEND_URL}/auth/:path*` },
      { source: "/api/appointments", destination: `${BACKEND_URL}/appointments` },
      { source: "/api/appointments/:path*", destination: `${BACKEND_URL}/appointments/:path*` },
      { source: "/api/chat/:path*", destination: `${BACKEND_URL}/chat/:path*` },
      { source: "/api/services", destination: `${BACKEND_URL}/services` },
      { source: "/api/availability", destination: `${BACKEND_URL}/availability` },
      { source: "/api/admin/:path*", destination: `${BACKEND_URL}/admin/:path*` },
      { source: "/api/notifications", destination: `${BACKEND_URL}/notifications` },
      { source: "/api/notifications/:path*", destination: `${BACKEND_URL}/notifications/:path*` },
    ];
  },
};

export default nextConfig;
