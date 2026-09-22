import type { NextConfig } from "next";

// Server-side only (not NEXT_PUBLIC_): the frontend proxies API calls through
// its own domain so the auth cookie is always first-party to the browser,
// regardless of where the backend is actually hosted. Without this, a
// frontend and backend on different domains (e.g. vercel.app / railway.app)
// hit browsers' third-party cookie blocking even with SameSite=None.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4100";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/auth/:path*", destination: `${BACKEND_URL}/auth/:path*` },
      { source: "/appointments", destination: `${BACKEND_URL}/appointments` },
      { source: "/appointments/:path*", destination: `${BACKEND_URL}/appointments/:path*` },
      { source: "/chat/:path*", destination: `${BACKEND_URL}/chat/:path*` },
    ];
  },
};

export default nextConfig;
