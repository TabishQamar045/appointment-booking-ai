// Augments Express's Request with the authenticated user, set by
// middleware/auth.ts after verifying the JWT cookie.
export interface AuthUser {
  id: string;
  email: string;
  role: "customer" | "admin";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
