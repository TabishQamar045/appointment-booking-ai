import { redirect } from "next/navigation";
import { cookies } from "next/headers";

// Root route just forwards to the right place. Next.js 16 requires
// cookies() to be awaited (async Request APIs).
export default async function Home() {
  const cookieStore = await cookies();
  const hasAuthCookie = cookieStore.has("auth_token");
  redirect(hasAuthCookie ? "/dashboard" : "/login");
}
